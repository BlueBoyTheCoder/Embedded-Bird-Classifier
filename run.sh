#!/bin/bash

# 1. Dodajemy folder BirdNET-Analyzer do ścieżki wyszukiwania Pythona.
# Dzięki temu 'birdnet_analyzer' będzie widoczny bezpośrednio.
export PYTHONPATH=$PYTHONPATH:$(pwd)/BirdNET-Analyzer

# 2. Definicja ścieżek (relatywne do miejsca, w którym stoisz)
INPUT_DIR="audio_example_samples/"
OUTPUT_DIR="running/log_files"
LOG_FILE="$OUTPUT_DIR/logs.txt"
ERROR_FILE="$OUTPUT_DIR/output_error.txt"

# 3. Tworzenie folderu na logi
mkdir -p "$OUTPUT_DIR"

echo "Uruchamianie analizy BirdNET z poziomu: $(pwd)"

# 4. KLUCZOWA ZMIANA: 
# Nie piszemy 'python3 -m BirdNET-Analyzer.birdnet_analyzer', 
# bo Python nie lubi myślników w nazwach pakietów.
# Skoro dodaliśmy folder do PYTHONPATH, wywołujemy po prostu:
python3 -u -m birdnet_analyzer.analyze "$INPUT_DIR" -o "$OUTPUT_DIR/" \
    1> "$LOG_FILE" \
    2> "$ERROR_FILE"

echo "Gotowe! Logi znajdziesz w $OUTPUT_DIR"