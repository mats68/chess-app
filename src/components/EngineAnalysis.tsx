import React, { useEffect, useState, useRef } from 'react';
import { Settings, ChevronUp, ChevronDown } from 'lucide-react';

interface EngineAnalysisProps {
  fen: string;
  isAnalysing: boolean;
}

interface EngineVariant {
  score: number;
  moves: string;
  depth: number;
}

const EngineAnalysis = ({ fen, isAnalysing }: EngineAnalysisProps) => {
  const [variants, setVariants] = useState<EngineVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [depth, setDepth] = useState(20);
  const [multiPv, setMultiPv] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);
  const isReadyRef = useRef(false);

  // Initialize engine
  useEffect(() => {
    try {
      workerRef.current = new Worker('/stockfish.js');
      workerRef.current.onmessage = handleWorkerMessage;
      workerRef.current.onerror = (e) => console.error('Stockfish Worker Error:', e);
      
      // Initialize engine
      sendCommand('uci');
      sendCommand(`setoption name MultiPV value ${multiPv}`);
      sendCommand('ucinewgame');
      sendCommand('isready');
    } catch (error) {
      console.error('Error initializing Stockfish worker:', error);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Update MultiPV when changed
  useEffect(() => {
    if (workerRef.current && isReadyRef.current) {
      sendCommand(`setoption name MultiPV value ${multiPv}`);
    }
  }, [multiPv]);

  const sendCommand = (cmd: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage(cmd);
    }
  };

  const handleWorkerMessage = (e: MessageEvent) => {
    const message = e.data;

    if (message === 'readyok') {
      isReadyRef.current = true;
      return;
    }

    // Handle multipv info
    if (message.startsWith('info') && message.includes('score cp')) {
      try {
        const pvMatch = message.match(/multipv (\d+)/);
        const scoreMatch = message.match(/score cp (-?\d+)/);
        const depthMatch = message.match(/depth (\d+)/);
        const pv = message.match(/pv (.+?)(?=\s(multipv|info|bestmove)|$)/);

        if (pvMatch && scoreMatch && depthMatch && pv) {
          const pvNumber = parseInt(pvMatch[1]);
          const score = parseInt(scoreMatch[1]) / 100;
          const currentDepth = parseInt(depthMatch[1]);
          const moves = pv[1].trim();

          setVariants(prev => {
            const newVariants = [...prev];
            newVariants[pvNumber - 1] = {
              score,
              moves,
              depth: currentDepth
            };
            return newVariants;
          });

          if (currentDepth >= depth) {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error parsing engine output:', error);
      }
    }
  };

  const evaluatePosition = async () => {
    if (!workerRef.current || !isReadyRef.current) return;
    
    setVariants([]);
    setIsLoading(true);
    sendCommand('position fen ' + fen);
    sendCommand(`go depth ${depth}`);
  };

  const stopAnalysis = () => {
    if (workerRef.current) {
      sendCommand('stop');
    }
  };

  useEffect(() => {
    if (isAnalysing && fen) {
      evaluatePosition();
    } else {
      stopAnalysis();
      setVariants([]);
    }
    
    return () => {
      stopAnalysis();
    };
  }, [fen, isAnalysing, depth]);

  const getEvaluationBar = (score: number) => {
    // Convert evaluation to percentage (centered at 50%)
    const percentage = 50 + Math.min(Math.max(score * 5, -50), 50);
    return percentage;
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Engine Analyse</h3>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded hover:bg-gray-100"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium">Analysetiefe:</label>
            <div className="flex items-center">
              <button 
                onClick={() => setDepth(d => Math.max(1, d - 1))}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="mx-2">{depth}</span>
              <button 
                onClick={() => setDepth(d => Math.min(30, d + 1))}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="font-medium">Anzahl Varianten:</label>
            <div className="flex items-center">
              <button 
                onClick={() => setMultiPv(m => Math.max(1, m - 1))}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="mx-2">{multiPv}</span>
              <button 
                onClick={() => setMultiPv(m => Math.min(5, m + 1))}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <span className="text-gray-600">Analysiere Position...</span>
        </div>
      ) : variants.length === 0 && isAnalysing ? (
        <div className="text-center py-4">
          <span className="text-gray-600">Warte auf Engine...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={index} className="border rounded p-3">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 mr-2">
                  Variante {index + 1}:
                </span>
                <span className="text-sm font-bold">
                  {variant.score > 0 ? '+' : ''}{variant.score.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${getEvaluationBar(variant.score)}%` }}
                />
              </div>
              <div className="text-sm">
                <span className="font-medium">Züge: </span>
                {variant.moves.split(' ').slice(0, 5).join(' ')}...
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Tiefe: {variant.depth}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EngineAnalysis;