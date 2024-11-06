import React, {useEffect, useState, useRef} from 'react'
import {Settings, ChevronUp, ChevronDown, Copy, Check} from 'lucide-react'
import {Chess} from 'chess.js'
import {Chessboard} from 'react-chessboard'

interface EngineAnalysisProps {
  fen: string
  isAnalysing: boolean
  onPlayMove?: (move: string) => void
}

interface EngineVariant {
  score: number
  moves: string
  depth: number
}

interface EngineSettings {
  depth: number
  multiPv: number
}

const DEFAULT_SETTINGS: EngineSettings = {
  depth: 18,
  multiPv: 3,
}

const loadSettings = (): EngineSettings => {
  try {
    const saved = localStorage.getItem('engineSettings')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
  return DEFAULT_SETTINGS
}

const saveSettings = (settings: EngineSettings) => {
  try {
    localStorage.setItem('engineSettings', JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

const EngineAnalysis = ({fen, isAnalysing, onPlayMove}: EngineAnalysisProps) => {
  const savedSettings = loadSettings()
  const [variants, setVariants] = useState<EngineVariant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [depth, setDepth] = useState(savedSettings.depth)
  const [multiPv, setMultiPv] = useState(savedSettings.multiPv)
  const [showSettings, setShowSettings] = useState(false)
  const [previewFen, setPreviewFen] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{x: number; y: number} | null>(null)
  const [showCopied, setShowCopied] = useState(false)
  const copyTimeoutRef = useRef<number | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const isReadyRef = useRef(false)

  // Speichere Einstellungen wenn sie sich ändern
  useEffect(() => {
    saveSettings({depth, multiPv})
  }, [depth, multiPv])

  // Engine Initialisierung
  useEffect(() => {
    try {
      workerRef.current = new Worker('/stockfish.js')
      workerRef.current.onmessage = handleWorkerMessage
      workerRef.current.onerror = e => console.error('Stockfish Worker Error:', e)

      sendCommand('uci')
      sendCommand(`setoption name MultiPV value ${multiPv}`)
      sendCommand('ucinewgame')
      sendCommand('isready')
    } catch (error) {
      console.error('Error initializing Stockfish worker:', error)
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  // Update MultiPV wenn sich die Einstellung ändert
  useEffect(() => {
    if (workerRef.current && isReadyRef.current) {
      sendCommand(`setoption name MultiPV value ${multiPv}`)
      if (isAnalysing) {
        evaluatePosition()
      }
    }
  }, [multiPv])

  const sendCommand = (cmd: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage(cmd)
    }
  }

  const handleWorkerMessage = (e: MessageEvent) => {
    const message = e.data

    if (message === 'readyok') {
      isReadyRef.current = true
      return
    }

    if (message.startsWith('info')) {
      try {
        if (message.includes('multipv') && message.includes('score cp')) {
          const pvNumber = parseInt(message.match(/multipv (\d+)/)?.[1] || '1')
          const score = parseInt(message.match(/score cp (-?\d+)/)?.[1] || '0') / 100
          const currentDepth = parseInt(message.match(/depth (\d+)/)?.[1] || '0')

          let moves = ''
          const pvIndex = message.indexOf(' pv ')
          if (pvIndex !== -1) {
            moves = message
              .slice(pvIndex + 4)
              .split(/\s+(info|bestmove)/)[0]
              .trim()
          }

          if (moves) {
            setVariants(prev => {
              const newVariants = [...prev]
              newVariants[pvNumber - 1] = {
                score,
                moves,
                depth: currentDepth,
              }
              return newVariants
            })

            if (currentDepth >= depth) {
              setIsLoading(false)
            }
          }
        }
      } catch (error) {
        console.error('Error parsing engine output:', error, message)
      }
    }
  }

  const evaluatePosition = () => {
    if (!workerRef.current || !isReadyRef.current) return

    setVariants([])
    setIsLoading(true)
    sendCommand('position fen ' + fen)
    sendCommand(`go depth ${depth}`)
  }

  const stopAnalysis = () => {
    if (workerRef.current) {
      sendCommand('stop')
    }
  }

  useEffect(() => {
    if (isAnalysing && fen) {
      evaluatePosition()
    } else {
      stopAnalysis()
      setVariants([])
    }
    return () => stopAnalysis()
  }, [fen, isAnalysing, depth])

  const convertMovesToSan = (move: string, chess: Chess): string | null => {
    try {
      const from = move.substring(0, 2)
      const to = move.substring(2, 4)
      const promotion = move.length > 4 ? move.substring(4) : undefined
      const moveObj = chess.move({from, to, promotion})
      return moveObj ? moveObj.san : null
    } catch (error) {
      return null
    }
  }

  const renderMoves = (uciMoves: string): JSX.Element[] => {
    try {
      const chess = new Chess(fen)
      const moves = uciMoves.split(' ')
      const renderedMoves: JSX.Element[] = []

      for (let i = 0; i < moves.length; i++) {
        const move = moves[i]
        const san = convertMovesToSan(move, chess)
        if (san) {
          renderedMoves.push(
            <span
              key={i}
              className='cursor-pointer hover:bg-gray-200 px-1 rounded'
              onClick={() => onPlayMove?.(moves[0])} // Erster Zug der Variante
              onMouseEnter={e => handleMoveHover(uciMoves, i, e)}
              onMouseLeave={handleVariantLeave}>
              {san}
            </span>,
          )
        }
      }
      return renderedMoves
    } catch (error) {
      console.error('Error rendering moves:', error)
      return []
    }
  }

  const handleMoveHover = (moves: string, upToIndex: number, event: React.MouseEvent) => {
    try {
      const chess = new Chess(fen)
      const movesList = moves.split(' ')

      for (let i = 0; i <= upToIndex; i++) {
        const move = movesList[i]
        if (!move) continue

        const from = move.substring(0, 2)
        const to = move.substring(2, 4)
        const promotion = move.length > 4 ? move.substring(4) : undefined

        try {
          chess.move({from, to, promotion})
        } catch (e) {
          break
        }
      }

      setPreviewFen(chess.fen())

      const rect = event.currentTarget.getBoundingClientRect()
      setPreviewPosition({
        x: rect.right + 10,
        y: Math.min(rect.top, window.innerHeight - 220),
      })
    } catch (error) {
      console.error('Error showing preview:', error)
    }
  }

  const handleVariantLeave = () => {
    setPreviewFen(null)
    setPreviewPosition(null)
  }

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen)
      setShowCopied(true)

      // Reset copy message after 2 seconds
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

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className='w-full font-mono text-sm p-2'>
      <div className='flex items-center justify-between mb-2 text-gray-600'>
      <div className="flex items-center gap-2">
          <span>Tiefe: {depth}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyFen}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors relative"
            title="FEN kopieren"
          >
            {showCopied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">FEN</span>
            {showCopied && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap">
                FEN kopiert!
              </div>
            )}
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>

      {showSettings && (
        <div className='mb-2 p-2 bg-gray-50 rounded text-xs'>
          <div className='flex items-center justify-between mb-1'>
            <span>Analysetiefe:</span>
            <div className='flex items-center gap-1'>
              <button onClick={() => setDepth(d => Math.max(1, d - 1))} className='hover:bg-gray-200 rounded p-1'>
                <ChevronDown className='w-3 h-3' />
              </button>
              <span>{depth}</span>
              <button onClick={() => setDepth(d => Math.min(30, d + 1))} className='hover:bg-gray-200 rounded p-1'>
                <ChevronUp className='w-3 h-3' />
              </button>
            </div>
          </div>
          <div className='flex items-center justify-between'>
            <span>Varianten:</span>
            <div className='flex items-center gap-1'>
              <button onClick={() => setMultiPv(m => Math.max(1, m - 1))} className='hover:bg-gray-200 rounded p-1'>
                <ChevronDown className='w-3 h-3' />
              </button>
              <span>{multiPv}</span>
              <button onClick={() => setMultiPv(m => Math.min(5, m + 1))} className='hover:bg-gray-200 rounded p-1'>
                <ChevronUp className='w-3 h-3' />
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className='text-gray-600'>Analysiere...</div>
      ) : variants.length === 0 && isAnalysing ? (
        <div className='text-gray-600'>Warte auf Engine...</div>
      ) : (
        <div className='space-y-0.5'>
          {variants.map((variant, index) => (
            <div key={index} className='py-0.5'>
              <span className={`font-bold ${variant.score > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {variant.score > 0 ? '+' : ''}
                {variant.score.toFixed(2)}
              </span>
              <span className='ml-2 text-gray-700'>{renderMoves(variant.moves)}</span>
            </div>
          ))}
        </div>
      )}

      {previewFen && previewPosition && (
        <div
          className='fixed z-50 shadow-lg rounded-lg bg-white p-2'
          style={{
            left: previewPosition.x,
            top: previewPosition.y,
            width: '200px',
          }}>
          <Chessboard position={previewFen} boardWidth={200} animationDuration={0} />
        </div>
      )}
    </div>
  )
}

export default EngineAnalysis
