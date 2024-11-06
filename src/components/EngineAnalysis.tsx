import React, { useEffect, useState, useRef } from 'react';
import { Settings } from 'lucide-react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface EngineAnalysisProps {
  fen: string;
  isAnalysing: boolean;
  onPlayMove?: (move: string) => void;
}

interface EngineVariant {
  score: number;
  moves: string;
  depth: number;
}

interface MoveWithSan {
  uci: string;
  san: string;
}

const EngineAnalysis = ({ fen, isAnalysing, onPlayMove }: EngineAnalysisProps) => {
  const [variants, setVariants] = useState<EngineVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [depth, setDepth] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const [previewFen, setPreviewFen] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{x: number, y: number} | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const isReadyRef = useRef(false);
  // Engine Initialisierung
  useEffect(() => {
    try {
      workerRef.current = new Worker('/stockfish.js');
      workerRef.current.onmessage = handleWorkerMessage;
      workerRef.current.onerror = (e) => console.error('Stockfish Worker Error:', e);
      
      sendCommand('uci');
      sendCommand('setoption name MultiPV value 3');
      sendCommand('ucinewgame');
      sendCommand('isready');
    } catch (error) {
      console.error('Error initializing Stockfish worker:', error);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const sendCommand = (cmd: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage(cmd);
    }
  };

  const handleWorkerMessage = (e: MessageEvent) => {
    const message = e.data;
    
    if (message === 'readyok') {
      isReadyRef.current = true;
      return;
    }

    if (message.startsWith('info')) {
      try {
        if (message.includes('multipv') && message.includes('score cp')) {
          const pvNumber = parseInt(message.match(/multipv (\d+)/)?.[1] || '1');
          const score = parseInt(message.match(/score cp (-?\d+)/)?.[1] || '0') / 100;
          const currentDepth = parseInt(message.match(/depth (\d+)/)?.[1] || '0');
          
          // Verbesserte PV-Extraktion
          let moves = '';
          const pvIndex = message.indexOf(' pv ');
          if (pvIndex !== -1) {
            moves = message.slice(pvIndex + 4).split(/\s+(info|bestmove)/)[0].trim();
          }

          if (moves) {
            setVariants(prev => {
              const newVariants = [...prev];
              newVariants[pvNumber - 1] = {
                score,
                moves,
                depth: currentDepth
              };
              return newVariants;
            });

            if (currentDepth >= depth) {
              setIsLoading(false);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing engine output:', error, message);
      }
    }
  };

  const evaluatePosition = () => {
    if (!workerRef.current || !isReadyRef.current) return;
    
    setVariants([]);
    setIsLoading(true);
    sendCommand('position fen ' + fen);
    sendCommand(`go depth ${depth}`);
  };

  const stopAnalysis = () => {
    if (workerRef.current) {
      sendCommand('stop');
    }
  };

  useEffect(() => {
    if (isAnalysing && fen) {
      evaluatePosition();
    } else {
      stopAnalysis();
      setVariants([]);
    }
    return () => stopAnalysis();
  }, [fen, isAnalysing, depth]);

  const renderMoves = (uciMoves: string) => {
    try {
      const chess = new Chess(fen);
      const moves = uciMoves.split(' ');
      let result = '';
      
      for (const move of moves) {
        if (!move) continue;
        
        const from = move.substring(0, 2);
        const to = move.substring(2, 4);
        const promotion = move.length > 4 ? move.substring(4) : undefined;
        
        try {
          const moveObj = chess.move({ from, to, promotion });
          if (moveObj) {
            result += `${moveObj.san} `;
          }
        } catch (e) {
          console.error('Error making move:', move, e);
          break;
        }
      }
      return result.trim();
    } catch (error) {
      console.error('Error rendering moves:', error);
      return uciMoves;
    }
  };

  const handleVariantHover = (moves: string, event: React.MouseEvent) => {
    try {
      const chess = new Chess(fen);
      const movesList = moves.split(' ');
      
      // Führe alle Züge bis zum Hover-Punkt aus
      for (const move of movesList) {
        if (!move) continue;
        const from = move.substring(0, 2);
        const to = move.substring(2, 4);
        const promotion = move.length > 4 ? move.substring(4) : undefined;
        
        try {
          chess.move({ from, to, promotion });
        } catch (e) {
          break;
        }
      }
      
      // Setze Position und FEN für Vorschau
      setPreviewFen(chess.fen());
      
      // Berechne Position für Vorschau-Brett
      const rect = event.currentTarget.getBoundingClientRect();
      setPreviewPosition({
        x: rect.right + 10,
        y: rect.top
      });
    } catch (error) {
      console.error('Error showing preview:', error);
    }
  };

  const convertMovesToSanWithPositions = (uciMoves: string): MoveWithSan[] => {
    try {
      const chess = new Chess(fen);
      const moves = uciMoves.split(' ');
      const result: MoveWithSan[] = [];
      
      for (const move of moves) {
        if (!move) continue;
        
        const from = move.substring(0, 2);
        const to = move.substring(2, 4);
        const promotion = move.length > 4 ? move.substring(4) : undefined;
        
        try {
          const moveObj = chess.move({ from, to, promotion });
          if (moveObj) {
            result.push({
              uci: move,
              san: moveObj.san
            });
          }
        } catch (e) {
          break;
        }
      }
      return result;
    } catch (error) {
      console.error('Error converting moves:', error);
      return [];
    }
  };

  const handleMoveHover = (moves: string, upToIndex: number, event: React.MouseEvent) => {
    try {
      const chess = new Chess(fen);
      const movesList = moves.split(' ');
      
      // Führe nur Züge bis zum Hover-Index aus
      for (let i = 0; i <= upToIndex; i++) {
        const move = movesList[i];
        if (!move) continue;
        
        const from = move.substring(0, 2);
        const to = move.substring(2, 4);
        const promotion = move.length > 4 ? move.substring(4) : undefined;
        
        try {
          chess.move({ from, to, promotion });
        } catch (e) {
          break;
        }
      }
      
      setPreviewFen(chess.fen());
      
      const rect = event.currentTarget.getBoundingClientRect();
      setPreviewPosition({
        x: rect.right + 10,
        y: Math.min(rect.top, window.innerHeight - 220) // Verhindert, dass Brett unten aus dem Fenster läuft
      });
    } catch (error) {
      console.error('Error showing preview:', error);
    }
  };

  const handleVariantLeave = () => {
    setPreviewFen(null);
    setPreviewPosition(null);
  };

  const renderVariant = (variant: EngineVariant, index: number) => {
    const moves = convertMovesToSanWithPositions(variant.moves);
    
    return (
      <div key={index} className="py-0.5">
        <span className={`font-bold ${
          variant.score > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {variant.score > 0 ? '+' : ''}{variant.score.toFixed(2)}
        </span>
        <span className="ml-2 text-gray-700">
          {moves.map((move, moveIndex) => (
            <span
              key={moveIndex}
              className="cursor-pointer hover:bg-gray-200 px-1 rounded"
              onClick={() => onPlayMove?.(moves[0].uci)}
              onMouseEnter={(e) => handleMoveHover(variant.moves, moveIndex, e)}
              onMouseLeave={handleVariantLeave}
            >
              {move.san}
            </span>
          ))}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full font-mono text-sm p-2">
      <div className="flex items-center justify-between mb-2 text-gray-600">
        <span>Tiefe: {depth}</span>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-600">Analysiere...</div>
      ) : variants.length === 0 && isAnalysing ? (
        <div className="text-gray-600">Warte auf Engine...</div>
      ) : (
        <div className="space-y-0.5">
          {variants.map((variant, index) => renderVariant(variant, index))}
        </div>
      )}

      {previewFen && previewPosition && (
        <div 
          className="fixed z-50 shadow-lg rounded-lg bg-white p-2"
          style={{
            left: previewPosition.x,
            top: previewPosition.y,
            width: '200px'
          }}
        >
          <Chessboard 
            position={previewFen}
            boardWidth={200}
            animationDuration={0}
          />
        </div>
      )}
    </div>
  );
};

export default EngineAnalysis;