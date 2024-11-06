import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react'
import {Chessboard} from 'react-chessboard'
import {Chess} from 'chess.js'
import {exportPGNToFile, importPGNFromFile} from '../pgnUtils'
import EngineAnalysis from './EngineAnalysis'
import {PlayCircle, StopCircle, Copy, Check, Download, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Cog} from 'lucide-react'
import {loadChessSettings, saveChessSettings} from '../utils/settings'
import {ChessSettings} from '../types/chess'
import SettingsDialog from './SettingsDialog'

interface ChessboardComponentProps {
  initialPgn?: string
  onPgnChange?: (pgn: string) => void
}

const DEFAULT_SETTINGS: ChessSettings = {
  animationSpeed: 250,
  animationEnabled: true,
  moveSound: true,
}

const loadSettings = (): ChessSettings => {
  try {
    const saved = localStorage.getItem('chessSettings')
    if (saved) {
      return {...DEFAULT_SETTINGS, ...JSON.parse(saved)}
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
  return DEFAULT_SETTINGS
}

const saveSettings = (settings: ChessSettings) => {
  try {
    localStorage.setItem('chessSettings', JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

const ChessboardComponent: React.FC<ChessboardComponentProps> = React.memo(({initialPgn = '', onPgnChange}) => {
  const game = useRef(new Chess())
  const [fen, setFen] = useState(game.current.fen())
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [fenHistory, setFenHistory] = useState<string[]>([game.current.fen()])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [showCopiedPgn, setShowCopiedPgn] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1)
  const [animating, setAnimating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ChessSettings>(() => loadChessSettings())

  const copyTimeoutRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const importMenuRef = useRef<HTMLDivElement>(null)

  // Audio für Zuggeräusche
  const moveAudio = useRef(new Audio('/sounds/move.mp3'))

  const handleSettingsChange = useCallback((newSettings: ChessSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const playMoveSound = useCallback(() => {
    if (settings.moveSound && moveAudio.current) {
      moveAudio.current.currentTime = 0
      moveAudio.current.play().catch(() => {})
    }
  }, [settings.moveSound])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setShowImportMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (initialPgn) {
      try {
        game.current.loadPgn(initialPgn)
        setFen(game.current.fen())
        const moves = game.current.history({verbose: true})
        const updatedMoveHistory = moves.map(move => move.san)
        const updatedFenHistory = [game.current.fen()]

        game.current.reset()
        moves.forEach(move => {
          game.current.move(move.san)
          updatedFenHistory.push(game.current.fen())
        })

        setMoveHistory(updatedMoveHistory)
        setFenHistory(updatedFenHistory)
      } catch (error) {
        console.error('Fehler beim Laden der PGN:', error)
      }
    }
  }, [initialPgn])

  const handleMove = useCallback(
    (from: string, to: string) => {
      const move = game.current.move({from, to})
      if (move) {
        setFen(game.current.fen())
        setMoveHistory(prev => [...prev, move.san])
        setFenHistory(prev => [...prev, game.current.fen()])
        setCurrentMoveIndex(prev => prev + 1)

        if (settings.moveSound) {
          playMoveSound()
        }

        if (onPgnChange) {
          onPgnChange(game.current.pgn())
        }
        return true
      }
      return false
    },
    [onPgnChange, settings.moveSound, playMoveSound],
  )

  const handleImportPGN = (event: React.ChangeEvent<HTMLInputElement>) => {
    importPGNFromFile(event, game.current, setFen, setMoveHistory, setFenHistory)
    if (onPgnChange) {
      onPgnChange(game.current.pgn())
    }
  }

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen)
      setShowCopied(true)

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setShowCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy FEN:', err)
    }
  }

  const copyPgnToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(game.current.pgn())
      setShowCopiedPgn(true)
      setTimeout(() => setShowCopiedPgn(false), 2000)
    } catch (err) {
      console.error('Failed to copy PGN:', err)
    }
  }

  const importPgnFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      try {
        game.current.loadPgn(clipboardText)
        setFen(game.current.fen())
        const moves = game.current.history({verbose: true})
        const updatedMoveHistory = moves.map(move => move.san)
        const updatedFenHistory = [game.current.fen()]

        game.current.reset()
        moves.forEach(move => {
          game.current.move(move.san)
          updatedFenHistory.push(game.current.fen())
        })

        setMoveHistory(updatedMoveHistory)
        setFenHistory(updatedFenHistory)
        if (onPgnChange) {
          onPgnChange(game.current.pgn())
        }
      } catch (error) {
        console.error('Invalid PGN format:', error)
        alert('Ungültiges PGN-Format in der Zwischenablage')
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    }
  }

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setCurrentMoveIndex(moveHistory.length - 1)
  }, [moveHistory.length])

  // Aktualisieren Sie die handleClickOnMove Funktion:
  const handleClickOnMove = useCallback(
    (index: number) => {
      if (animating) return

      setAnimating(true)
      if (index === -1) {
        game.current.load(fenHistory[0])
        setFen(fenHistory[0])
      } else {
        const selectedFen = fenHistory[index + 1]
        if (selectedFen) {
          game.current.load(selectedFen)
          setFen(selectedFen)
        }
      }
      setCurrentMoveIndex(index)

      setTimeout(() => {
        setAnimating(false)
      }, 300)
    },
    [animating, fenHistory],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (animating) return

      if (e.key === 'ArrowLeft') {
        if (currentMoveIndex > -1) {
          handleClickOnMove(currentMoveIndex - 1)
        }
      } else if (e.key === 'ArrowRight') {
        if (currentMoveIndex < moveHistory.length - 1) {
          handleClickOnMove(currentMoveIndex + 1)
        }
      } else if (e.key === 'Home') {
        handleClickOnMove(-1)
      } else if (e.key === 'End') {
        handleClickOnMove(moveHistory.length - 1)
      }
    },
    [currentMoveIndex, moveHistory.length, animating, handleClickOnMove],
  )

  // Optimierte Render-Funktion für das Schachbrett
  const boardOptions = useMemo(
    () => ({
      position: fen,
      onPieceDrop: (sourceSquare: string, targetSquare: string) => handleMove(sourceSquare, targetSquare),
      boardWidth: Math.min(500, window.innerWidth / 2 - 16),
      animationDuration: settings.animationEnabled ? settings.animationSpeed : 0,
      transitionDuration: 250,
      customBoardStyle: {
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        transform: 'translate3d(0, 0, 0)', // Hardware-Beschleunigung aktivieren
      },
      customDarkSquareStyle: {
        backgroundColor: '#b58863',
      },
      customLightSquareStyle: {
        backgroundColor: '#f0d9b5',
      },
    }),
    [fen],
  )

  // Korrigierter Event Listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <div className='flex flex-col justify-center items-center h-screen p-4'>
      <div className='flex w-full'>
        <div className='w-1/2 flex justify-center'>
          <div className='flex flex-col items-center'>
            <div
              style={{
                willChange: 'transform', // Optimierung für Animationen
                perspective: '1000px', // 3D-Transformationen optimieren
              }}>
              <Chessboard {...boardOptions} />
              <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSettingsChange={handleSettingsChange} />
            </div>

            {/* Navigation Buttons */}
            <div className='mt-2 flex justify-center space-x-2'>
              <button onClick={() => !animating && handleClickOnMove(-1)} className='p-2 rounded hover:bg-gray-100 disabled:opacity-50' disabled={animating || currentMoveIndex === -1} title='Zum Anfang (Home)'>
                <ChevronsLeft className='w-4 h-4' />
              </button>
              <button
                onClick={() => !animating && handleClickOnMove(Math.max(-1, currentMoveIndex - 1))}
                className='p-2 rounded hover:bg-gray-100 disabled:opacity-50'
                disabled={animating || currentMoveIndex === -1}
                title='Ein Zug zurück (←)'>
                <ChevronLeft className='w-4 h-4' />
              </button>
              <button
                onClick={() => !animating && handleClickOnMove(Math.min(moveHistory.length - 1, currentMoveIndex + 1))}
                className='p-2 rounded hover:bg-gray-100 disabled:opacity-50'
                disabled={animating || currentMoveIndex === moveHistory.length - 1}
                title='Ein Zug vor (→)'>
                <ChevronRight className='w-4 h-4' />
              </button>
              <button
                onClick={() => !animating && handleClickOnMove(moveHistory.length - 1)}
                className='p-2 rounded hover:bg-gray-100 disabled:opacity-50'
                disabled={animating || currentMoveIndex === moveHistory.length - 1}
                title='Zum Ende (End)'>
                <ChevronsRight className='w-4 h-4' />
              </button>
            </div>

            <div className='mt-4 flex space-x-4'>
              {/* Analyse Button */}
              <button
                onClick={() => setIsAnalyzing(!isAnalyzing)}
                className={`flex items-center justify-center w-10 h-10 rounded ${isAnalyzing ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                title={isAnalyzing ? 'Analyse stoppen' : 'Analyse starten'}>
                {isAnalyzing ? <StopCircle className='w-6 h-6' /> : <PlayCircle className='w-6 h-6' />}
              </button>
              {/* FEN Button */}
              <button onClick={copyFen} className='flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors' title='FEN kopieren'>
                {showCopied ? <Check className='w-6 h-6' /> : <Copy className='w-6 h-6' />}
              </button>
              {/* Export Dropdown */}
              <div className='relative' ref={exportMenuRef}>
                <button onClick={() => setShowExportMenu(!showExportMenu)} className='flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded' title='PGN exportieren'>
                  <Download className='w-6 h-6' />
                </button>
                {showExportMenu && (
                  <div className='absolute z-10 bottom-full mb-2 py-2 w-64 bg-white rounded-lg shadow-xl border'>
                    <button
                      onClick={() => {
                        exportPGNToFile(game.current)
                        setShowExportMenu(false)
                      }}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center'>
                      <Download className='w-4 h-4 mr-2' />
                      PGN in Datei exportieren
                    </button>
                    <button
                      onClick={() => {
                        copyPgnToClipboard()
                        setShowExportMenu(false)
                      }}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center'>
                      <Copy className='w-4 h-4 mr-2' />
                      PGN in Zwischenablage kopieren
                    </button>
                  </div>
                )}
              </div>
              {/* Import Dropdown */}
              <div className='relative' ref={importMenuRef}>
                <button onClick={() => setShowImportMenu(!showImportMenu)} className='flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded' title='PGN importieren'>
                  <Upload className='w-6 h-6' />
                </button>
                {showImportMenu && (
                  <div className='absolute z-10 bottom-full mb-2 py-2 w-64 bg-white rounded-lg shadow-xl border'>
                    <button
                      onClick={() => {
                        fileInputRef.current?.click()
                        setShowImportMenu(false)
                      }}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center'>
                      <Upload className='w-4 h-4 mr-2' />
                      PGN aus Datei importieren
                    </button>
                    <button
                      onClick={() => {
                        importPgnFromClipboard()
                        setShowImportMenu(false)
                      }}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center'>
                      <Copy className='w-4 h-4 mr-2' />
                      PGN aus Zwischenablage importieren
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type='file' accept='.pgn' onChange={handleImportPGN} className='hidden' />
              </div>{' '}
              {/* Settings */}
              <button onClick={() => setShowSettings(true)} className='flex items-center justify-center w-10 h-10 bg-gray-500 hover:bg-gray-600 text-white rounded' title='Einstellungen'>
                <Cog className='w-6 h-6' />
              </button>
            </div>
            <div className='mt-4 w-full'>
              <EngineAnalysis fen={fen} isAnalysing={isAnalyzing} onPlayMove={handleMove} />
            </div>
          </div>
        </div>
        <div className='w-1/2 p-4 bg-gray-100 rounded shadow overflow-y-auto max-h-[80vh]'>
          <h2 className='text-xl font-semibold mb-2'>Zug-Notation</h2>
          <div className='whitespace-pre-wrap'>
            {moveHistory.reduce((acc, move, index) => {
              const moveNumber = Math.floor(index / 2) + 1
              const isWhiteMove = index % 2 === 0

              return (
                <>
                  {acc}
                  {isWhiteMove ? <span className='mr-1'>{`${moveNumber}.`}</span> : null}
                  <span onClick={() => handleClickOnMove(index)} className={`cursor-pointer rounded px-1 hover:bg-gray-100 ${currentMoveIndex === index ? 'bg-gray-200' : ''}`}>
                    {move}
                  </span>
                  <span className='mr-1'> </span>
                </>
              )
            }, <></>)}
          </div>
        </div>{' '}
      </div>
    </div>
  )
})

export default ChessboardComponent
