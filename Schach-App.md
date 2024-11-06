Ich verwende React.js mit vite, Typescript, tailwind, und react-chessboard.

Ich habe erst damit angefangen.
Es ist wie eine Schach-Datenbank, ähnlich wie chessbase.
Ich kann Züge auf dem Schachbrett links eingeben.
Rechts ist die Notation der Züge.
Ich kann die Züge in ein pgn-Datei exportieren (speichern) und wieder laden.
Eine solche Partie nenne ich Variante.
Ich kann mehrere Varianten eingeben und einer Eröffnung zuordnen.
Ich habe folgende Struktur vorgesehen:
- Eröffnung 1
  - Kapitel 1
    - Variante 1 (pgn)
    - Variante 2 (pgn)
    - weitere Varianten (pgn)
  - Kapitel 2
    - Variante 1 (pgn)
    - Variante 2 (pgn)
    - weitere Varianten (pgn)
  - weitere Kapitel...
- weitere Eröffnungen...

Ich möchte zunächst die Struktur und die pgn Varianten im local Storage des Brwoser speichern können.
Es sollen nach und nach weitere Funktionen hinzukommen.


Ich will bei PGN importieren und PGN Exportieren ein Dropdown menü Mit jewils 2 Optionen: 1. PGN in Datei importieren 2. PGN in Zwischenablage importieren 
1. PGN in Datei Exportieren 2. PGN in Zwischenablage exportieren 

Ich möchte mit den Pfeiltasten Vor und zurück in den Zügen navigieren können. 

Ich möchte, dass die Zugnotation wie auf dem Bild aussieht. Nicht die Spaltenförmige Darstellung, sondern fließender Text. Ich kann trotzdem Auf einzelne Züge klicken. 

Ich möchte das die Züge keine blaue und Rote Hintergrundfarbe haben Ich möchte lediglich, dass der aktuelle Zug aus der aktuellen Stellung ein einen leichten grauen Hintergrund hat. 