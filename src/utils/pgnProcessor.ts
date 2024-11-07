import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';

export interface PgnProcessorResult {
  moves: string[];
  comments: Record<number, string>;
  fen: string;
  fenHistory: string[];
}

export const processPgn = (pgn: string): PgnProcessorResult => {
  const chess = new Chess();
  const comments: Record<number, string> = {};
  
  try {
    // Load the PGN
    chess.loadPgn(pgn);
    
    // Get history with comments
    const history = chess.history({ verbose: true });
    const moves = history.map(move => move.san);
    
    // Extract comments from PGN
    const commentRegex = /\{([^}]+)\}/g;
    const pgnWithoutClock = pgn.replace(/\%clk \d+:\d+:\d+/g, '');
    let match;
    let moveIndex = 0;
    
    while ((match = commentRegex.exec(pgnWithoutClock)) !== null) {
      const comment = match[1].trim();
      if (comment) {
        comments[moveIndex] = comment;
      }
      moveIndex++;
    }
    
    // Generate FEN history
    const fenHistory = [chess.fen()];
    chess.reset();
    
    for (const move of history) {
      chess.move(move);
      fenHistory.push(chess.fen());
    }
    
    return {
      moves,
      comments,
      fen: chess.fen(),
      fenHistory
    };
  } catch (error) {
    console.error('Error processing PGN:', error);
    return {
      moves: [],
      comments: {},
      fen: chess.fen(),
      fenHistory: [chess.fen()]
    };
  }
};

export const generatePgnWithComments = (
  moves: string[], 
  comments: Record<number, string>
): string => {
  const chess = new Chess();
  let pgn = '';
  let moveNumber = 1;
  
  moves.forEach((move, index) => {
    // Add move number for white's moves
    if (index % 2 === 0) {
      pgn += `${moveNumber}. `;
      moveNumber++;
    }
    
    // Add the move
    pgn += move;
    
    // Add comment if exists
    if (comments[index]) {
      pgn += ` {${comments[index]}}`;
    }
    
    // Add space
    pgn += ' ';
    
    try {
      chess.move(move);
    } catch (error) {
      console.error(`Invalid move: ${move}`, error);
    }
  });
  
  return pgn.trim();
};

export const usePgnProcessor = (initialPgn: string = '') => {
  const [moves, setMoves] = useState<string[]>([]);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [fen, setFen] = useState<string>('');
  const [fenHistory, setFenHistory] = useState<string[]>([]);
  const [pgn, setPgn] = useState<string>(initialPgn);
  
  // Process PGN when it changes
  useEffect(() => {
    const result = processPgn(initialPgn);
    setMoves(result.moves);
    setComments(result.comments);
    setFen(result.fen);
    setFenHistory(result.fenHistory);
    setPgn(initialPgn);
  }, [initialPgn]);
  
  // Update PGN when moves or comments change
  const updatePgn = (newMoves: string[], newComments: Record<number, string>) => {
    const newPgn = generatePgnWithComments(newMoves, newComments);
    setPgn(newPgn);
    return newPgn;
  };
  
  return {
    moves,
    setMoves,
    comments,
    setComments,
    fen,
    setFen,
    fenHistory,
    setFenHistory,
    pgn,
    updatePgn
  };
};