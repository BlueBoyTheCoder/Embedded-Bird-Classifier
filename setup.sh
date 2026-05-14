#!/bin/bash

# Kolory dla lepszej czytelności
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Konfiguracja projektu Embedded Bird Classifier ===${NC}"

# 1. Tworzenie struktury folderów
echo -e "\n${GREEN}[1/4] Tworzenie struktury katalogów...${NC}"
mkdir -p running/{new_audio_samples,saved_audio_samples,analizing_results}
mkdir -p src
touch src/__init__.py

# 2. Konfiguracja Backendu (Python)
echo -e "\n${GREEN}[2/4] Konfiguracja środowiska Python...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Venv utworzony."
fi

source venv/bin/activate
pip install --upgrade pip
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "Ostrzeżenie: requirements.txt nie istnieje. Instaluję podstawy..."
    pip install fastapi uvicorn
fi

# 3. Konfiguracja Frontendu (Node.js/React)
echo -e "\n${GREEN}[3/4] Konfiguracja Frontendu (Vite + React)...${NC}"
if [ -d "frontend" ]; then
    cd frontend
    # Sprawdzenie czy jest zainstalowany Node.js
    if command -v npm &> /dev/null; then
        echo "Instalacja zależności NPM..."
        npm install
    else
        echo -e "\e[31mBŁĄD: npm nie jest zainstalowany! Zainstaluj Node.js, aby uruchomić frontend.\e[0m"
    fi
    cd ..
else
    echo "Ostrzeżenie: Folder 'frontend' nie został znaleziony."
fi

# 4. Podsumowanie i instrukcja uruchomienia
echo -e "\n${BLUE}=== Setup zakończony sukcesem! ===${NC}"
echo -e "Aby uruchomić system:"
echo -e " 1. Backend:  ${BLUE}source venv/bin/activate && python src/server.py${NC}"
echo -e " 2. Frontend: ${BLUE}cd frontend && npm run dev${NC}"
echo -e "\nPamiętaj, aby telefon i komputer były w tej samej sieci (Hotspot)!"