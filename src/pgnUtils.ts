// src/pgnUtils.ts

import { Chess } from 'chess.js';

export const exportPGNToFile = (game: Chess) => {
    const pgn = game.pgn();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chess_game.pgn';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const importPGNFromFile = (
    event: React.ChangeEvent<HTMLInputElement>,
    game: Chess,
    setFen: React.Dispatch<React.SetStateAction<string>>,
    setMoveHistory: React.Dispatch<React.SetStateAction<string[]>>,
    setFenHistory: React.Dispatch<React.SetStateAction<string[]>>
) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const pgn = e.target?.result as string;
        // const pgn ='1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 {giuoco piano} *';
        try {
            game.loadPgn(pgn);


            if (pgn) {
                // game.clear();
                setFen(game.fen());
                const moves = game.history({ verbose: true });
                const updatedMoveHistory = moves.map((move) => move.san);
                const updatedFenHistory = [game.fen()];

                // Erzeuge FEN-Historie basierend auf den importierten Zügen
                game.reset(); // Setze das Spiel zurück
                moves.forEach((move) => {
                    game.move(move.san);
                    updatedFenHistory.push(game.fen());
                });

                setMoveHistory(updatedMoveHistory);
                setFenHistory(updatedFenHistory);
            } else {
                alert("Leere PGN-Datei! " + pgn);

            }
        } catch (error) {
            alert("Ungültige PGN-Datei!");
            console.error(error)
        }

    };
    reader.readAsText(file);
};
