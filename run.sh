#!/bin/bash

# 1. Activate environment
source venv/bin/activate

# Path configuration
ANALYZER="src/analyzer.py"
RECORDER="src/recorder.py"
SERVER="src/server.py"
RECORDER_ARGS="-m default"

# 2. Clear ports before startup (in case something is still running)
echo "Cleaning ports 8000 (API) and 5173 (Frontend)..."
fuser -k 8000/tcp 5173/tcp 2>/dev/null

echo "--- Launching Embedded Bird Classifier System ---"

# 3. Start Python backends
python3 "$ANALYZER" > /dev/null 2>&1 &
PID1=$!
echo "[OK] Analyzer started (PID: $PID1)"

python "$RECORDER" $RECORDER_ARGS > /dev/null 2>&1 &
PID2=$!
echo "[OK] Recorder started (PID: $PID2)"

python "$SERVER" > /dev/null 2>&1 &
PID_SERVER=$!
echo "[OK] FastAPI Server started (PID: $PID_SERVER)"

# 4. Start Frontend (Vite)
echo "Starting Frontend..."
cd frontend
# Run npm run dev in the background and redirect logs to a file so they do not clutter the console
npm run dev > ../frontend.log 2>&1 &
PID_FRONT=$!
cd ..
echo "[OK] Frontend started (PID: $PID_FRONT)"

# Get local IP address for convenience
IP_ADDR=$(hostname -I | awk '{print $1}')
echo -e "\n-----------------------------------------------"
echo -e "SYSTEM READY!"
echo -e "Local URL:    http://localhost:5173"
echo -e "Hotspot URL:  http://$IP_ADDR:5173"
echo -e "-----------------------------------------------"
echo "Press [CTRL+C] to stop all components"

# 5. Advanced shutdown function
function finish {
    echo -e "\n\nClosing all components..."
    
    # Attempt graceful shutdown
    kill $PID1 $PID2 $PID_SERVER $PID_FRONT 2>/dev/null
    
    # Wait a moment and force kill if processes have not terminated
    sleep 1
    fuser -k 8000/tcp 5173/tcp 2>/dev/null
    
    echo "All programs closed. Goodbye!"
    exit 0
}

trap finish SIGINT

# Main loop
while true; do
    sleep 1
done