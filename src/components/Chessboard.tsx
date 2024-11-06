import React, { useState, useRef, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { exportPGNToFile, importPGNFromFile } from '../pgnUtils';
import EngineAnalysis from './EngineAnalysis';
import { 
  PlayCircle, 
  StopCircle, 
  Copy, 
  Check,
  Download,
  Upload,
} from 'lucide-react';

interface ChessboardComponentProps {
  initialPgn?: string;
  onPgnChange?: (pgn: string) => void;
}

const ChessboardComponent: React.FC<ChessboardComponentProps> = ({ 
  initialPgn = '', 
  onPgnChange 
}) => {
  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [fenHistory, setFenHistory] = useState<string[]>([game.current.fen()]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showCopiedPgn, setShowCopiedPgn] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  
  const copyTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setShowImportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialPgn) {
      try {
        game.current.loadPgn(initialPgn);
        setFen(game.current.fen());
        const moves = game.current.history({ verbose: true });
        const updatedMoveHistory = moves.map((move) => move.san);
        const updatedFenHistory = [game.current.fen()];

        game.current.reset();
        moves.forEach((move) => {
          game.current.move(move.san);
          updatedFenHistory.push(game.current.fen());
        });

        setMoveHistory(updatedMoveHistory);
        setFenHistory(updatedFenHistory);
      } catch (error) {
        console.error('Fehler beim Laden der PGN:', error);
      }
    }
  }, [initialPgn]);

  const handleMove = (from: string, to: string) => {
    const move = game.current.move({ from, to });
    if (move) {
      setFen(game.current.fen());
      setMoveHistory((prev) => [...prev, move.san]);
      setFenHistory((prev) => [...prev, game.current.fen()]);
      
      if (onPgnChange) {
        onPgnChange(game.current.pgn());
      }
      return true;
    }
    return false;
  };

  const handleClickOnMove = (index: number) => {
    const selectedFen = fenHistory[index + 1];
    if (selectedFen) {
      game.current.load(selectedFen);
      setFen(selectedFen);
    }
  };

  const handleImportPGN = (event: React.ChangeEvent<HTMLInputElement>) => {
    importPGNFromFile(event, game.current, setFen, setMoveHistory, setFenHistory);
    if (onPgnChange) {
      onPgnChange(game.current.pgn());
    }
  };

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen);
      setShowCopied(true);
      
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setShowCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy FEN:', err);
    }
  };

  const copyPgnToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(game.current.pgn());
      setShowCopiedPgn(true);
      setTimeout(() => setShowCopiedPgn(false), 2000);
    } catch (err) {
      console.error('Failed to copy PGN:', err);
    }
  };

  const importPgnFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      try {
        game.current.loadPgn(clipboardText);
        setFen(game.current.fen());
        const moves = game.current.history({ verbose: true });
        const updatedMoveHistory = moves.map((move) => move.san);
        const updatedFenHistory = [game.current.fen()];

        game.current.reset();
        moves.forEach((move) => {
          game.current.move(move.san);
          updatedFenHistory.push(game.current.fen());
        });

        setMoveHistory(updatedMoveHistory);
        setFenHistory(updatedFenHistory);
        if (onPgnChange) {
          onPgnChange(game.current.pgn());
        }
      } catch (error) {
        console.error('Invalid PGN format:', error);
        alert('Ungültiges PGN-Format in der Zwischenablage');
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-screen p-4">
      <div className="flex w-full">
        <div className="w-1/2 flex justify-center">
          <div className="flex flex-col items-center">
            <Chessboard
              position={fen}
              onPieceDrop={(sourceSquare, targetSquare) =>
                handleMove(sourceSquare, targetSquare)
              }
              boardWidth={Math.min(500, window.innerWidth / 2 - 16)}
            />
            <div className="mt-4 flex space-x-4">
              {/* Analyse Button */}
              <button
                onClick={() => setIsAnalyzing(!isAnalyzing)}
                className={`flex items-center justify-center w-10 h-10 rounded ${
                  isAnalyzing 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
                title={isAnalyzing ? 'Analyse stoppen' : 'Analyse starten'}
              >
                {isAnalyzing ? (
                  <StopCircle className="w-6 h-6" />
                ) : (
                  <PlayCircle className="w-6 h-6" />
                )}
              </button>

              {/* FEN Button */}
              <button
                onClick={copyFen}
                className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                title="FEN kopieren"
              >
                {showCopied ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Copy className="w-6 h-6" />
                )}
              </button>

              {/* Export Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  title="PGN exportieren"
                >
                  <Download className="w-6 h-6" />
                </button>
                {showExportMenu && (
                  <div className="absolute z-10 mt-2 py-2 w-64 bg-white rounded-lg shadow-xl border">
                    <button
                      onClick={() => {
                        exportPGNToFile(game.current);
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PGN in Datei exportieren
                    </button>
                    <button
                      onClick={() => {
                        copyPgnToClipboard();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      PGN in Zwischenablage kopieren
                    </button>
                  </div>
                )}
              </div>

              {/* Import Dropdown */}
              <div className="relative" ref={importMenuRef}>
                <button
                  onClick={() => setShowImportMenu(!showImportMenu)}
                  className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded"
                  title="PGN importieren"
                >
                  <Upload className="w-6 h-6" />
                </button>
                {showImportMenu && (
                  <div className="absolute z-10 mt-2 py-2 w-64 bg-white rounded-lg shadow-xl border">
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowImportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      PGN aus Datei importieren
                    </button>
                    <button
                      onClick={() => {
                        importPgnFromClipboard();
                        setShowImportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      PGN aus Zwischenablage importieren
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pgn"
                  onChange={handleImportPGN}
                  className="hidden"
                />
              </div>
            </div>
            <div className="mt-4 w-full">
              <EngineAnalysis fen={fen} isAnalysing={isAnalyzing} onPlayMove={handleMove} />
            </div>
          </div>
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
    </div>
  );
};

export default ChessboardComponent;