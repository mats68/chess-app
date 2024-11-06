// src/services/StockfishService.ts
export class StockfishService {
    private worker: Worker | null = null;
    private isReady = false;
    private currentCallback: ((evaluation: number) => void) | null = null;
    private depth = 20;
  
    constructor() {
      this.initializeWorker();
    }
  
    private initializeWorker() {
      try {
        this.worker = new Worker('/stockfish.js');
        this.worker.onmessage = (e) => this.handleWorkerMessage(e);
        this.worker.onerror = (e) => console.error('Stockfish Worker Error:', e);
        
        // Initialize engine
        this.sendCommand('uci');
        this.sendCommand('setoption name MultiPV value 1');
        this.sendCommand('ucinewgame');
        this.sendCommand('isready');
      } catch (error) {
        console.error('Error initializing Stockfish worker:', error);
      }
    }
  
    private sendCommand(cmd: string) {
      if (this.worker) {
        this.worker.postMessage(cmd);
      }
    }
  
    private handleWorkerMessage(e: MessageEvent) {
      const message = e.data;
  
      // Handle "readyok" message
      if (message === 'readyok') {
        this.isReady = true;
        return;
      }
  
      // Handle evaluation info
      if (message.startsWith('info') && message.includes('score cp')) {
        const matches = message.match(/score cp (-?\d+)/);
        if (matches && this.currentCallback) {
          const evaluation = parseInt(matches[1]) / 100; // Convert centipawns to pawns
          this.currentCallback(evaluation);
        }
      }
    }
  
    public async evaluatePosition(fen: string, callback: (evaluation: number) => void) {
      if (!this.worker) {
        console.error('Stockfish worker not initialized');
        return;
      }
  
      // Wait for engine to be ready
      if (!this.isReady) {
        await new Promise(resolve => {
          const checkReady = setInterval(() => {
            if (this.isReady) {
              clearInterval(checkReady);
              resolve(true);
            }
          }, 100);
        });
      }
  
      this.currentCallback = callback;
      this.sendCommand('position fen ' + fen);
      this.sendCommand('go depth ' + this.depth);
    }
  
    public stopAnalysis() {
      if (this.worker) {
        this.sendCommand('stop');
        this.currentCallback = null;
      }
    }
  
    public setDepth(depth: number) {
      this.depth = Math.max(1, Math.min(depth, 30)); // Limit depth between 1 and 30
    }
  
    public destroy() {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }
  }
  
  export const stockfish = new StockfishService();