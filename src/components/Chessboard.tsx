import React, {useState, useRef, useEffect} from 'react'
import {Chessboard} from 'react-chessboard'
import {Chess} from 'chess.js'
import {exportPGNToFile, importPGNFromFile} from '../pgnUtils'
import EngineAnalysis from './EngineAnalysis'
import {PlayCircle, StopCircle, Copy, Check, Download, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight} from 'lucide-react'

interface ChessboardComponentProps {
  initialPgn?: string
  onPgnChange?: (pgn: string) => void
}

const ChessboardComponent: React.FC<ChessboardComponentProps> = ({initialPgn = '', onPgnChange}) => {
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

  const copyTimeoutRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const importMenuRef = useRef<HTMLDivElement>(null)

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

  const handleMove = (from: string, to: string) => {
    const move = game.current.move({from, to})
    if (move) {
      setFen(game.current.fen())
      setMoveHistory(prev => [...prev, move.san])
      setFenHistory(prev => [...prev, game.current.fen()])

      if (onPgnChange) {
        onPgnChange(game.current.pgn())
      }
      return true
    }
    return false
  }

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

  const handleKeyDown = (e: KeyboardEvent) => {
    // Links: Einen Zug zurück
    if (e.key === 'ArrowLeft') {
      if (currentMoveIndex > -1) {
        handleClickOnMove(currentMoveIndex - 1)
      }
    }
    // Rechts: Einen Zug vor
    else if (e.key === 'ArrowRight') {
      if (currentMoveIndex < moveHistory.length - 1) {
        handleClickOnMove(currentMoveIndex + 1)
      }
    }
    // Start: Zurück zum Anfang
    else if (e.key === 'Home') {
      handleClickOnMove(-1) // Startposition
    }
    // Ende: Zum letzten Zug
    else if (e.key === 'End') {
      handleClickOnMove(moveHistory.length - 1)
    }
  }

  // Effect für Event Listener
  useEffect(() => {
    // Füge Event Listener hinzu wenn Komponente mounted
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup wenn Komponente unmounted
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentMoveIndex, moveHistory.length]) // Dependencies für den Effect

  // Aktualisieren Sie die handleClickOnMove Funktion:
  const handleClickOnMove = (index: number) => {
    if (index === -1) {
      // Startposition
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
  }

  const convertToSymbol = (move: string): string => {
    return (
      move
        // Figuren
        .replace(/K/g, '♔')
        .replace(/Q/g, '♕')
        .replace(/R/g, '♖')
        .replace(/B/g, '♗')
        .replace(/N/g, '♘')
      // Optional: Schlagzeichen verschönern
      // .replace(/x/g, '×')
      // Optional: Schach und Matt
      // .replace(/\+/g, '†')
      // .replace(/#/g, '‡')
    )
  }

  return (
    <div className='container mx-auto p-4'>
      {/* Haupt-Container mit Flex */}
      <div className='flex flex-col lg:flex-row gap-4'>
        {/* Linke Seite mit Brett und Engine - feste Breite */}
        <div className='flex-none w-[450px]'>
          <Chessboard
            position={fen}
            onPieceDrop={(sourceSquare, targetSquare) => handleMove(sourceSquare, targetSquare)}
            boardWidth={450}
            animationDuration={200}
            customDarkSquareStyle={{backgroundColor: '#b58863'}}
            customLightSquareStyle={{backgroundColor: '#f0d9b5'}}
          />
          <div className='mt-2 flex justify-center space-x-2'>
            <button onClick={() => handleClickOnMove(-1)} className='p-2 rounded hover:bg-gray-100' title='Zum Anfang (Home)'>
              <ChevronsLeft className='w-4 h-4' />
            </button>
            <button onClick={() => handleClickOnMove(Math.max(-1, currentMoveIndex - 1))} className='p-2 rounded hover:bg-gray-100' title='Ein Zug zurück (←)'>
              <ChevronLeft className='w-4 h-4' />
            </button>
            <button onClick={() => handleClickOnMove(Math.min(moveHistory.length - 1, currentMoveIndex + 1))} className='p-2 rounded hover:bg-gray-100' title='Ein Zug vor (→)'>
              <ChevronRight className='w-4 h-4' />
            </button>
            <button onClick={() => handleClickOnMove(moveHistory.length - 1)} className='p-2 rounded hover:bg-gray-100' title='Zum Ende (End)'>
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
          </div>
          <div className='mt-4 w-full'>
            <EngineAnalysis fen={fen} isAnalysing={isAnalyzing} onPlayMove={handleMove} />
          </div>
        </div>
        <div className='flex-1 rounded shadow p-4 min-h-[300px] overflow-auto'>
          <div className='whitespace-normal break-words flex flex-wrap'>
            {Array.from({length: Math.ceil(moveHistory.length / 2)}).map((_, idx) => {
              const moveNumber = idx + 1
              const whiteMove = moveHistory[idx * 2]
              const blackMove = moveHistory[idx * 2 + 1]

              return (
                // Container für ein Zugpaar - nicht brechend
                <div key={moveNumber} className='whitespace-nowrap mr-2 mb-1'>
                  {/* Zugnummer und weißer Zug */}
                  <span>{`${moveNumber}.`}</span>
                  <span onClick={() => handleClickOnMove(idx * 2)} className={`cursor-pointer rounded px-0.5 hover:bg-gray-100 inline-block ${currentMoveIndex === idx * 2 ? 'bg-gray-300' : ''}`}>
                    {convertToSymbol(whiteMove)}
                  </span>
                  {/* Schwarzer Zug, falls vorhanden */}
                  {blackMove && (
                    <>
                      {/* <span className='mr-1'> </span> */}
                      <span onClick={() => handleClickOnMove(idx * 2 + 1)} className={`cursor-pointer rounded px-0.5 hover:bg-gray-100 inline-block ${currentMoveIndex === idx * 2 + 1 ? 'bg-gray-300' : ''}`}>
                        {convertToSymbol(blackMove)}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChessboardComponent
