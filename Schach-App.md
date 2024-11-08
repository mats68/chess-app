===
errors:
- edit funktionert nicht saved immer beim zug 1

Ideen: 
- edit-button: bei neuer variante automatisch editmodus
- Bei Variante eine Ausgangs-Stellung definierbar (mit Brett),
z.B 1.d4c52.d5e53.♘c3d6
Falls nun eine neue Partie erstellt wird, wird mit diesen Zügen erstellt
- ((Auto-Sortierfunktion: Bei Import PGN wird in die richtige Variante eingefügt. (ev. problem zugumstellungen ?)))
- Suchen von stellung mit brett und fen einfüge funktion
- variante bearbeien: züge abschneiden
  - variante aus engine einfügen


===

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
Ich möchte mit den Vor- und Zurück-Testen in den Zügen navigieren können 

Wenn ich durch die Züge navigiere, habe ich festgestellt, ist die Anzeige nicht mehr so flüssig. Mach mal verschwindet die gezogene Figur für einen kurzen Moment. 


Ich möchte Kommentare pro Zug in der Notation einfügen können (Siehe Image)
Ich habe unten bei der Notation einen Button "Kommentare aktivieren". Falls ich den Button drücke, ist der Kommentarmodus aktiv, der Button wird anders dargestellt (aktiviert) und ein Memofeld
wird angezeigt unterhalb der notation, aber oberhalb des Buttons. 
Wenn ich das Memofeld editiere, wird der Kommentar für den aktuellen Zug bearbeitet. Das Memofeld bleibt weiterhin
aktiv und ich kann andere Züge kommentieren.
Wenn ich den Button nochmals drücke, verswchwindet das Memofeld und der Kommentarmodus is deaktiviert und der Button wird normal dargestellt.
Beachte bitte, dass wenn ich einen Weissen Zug kommentiere, dann bricht es beim weissen Zug um und 
die Notation mit dem schwarzen Zug mit "... " weitergeführt.

if I comment a black move it formats like this. e.g.:
```
1. d4 d5
2.c4
2...e6
guter zug
```

but the black move must not be on a new line. It should look like this:
```
1. d4 d5
2.c4 e6
guter zug
```

comment for a black move is now correct, but a comment for a white move 
it should be like this:
```
1. d4 d5
2.c4
guter zug
2...e6
```


now its like this:
1. d4 d5
2. c4
comment for c4
2...e6
guter zug
3.♘f3 ♘f6 
4.♘c3 ♗b4 5.a3 ♗xc3+

but it should be like this (move 4 on same line as move 3):  
1. d4 d5
2. c4
comment for c4
2...e6
guter zug
3.♘f3 ♘f6 4.♘c3 ♗b4 5.a3 ♗xc3+



