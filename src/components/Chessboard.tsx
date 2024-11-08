import React, { useRef, useState, useEffect, memo } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { exportPGNToFile, importPGNFromFile } from "../pgnUtils";
import EngineAnalysis from "./EngineAnalysis";
import { usePgnProcessor } from "../utils/pgnProcessor";
import CommentEditor from "./CommentEditor";
import {
  PlayCircle,
  StopCircle,
  Copy,
  Check,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Save,
} from "lucide-react";

interface ChessboardComponentProps {
  initialPgn?: string;
  onSave?: (pgn: string) => void;
  onBack?: () => void;
  opening?: string;
  chapter?: string;
  variant?: string;
  onPgnChange?: (pgn: string) => void; // Add this prop
}

interface BreadcrumbProps {
  opening: string;
  chapter: string;
  variant: string;
  onOpeningClick: () => void;
  onChapterClick: () => void;
  onVariantClick: () => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  opening,
  chapter,
  variant,
  onOpeningClick,
  onChapterClick,
  onVariantClick,
}) => {
  return (
    <nav className="flex items-center space-x-2 text-gray-600">
      <a href="#" onClick={onOpeningClick} className="hover:underline">
        {opening}
      </a>
      <ChevronRight className="w-4 h-4" />
      <a href="#" onClick={onChapterClick} className="hover:underline">
        {chapter}
      </a>
      <ChevronRight className="w-4 h-4" />
      <a href="#" onClick={onVariantClick} className="hover:underline">
        {variant}
      </a>
    </nav>
  );
};

