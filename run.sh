#!/bin/bash

OUTPUT_DIR="running/log_files"
INPUT_DIR="audio_example_samples/"
LOG_FILE="$OUTPUT_DIR/logs.txt"
ERROR_FILE="$OUTPUT_DIR/output_error.txt"

mkdir -p "$OUTPUT_DIR"

echo "Starting analysis..."

python3 -m BirdNET-Analyzer.birdnet_analyzer.analyze "$INPUT_DIR" -o "$OUTPUT_DIR/" \
    1> "$LOG_FILE" \
    2> "$ERROR_FILE"

echo "Analysis completed. Check the folder $OUTPUT_DIR"