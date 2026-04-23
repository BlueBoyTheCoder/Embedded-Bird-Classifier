#!/bin/bash

export PYTHONPATH=$PYTHONPATH:$(pwd)/BirdNET-Analyzer

INPUT_DIR="audio_example_samples/"
OUTPUT_DIR="running/log_files"
LOG_FILE="$OUTPUT_DIR/logs.txt"
ERROR_FILE="$OUTPUT_DIR/output_error.txt"

mkdir -p "$OUTPUT_DIR"

echo "Uruchamianie analizy BirdNET z poziomu: $(pwd)"

python3 -u -m birdnet_analyzer.analyze "$INPUT_DIR" -o "$OUTPUT_DIR/" \
    1> "$LOG_FILE" \
    2> "$ERROR_FILE"

echo "Gotowe! Logi znajdziesz w $OUTPUT_DIR"

source venv/bin/activate

python3 -m src.program.main