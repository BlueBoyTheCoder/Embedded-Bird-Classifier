#!/bin/bash

./setup.sh

source venv/bin/activate

ANALYZER="src/analyzer.py"
RECORDER="src/recorder.py"
RECORDER_ARGS="-m default"

echo "Running: $ANALYZER, $RECORDER $RECORDER_ARGS..."

python "$ANALYZER" > /dev/null 2>&1 &
PID1=$!

python "$RECORDER" $RECORDER_ARGS > /dev/null 2>&1 &
PID2=$!

# Uruchomienie serwera WWW w folderze z wynikami
cd running
python -m http.server 8000 &
PID_SERVER=$!
cd ..

echo "Press [CTRL+C] to stop the programs"

function finish {
    echo -e "\nClosing programs..."
    
    # Dodano zamykanie serwera (PID_SERVER)
    kill $PID1 $PID2 $PID_SERVER 2>/dev/null
    wait $PID1 $PID2 $PID_SERVER 2>/dev/null

    echo "Programs closed"
    exit 0
}

trap finish SIGINT

while true; do
    sleep 1
done