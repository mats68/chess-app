import { ChessSettings } from "../types/chess";

// src/utils/settings.ts
const DEFAULT_SETTINGS: ChessSettings = {
    animationSpeed: 250,
    animationEnabled: true,
    moveSound: true,
  };
  
  export const loadChessSettings = (): ChessSettings => {
    try {
      const saved = localStorage.getItem('chessSettings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return DEFAULT_SETTINGS;
  };
  
  export const saveChessSettings = (settings: ChessSettings) => {
    try {
      localStorage.setItem('chessSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };