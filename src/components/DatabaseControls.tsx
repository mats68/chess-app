// src/components/DatabaseControls.tsx
import React, { useRef } from 'react';
import { ChessOpening } from '../types/chess';
import { exportDatabase, importDatabase } from '../utils/databaseUtils';
import { SaveIcon, UploadIcon } from 'lucide-react';

interface DatabaseControlsProps {
  openings: ChessOpening[];
  onImport: (openings: ChessOpening[]) => void;
}

const DatabaseControls: React.FC<DatabaseControlsProps> = ({ openings, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importDatabase(file, onImport);
    }
    // Reset input damit die gleiche Datei nochmal importiert werden kann
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex space-x-2 mb-4">
      <button
        onClick={() => exportDatabase(openings)}
        className="flex items-center px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        <SaveIcon className="w-4 h-4 mr-2" />
        Datenbank exportieren
      </button>
      
      <label className="flex items-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
        <UploadIcon className="w-4 h-4 mr-2" />
        Datenbank importieren
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </label>
    </div>
  );
};

export default DatabaseControls;