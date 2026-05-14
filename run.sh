#!/bin/bash

# 1. Aktywacja środowiska
source venv/bin/activate

# Konfiguracja ścieżek
ANALYZER="src/analyzer.py"
RECORDER="src/recorder.py"
SERVER="src/server.py"
RECORDER_ARGS="-m default"

# 2. Czyszczenie portów przed startem (na wypadek gdyby coś wisiało)
echo "Cleaning ports 8000 (API) and 5173 (Frontend)..."
fuser -k 8000/tcp 5173/tcp 2>/dev/null

echo "--- Launching Embedded Bird Classifier System ---"

# 3. Uruchomienie Backendów Pythona
python "$ANALYZER" > /dev/null 2>&1 &
PID1=$!
echo "[OK] Analyzer started (PID: $PID1)"

python "$RECORDER" $RECORDER_ARGS > /dev/null 2>&1 &
PID2=$!
echo "[OK] Recorder started (PID: $PID2)"

python "$SERVER" > /dev/null 2>&1 &
PID_SERVER=$!
echo "[OK] FastAPI Server started (PID: $PID_SERVER)"

# 4. Uruchomienie Frontendu (Vite)
echo "Starting Frontend..."
cd frontend
# Uruchamiamy npm run dev w tle i przekierowujemy logi do pliku, żeby nie śmieciły w konsoli
npm run dev > ../frontend.log 2>&1 &
PID_FRONT=$!
cd ..
echo "[OK] Frontend started (PID: $PID_FRONT)"

# Pobranie lokalnego adresu IP dla wygody
IP_ADDR=$(hostname -I | awk '{print $1}')
echo -e "\n-----------------------------------------------"
echo -e "SYSTEM READY!"
echo -e "Local URL:    http://localhost:5173"
echo -e "Hotspot URL:  http://$IP_ADDR:5173"
echo -e "-----------------------------------------------"
echo "Press [CTRL+C] to stop all components"

# 5. Rozbudowana funkcja zamykania
function finish {
    echo -e "\n\nClosing all components..."
    
    # Próba grzecznego zamknięcia
    kill $PID1 $PID2 $PID_SERVER $PID_FRONT 2>/dev/null
    
    # Czekamy chwilę i wymuszamy jeśli procesy nie zniknęły
    sleep 1
    fuser -k 8000/tcp 5173/tcp 2>/dev/null
    
    echo "All programs closed. Goodbye!"
    exit 0
}

trap finish SIGINT

# Główna pętla
while true; do
    sleep 1
done