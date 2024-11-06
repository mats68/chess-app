import { ChessOpening } from "../types/chess";

// src/storage/chessStorage.ts
export const STORAGE_KEY = 'chessOpenings';

export const saveOpenings = (openings: ChessOpening[]) => {
  try {
    const openingsJson = JSON.stringify(openings);
    localStorage.setItem(STORAGE_KEY, openingsJson);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadOpenings = (): ChessOpening[] => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      return JSON.parse(savedData);
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  return [];
};