import React, { useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { exportPGNToFile, importPGNFromFile } from '../pgnUtils';

const ChessboardComponent: React.FC = () => {
  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [fenHistory, setFenHistory] = useState<string[]>([game.current.fen()]);

  const handleMove = (from: string, to: string) => {
    const move = game.current.move({ from, to });
    if (move) {
      setFen(game.current.fen());
      setMoveHistory((prev) => [...prev, move.san]);
      setFenHistory((prev) => [...prev, game.current.fen()]);
      return true;
    }
    return false;
  };

  const handleClickOnMove = (index: number) => {
    const selectedFen = fenHistory[index + 1]; // +1, um die exakte Stellung des Zugs auszuwählen
    if (selectedFen) {
      game.current.load(selectedFen); // Lade die FEN der ausgewählten Stellung
      setFen(selectedFen); // Setze die FEN auf die ausgewählte Stellung
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen p-4">
      <div className="flex w-full">
        <div className="w-1/2 flex justify-center">
          <Chessboard
            position={fen}
            onPieceDrop={(sourceSquare, targetSquare) =>
              handleMove(sourceSquare, targetSquare)
            }
            boardWidth={Math.min(500, window.innerWidth / 2 - 16)}
          />
        </div>
        <div className="w-1/2 p-4 bg-gray-100 rounded shadow overflow-y-auto max-h-[80vh]">
          <h2 className="text-xl font-semibold mb-2">Zug-Notation</h2>
          <div className="grid gap-2" style={{ gridTemplateColumns: '20px 1fr 1fr' }}> 
            {moveHistory.map((move, index) => {
              const moveNumber = Math.floor(index / 2) + 1;
              const isWhiteMove = index % 2 === 0;
              return (
                <React.Fragment key={index}>
                  {isWhiteMove && (
                    <p className="col-start-1 text-right font-semibold pr-2">{moveNumber}.</p>
                  )}
                  <p
                    onClick={() => handleClickOnMove(index)}
                    className={`cursor-pointer p-1 rounded ${
                      isWhiteMove ? "col-start-2 bg-blue-100" : "col-start-3 bg-red-100"
                    } hover:bg-blue-200`}
                  >
                    {move}
                  </p>
                  {!isWhiteMove && <span></span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-4 flex space-x-4">
        <button
          onClick={() => exportPGNToFile(game.current)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Exportiere PGN als Datei
        </button>
        <input
          type="file"
          accept=".pgn"
          onChange={(event) =>
            importPGNFromFile(event, game.current, setFen, setMoveHistory, setFenHistory)
          }
          className="bg-green-500 text-white px-4 py-2 rounded cursor-pointer"
        />
      </div>
    </div>
  );
};

export default ChessboardComponent;
