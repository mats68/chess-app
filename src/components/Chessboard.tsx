// src/components/Chessboard.tsx
import React, {useState, useRef, useEffect} from 'react'
import {Chessboard} from 'react-chessboard'
import {Chess} from 'chess.js'
import {exportPGNToFile, importPGNFromFile} from '../pgnUtils'
import EngineAnalysis from './EngineAnalysis'
import {PlayIcon, PauseIcon} from 'lucide-react'

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

  const handleClickOnMove = (index: number) => {
    const selectedFen = fenHistory[index + 1]
    if (selectedFen) {
      game.current.load(selectedFen)
      setFen(selectedFen)
    }
  }

  const handleImportPGN = (event: React.ChangeEvent<HTMLInputElement>) => {
    importPGNFromFile(event, game.current, setFen, setMoveHistory, setFenHistory)
    if (onPgnChange) {
      onPgnChange(game.current.pgn())
    }
  }

  const toggleAnalysis = () => {
    setIsAnalyzing(!isAnalyzing)
  }

  return (
    <div className='flex flex-col justify-center items-center h-screen p-4'>
      <div className='flex w-full'>
        <div className='w-1/2 flex justify-center'>
          <div className='flex flex-col items-center'>
            <Chessboard position={fen} onPieceDrop={(sourceSquare, targetSquare) => handleMove(sourceSquare, targetSquare)} boardWidth={Math.min(500, window.innerWidth / 2 - 16)} />
            <div className='mt-4'>
              <button onClick={toggleAnalysis} className={`flex items-center px-4 py-2 rounded ${isAnalyzing ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}>
                {isAnalyzing ? (
                  <>
                    <PauseIcon className='w-4 h-4 mr-2' />
                    Analyse stoppen
                  </>
                ) : (
                  <>
                    <PlayIcon className='w-4 h-4 mr-2' />
                    Analyse starten
                  </>
                )}
              </button>
            </div>
            <div className='mt-4 w-full'>
              <EngineAnalysis
                fen={fen}
                isAnalysing={isAnalyzing}
                onPlayMove={move => {
                  const [from, to] = move.match(/.{2}/g) || []
                  if (from && to) {
                    handleMove(from, to)
                  }
                }}
              />
            </div>{' '}
          </div>
        </div>
        <div className='w-1/2 p-4 bg-gray-100 rounded shadow overflow-y-auto max-h-[80vh]'>
          <h2 className='text-xl font-semibold mb-2'>Zug-Notation</h2>
          <div className='grid gap-2' style={{gridTemplateColumns: '20px 1fr 1fr'}}>
            {moveHistory.map((move, index) => {
              const moveNumber = Math.floor(index / 2) + 1
              const isWhiteMove = index % 2 === 0
              return (
                <React.Fragment key={index}>
                  {isWhiteMove && <p className='col-start-1 text-right font-semibold pr-2'>{moveNumber}.</p>}
                  <p onClick={() => handleClickOnMove(index)} className={`cursor-pointer p-1 rounded ${isWhiteMove ? 'col-start-2 bg-blue-100' : 'col-start-3 bg-red-100'} hover:bg-blue-200`}>
                    {move}
                  </p>
                  {!isWhiteMove && <span></span>}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>
      <div className='mt-4 flex space-x-4'>
        <button onClick={() => exportPGNToFile(game.current)} className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
          Exportiere PGN
        </button>
        <input type='file' accept='.pgn' onChange={handleImportPGN} className='bg-green-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-green-600' />
      </div>
    </div>
  )
}

export default ChessboardComponent
