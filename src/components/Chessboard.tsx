import React, { useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

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
      setFenHistory((prev) => [...prev, game.current.fen()]); // Speichere die neue FEN
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
    <div className="flex justify-center items-start h-screen p-4">
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
        <div>
          {moveHistory.map((move, index) => (
            <p
              key={index}
              onClick={() => handleClickOnMove(index)} // Exakter FEN-Index wird verwendet
              className="cursor-pointer hover:bg-gray-300 p-1 rounded"
            >
              {Math.floor(index / 2) + 1}.
              {index % 2 === 0 ? " " + move : " ... " + move}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChessboardComponent;