const ChessboardComponent: React.FC<ChessboardComponentProps> = ({
  initialPgn = "",
  onSave,
  onBack,
  opening,
  chapter,
  variant,
  onPgnChange,
}) => {
  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [fenHistory, setFenHistory] = useState<string[]>([game.current.fen()]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [currentComment, setCurrentComment] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  // Effect für das Laden des aktuellen Kommentars
  useEffect(() => {
    if (currentMoveIndex >= 0) {
      setCurrentComment(comments[currentMoveIndex] || "");
    }
  }, [currentMoveIndex]); // Entfernt comments aus den Dependencies

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
      if (
        importMenuRef.current &&
        !importMenuRef.current.contains(event.target as Node)
      ) {
        setShowImportMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialPgn) {
      try {
        const chess = new Chess();
        chess.loadPgn(initialPgn);
        
        game.current = chess;
        
        // Get move history
        const history = chess.history();
        setMoveHistory(history);
        
        // Create FEN history
        const newFenHistory = [new Chess().fen()];
        const replayChess = new Chess();
        history.forEach(move => {
          replayChess.move(move);
          newFenHistory.push(replayChess.fen());
        });
        setFenHistory(newFenHistory);
        setFen(chess.fen());
        
        // Load comments
        const newComments = loadCommentsFromPgn(initialPgn);
        setComments(newComments);
        
        // Set current position
        const lastMoveIndex = history.length - 1;
        setCurrentMoveIndex(lastMoveIndex);
        
        // Set current comment if one exists for the last move
        setCurrentComment(newComments[lastMoveIndex] || '');
        
        setHasUnsavedChanges(false);
        
        // Debug output
        // console.log('Loaded PGN:', initialPgn);
        // console.log('Move history:', history);
        // console.log('Comments:', newComments);
        
      } catch (error) {
        console.error('Error loading PGN:', error);
      }
    }
  }, [initialPgn]);
  
  // Warnung bei ungespeicherten Änderungen
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message =
          "Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleMove = (from: string, to: string) => {
    try {
      const move = game.current.move({ from, to });
      if (move) {
        const newMoveHistory = [...moveHistory, move.san];
        setMoveHistory(newMoveHistory);
        const newFen = game.current.fen();
        setFen(newFen);
        setFenHistory((prev) => [...prev, newFen]);
        setCurrentMoveIndex(newMoveHistory.length - 1);
        setHasUnsavedChanges(true);
        return true;
      }
    } catch (error) {
      console.error("Error making move:", error);
    }
    return false;
  };

  const handleImportPGN = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const pgn = e.target?.result as string;
      try {
        game.current.loadPgn(pgn);
        const result = processPgn(pgn);
        setMoves(result.moves);
        setComments(result.comments);
        setFen(result.fen);
        setFenHistory(result.fenHistory);

        if (onPgnChange) {
          onPgnChange(pgn);
        }
      } catch (error) {
        console.error("Error importing PGN:", error);
        alert("Ungültige PGN-Datei!");
      }
    };
    reader.readAsText(file);
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
      console.error("Failed to copy FEN:", err);
    }
  };

  const copyPgnToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(game.current.pgn());
      setShowCopiedPgn(true);
      setTimeout(() => setShowCopiedPgn(false), 2000);
    } catch (err) {
      console.error("Failed to copy PGN:", err);
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
        console.error("Invalid PGN format:", error);
        alert("Ungültiges PGN-Format in der Zwischenablage");
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCurrentMoveIndex(moveHistory.length - 1);
  }, [moveHistory.length]);

  const handleKeyDown = (e: KeyboardEvent) => {
    // Links: Einen Zug zurück
    if (e.key === "ArrowLeft") {
      if (currentMoveIndex > -1) {
        handleClickOnMove(currentMoveIndex - 1);
      }
    }
    // Rechts: Einen Zug vor
    else if (e.key === "ArrowRight") {
      if (currentMoveIndex < moveHistory.length - 1) {
        handleClickOnMove(currentMoveIndex + 1);
      }
    }
    // Start: Zurück zum Anfang
    else if (e.key === "Home") {
      handleClickOnMove(0); // Startposition
    }
    // Ende: Zum letzten Zug
    else if (e.key === "End") {
      handleClickOnMove(moveHistory.length - 1);
    }
  };

  // Effect für Event Listener
  useEffect(() => {
    // Füge Event Listener hinzu wenn Komponente mounted
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup wenn Komponente unmounted
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentMoveIndex, moveHistory.length]); // Dependencies für den Effect

  const handleClickOnMove = (index: number) => {
    const chess = new Chess();

    if (index === -1) {
      // Reset to starting position
      setFen(chess.fen());
      game.current = chess;
    } else {
      // Replay moves up to the selected index
      for (let i = 0; i <= index; i++) {
        chess.move(moveHistory[i]);
      }
      setFen(chess.fen());
      game.current = chess;
    }

    setCurrentMoveIndex(index);
    setCurrentComment(comments[index] || "");
  };

  const convertToSymbol = (move: string): string => {
    return move
      .replace(/K/g, "♔")
      .replace(/Q/g, "♕")
      .replace(/R/g, "♖")
      .replace(/B/g, "♗")
      .replace(/N/g, "♘");
  };

  const loadCommentsFromPgn = (pgn: string): Record<number, string> => {
    const newComments: Record<number, string> = {};
    
    // Remove headers
    const pgnWithoutHeaders = pgn.replace(/^\[[^\]]*\]\s*/gm, '').trim();
    
    let moveIndex = -1;
    let inComment = false;
    let currentComment = '';
    
    // Process each token
    pgnWithoutHeaders.split(/(\s+|\{|\}|\d+\.)/).forEach(token => {
      token = token.trim();
      if (!token) return;
  
      if (token === '{') {
        inComment = true;
        currentComment = '';
        return;
      }
  
      if (token === '}') {
        inComment = false;
        if (moveIndex >= 0) {
          newComments[moveIndex] = currentComment.trim();
        }
        return;
      }
  
      if (inComment) {
        currentComment += (currentComment ? ' ' : '') + token;
        return;
      }
  
      // Check for move numbers (e.g., "1." or "1...")
      if (/^\d+\.\.?\.?$/.test(token)) {
        return;
      }
  
      // If it's a move (not a move number, comment, or whitespace)
      if (!inComment && 
          !token.includes('.') && 
          /^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$|^O-O(-O)?[+#]?$/.test(token)) {
        moveIndex++;
      }
    });
  
    // console.log('Parsed PGN:', pgnWithoutHeaders); // Debug
    // console.log('Found comments:', newComments); // Debug
    return newComments;
  };
  
  const logCommentsState = () => {
    // console.log('Current move index:', currentMoveIndex);
    // console.log('Comments state:', comments);
    // console.log('Current comment:', currentComment);
  };
  
  const renderMoveList = () => {
    // Helper to check if any comments exist in a range of moves
    const hasCommentsInRange = (startIdx: number, endIdx: number): boolean => {
      for (let i = startIdx; i <= endIdx; i++) {
        if (comments[i]) return true;
      }
      return false;
    };
  
    // Process moves in pairs and track if we need a new line
    let elements: JSX.Element[] = [];
    let currentLineElements: JSX.Element[] = [];
    let needsNewLine = false;
  
    Array.from({ length: Math.ceil(moveHistory.length / 2) }).forEach((_, idx) => {
      const moveNumber = idx + 1;
      const whiteIdx = idx * 2;
      const blackIdx = idx * 2 + 1;
      const whiteMove = moveHistory[whiteIdx];
      const blackMove = moveHistory[blackIdx];
      const whiteComment = comments[whiteIdx];
      const blackComment = comments[blackIdx];
  
      // Create move pair element
      const movePair = (
        <div key={`move-${moveNumber}`} className="inline-flex items-baseline mr-2">
          <div className="flex items-baseline">
            <span className="mr-1">{`${moveNumber}.`}</span>
            <span
              onClick={() => handleClickOnMove(whiteIdx)}
              className={`cursor-pointer rounded px-0.5 hover:bg-gray-100 
                ${currentMoveIndex === whiteIdx ? "bg-gray-300" : ""}`}
            >
              {convertToSymbol(whiteMove)}
            </span>
          </div>
  
          {blackMove && !whiteComment && (
            <div className="flex items-baseline ml-2">
              <span
                onClick={() => handleClickOnMove(blackIdx)}
                className={`cursor-pointer rounded px-0.5 hover:bg-gray-100
                  ${currentMoveIndex === blackIdx ? "bg-gray-300" : ""}`}
              >
                {convertToSymbol(blackMove)}
              </span>
            </div>
          )}
        </div>
      );
  
      if (needsNewLine) {
        // Start a new line if previous moves had comments
        elements.push(
          <div key={`line-${elements.length}`} className="w-full flex flex-wrap">
            {currentLineElements}
          </div>
        );
        currentLineElements = [movePair];
        needsNewLine = false;
      } else {
        currentLineElements.push(movePair);
      }
  
      // Handle comments
      if (whiteComment) {
        elements.push(
          <div key={`line-${elements.length}`} className="w-full flex flex-wrap">
            {currentLineElements}
          </div>
        );
        elements.push(
          <div key={`white-comment-${whiteIdx}`} className="w-full ml-8 text-gray-600 text-sm my-1">
            {whiteComment}
          </div>
        );
        if (blackMove) {
          elements.push(
            <div key={`black-move-${blackIdx}`} className="w-full flex items-baseline">
              <span className="mr-1">{`${moveNumber}...`}</span>
              <span
                onClick={() => handleClickOnMove(blackIdx)}
                className={`cursor-pointer rounded px-0.5 hover:bg-gray-100
                  ${currentMoveIndex === blackIdx ? "bg-gray-300" : ""}`}
              >
                {convertToSymbol(blackMove)}
              </span>
            </div>
          );
        }
        currentLineElements = [];
        needsNewLine = false;
      }
  
      if (blackComment) {
        elements.push(
          <div key={`line-${elements.length}`} className="w-full flex flex-wrap">
            {currentLineElements}
          </div>
        );
        elements.push(
          <div key={`black-comment-${blackIdx}`} className="w-full ml-8 text-gray-600 text-sm my-1">
            {blackComment}
          </div>
        );
        currentLineElements = [];
        needsNewLine = true;
      }
    });
  
    // Add any remaining moves
    if (currentLineElements.length > 0) {
      elements.push(
        <div key={`line-${elements.length}`} className="w-full flex flex-wrap">
          {currentLineElements}
        </div>
      );
    }
  
    return <div className="whitespace-normal break-words">{elements}</div>;
  };
    
  const handleCommentChange = (comment: string) => {
    setCurrentComment(comment);
    if (currentMoveIndex >= 0) {
      setComments(prev => {
        const newComments = { ...prev };
        if (comment.trim()) {
          newComments[currentMoveIndex] = comment;
        } else {
          delete newComments[currentMoveIndex];
        }
        return newComments;
      });
      setHasUnsavedChanges(true);
    }
    logCommentsState(); // Log state after change
  };

  const generatePgnWithComments = (): string => {
    let pgn = '';
    let moveNumber = 1;
    
    moveHistory.forEach((move, index) => {
      // Add move number for white's moves
      if (index % 2 === 0) {
        pgn += `${moveNumber}. `;
      } else if (index > 0 && comments[index - 1]) {
        // If there was a comment after white's move, repeat the move number for black
        pgn += `${moveNumber}... `;
      }

      // Add the move
      pgn += move;

      // Add comment if it exists for this move
      if (comments[index]) {
        pgn += ` {${comments[index]}}`;
      }

      // Add space after move or comment
      pgn += ' ';

      // Increment move number after black's move
      if (index % 2 === 1) {
        moveNumber++;
      }
    });

    console.log('Generated PGN:', pgn); // Debug output
    return pgn.trim();
  };

  const handleSave = () => {
    const pgn = generatePgnWithComments();
    // console.log('Saving PGN with comments:', pgn); // Debug output
    // console.log('Current comments state:', comments); // Debug output
    if (onSave) {
      onSave(pgn);
      setHasUnsavedChanges(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const shouldLeave = window.confirm(
        "Sie haben ungespeicherte Änderungen. Möchten Sie wirklich zurück zur Übersicht?"
      );
      if (!shouldLeave) {
        return;
      }
    }
    onBack?.();
  };

  const handleOpeningClick = () => {
    handleBack();
  };

  const handleChapterClick = () => {
    handleBack();
  };

  const handleVariantClick = () => {
    handleBack();
  };

  return (
    <div className="container mx-auto p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <Breadcrumb
          opening={opening}
          chapter={chapter}
          variant={variant}
          onOpeningClick={handleOpeningClick}
          onChapterClick={handleChapterClick}
          onVariantClick={handleVariantClick}
        />

        {hasUnsavedChanges && (
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            title="Änderungen speichern"
          >
            <Save className="w-5 h-5 mr-2" />
            Speichern
          </button>
        )}
      </div>

      {/* Haupt-Container mit Flex */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Linke Seite mit Brett und Engine - feste Breite */}
        <div className="flex-none w-[450px]">
          <Chessboard
            position={fen}
            onPieceDrop={(sourceSquare, targetSquare) =>
              handleMove(sourceSquare, targetSquare)
            }
            boardWidth={450}
            animationDuration={200}
            customDarkSquareStyle={{ backgroundColor: "#b58863" }}
            customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
          />
          <div className="mt-2 flex justify-center space-x-2">
            <button
              onClick={() => handleClickOnMove(0)}
              className="p-2 rounded hover:bg-gray-100"
              title="Zum Anfang (Home)"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                handleClickOnMove(Math.max(-1, currentMoveIndex - 1))
              }
              className="p-2 rounded hover:bg-gray-100"
              title="Ein Zug zurück (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                handleClickOnMove(
                  Math.min(moveHistory.length - 1, currentMoveIndex + 1)
                )
              }
              className="p-2 rounded hover:bg-gray-100"
              title="Ein Zug vor (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleClickOnMove(moveHistory.length - 1)}
              className="p-2 rounded hover:bg-gray-100"
              title="Zum Ende (End)"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex space-x-4">
            {/* Analyse Button */}
            <button
              onClick={() => setIsAnalyzing(!isAnalyzing)}
              className={`flex items-center justify-center w-10 h-10 rounded ${
                isAnalyzing
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              } text-white`}
              title={isAnalyzing ? "Analyse stoppen" : "Analyse starten"}
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
                <div className="absolute z-10 bottom-full mb-2 py-2 w-64 bg-white rounded-lg shadow-xl border">
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
                <div className="absolute z-10 bottom-full mb-2 py-2 w-64 bg-white rounded-lg shadow-xl border">
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
            </div>{" "}
          </div>
          <div className="mt-4 w-full">
            <EngineAnalysis
              fen={fen}
              isAnalysing={isAnalyzing}
              onPlayMove={handleMove}
            />
          </div>
        </div>

        {/* Zugliste und Kommentare */}
        <div className="flex-1 rounded shadow p-4 min-h-[300px] overflow-auto flex flex-col">
          <div className="flex-grow mb-4">{renderMoveList()}</div>

          <div className="border-t pt-4">
            <textarea
              value={currentComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder={
                currentMoveIndex >= 0
                  ? "Kommentar zum aktuellen Zug..."
                  : "Wählen Sie einen Zug aus, um einen Kommentar hinzuzufügen"
              }
              disabled={currentMoveIndex < 0}
              className="w-full p-2 border rounded resize-y min-h-[100px]
              disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessboardComponent;
