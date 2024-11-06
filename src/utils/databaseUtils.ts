// src/utils/databaseUtils.ts
import { ChessOpening } from '../types/chess';

export const exportDatabase = (openings: ChessOpening[]) => {
  try {
    const data = JSON.stringify(openings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Aktuelles Datum für den Dateinamen
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `chess-openings-${date}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting database:', error);
    alert('Fehler beim Exportieren der Datenbank');
  }
};

export const importDatabase = (
  file: File,
  onSuccess: (openings: ChessOpening[]) => void
) => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const openings = JSON.parse(content) as ChessOpening[];
      
      // Validiere die Struktur der importierten Daten
      if (!Array.isArray(openings)) {
        throw new Error('Ungültiges Dateiformat: Keine Array-Struktur');
      }
      
      // Prüfe, ob die Struktur korrekt ist
      openings.forEach(opening => {
        if (!opening.id || !opening.name || !Array.isArray(opening.chapters)) {
          throw new Error('Ungültige Datenstruktur in der importierten Datei');
        }
      });
      
      onSuccess(openings);
    } catch (error) {
      console.error('Error importing database:', error);
      alert('Fehler beim Importieren der Datenbank: Ungültiges Dateiformat');
    }
  };
  
  reader.readAsText(file);
};