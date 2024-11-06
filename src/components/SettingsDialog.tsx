import React from 'react';
import { Settings, X, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { ChessSettings } from '../types/chess';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChessSettings;
  onSettingsChange: (settings: ChessSettings) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Einstellungen</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Animation Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.animationEnabled ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
                <span>Animation</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.animationEnabled}
                  onChange={(e) => onSettingsChange({
                    ...settings,
                    animationEnabled: e.target.checked
                  })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.animationEnabled && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600">
                  Animationsgeschwindigkeit: {settings.animationSpeed}ms
                </label>
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="50"
                  value={settings.animationSpeed}
                  onChange={(e) => onSettingsChange({
                    ...settings,
                    animationSpeed: Number(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Schnell</span>
                  <span>Normal</span>
                  <span>Langsam</span>
                </div>
              </div>
            )}
          </div>

          {/* Sound Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.moveSound ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
              <span>Zuggeräusche</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.moveSound}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  moveSound: e.target.checked
                })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Tastaturkürzel:</h3>
          <ul className="space-y-1">
            <li>← / →: Ein Zug zurück / vor</li>
            <li>Pos1 / Ende: Zum Anfang / Ende</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;