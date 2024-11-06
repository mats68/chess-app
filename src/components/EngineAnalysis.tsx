import React, { useEffect, useState, useRef } from 'react';

interface EngineAnalysisProps {
  fen: string;
  isAnalysing: boolean;
}

const EngineAnalysis = ({ fen, isAnalysing }: EngineAnalysisProps) => {
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const callbackRef = useRef<((score: number) => void) | null>(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    // Initialize worker
    try {
      workerRef.current = new Worker('/stockfish.js');
      workerRef.current.onmessage = handleWorkerMessage;
      workerRef.current.onerror = (e) => console.error('Stockfish Worker Error:', e);
      
      // Initialize engine
      sendCommand('uci');
      sendCommand('setoption name MultiPV value 1');
      sendCommand('ucinewgame');
      sendCommand('isready');
    } catch (error) {
      console.error('Error initializing Stockfish worker:', error);
    }

    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const sendCommand = (cmd: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage(cmd);
    }
  };

  const handleWorkerMessage = (e: MessageEvent) => {
    const message = e.data;

    // Handle "readyok" message
    if (message === 'readyok') {
      isReadyRef.current = true;
      return;
    }

    // Handle evaluation info
    if (message.startsWith('info') && message.includes('score cp')) {
      const matches = message.match(/score cp (-?\d+)/);
      if (matches && callbackRef.current) {
        const score = parseInt(matches[1]) / 100; // Convert centipawns to pawns
        callbackRef.current(score);
      }
    }
  };

  const evaluatePosition = async (fen: string, callback: (score: number) => void) => {
    if (!workerRef.current) {
      console.error('Stockfish worker not initialized');
      return;
    }

    // Wait for engine to be ready
    if (!isReadyRef.current) {
      await new Promise(resolve => {
        const checkReady = setInterval(() => {
          if (isReadyRef.current) {
            clearInterval(checkReady);
            resolve(true);
          }
        }, 100);
      });
    }

    callbackRef.current = callback;
    sendCommand('position fen ' + fen);
    sendCommand('go depth 20');
  };

  const stopAnalysis = () => {
    if (workerRef.current) {
      sendCommand('stop');
      callbackRef.current = null;
    }
  };

  useEffect(() => {
    if (isAnalysing && fen) {
      setIsLoading(true);
      evaluatePosition(fen, (score) => {
        setEvaluation(score);
        setIsLoading(false);
      });
    } else {
      stopAnalysis();
      setEvaluation(null);
    }
    
    return () => {
      stopAnalysis();
    };
  }, [fen, isAnalysing]);

  const getEvaluationBar = () => {
    if (evaluation === null) return 50;
    // Convert evaluation to percentage (centered at 50%)
    const percentage = 50 + Math.min(Math.max(evaluation * 5, -50), 50);
    return percentage;
  };

  return (
    <div className="w-full max-w-xs">
      <div className="flex items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          {isLoading ? 'Analysiere...' : 
           evaluation === null ? 'Keine Analyse' :
           `Bewertung: ${evaluation > 0 ? '+' : ''}${evaluation.toFixed(2)}`}
        </span>
      </div>
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${getEvaluationBar()}%` }}
        />
      </div>
    </div>
  );
};

export default EngineAnalysis;