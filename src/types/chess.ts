// src/types/chess.ts

export interface ChessSettings {
  animationSpeed: number;  // 0 = aus, 100 = langsam, 250 = normal, 500 = schnell
  animationEnabled: boolean;
  moveSound: boolean;
}

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