#!/bin/sh
# Stormbound sur Mac / Linux : double-clique (ou lance ./lancer.command), puis ouvre http://localhost:8000/
cd "$(dirname "$0")"
( sleep 1; open "http://localhost:8000/" 2>/dev/null || xdg-open "http://localhost:8000/" 2>/dev/null ) &
python3 -m http.server 8000
