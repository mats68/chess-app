// src/types/chess.ts
export interface ChessVariant {
  id: string;
  name: string;
  pgn: string;
  notes?: string;
}

export interface ChessChapter {
  id: string;
  name: string;
  variants: ChessVariant[];
}

export interface ChessOpening {
  id: string;
  name: string;
  chapters: ChessChapter[];
}