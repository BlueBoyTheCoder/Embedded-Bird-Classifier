#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Embedded Bird Classifier Project Configuration ===${NC}"

# 1. Directory structure creation
echo -e "\n${GREEN}[1/4] Creating directory structure...${NC}"
mkdir -p running/{new_audio_samples,saved_audio_samples,analizing_results}
mkdir -p src
touch src/__init__.py

# 2. Backend Configuration (Python)
echo -e "\n${GREEN}[2/4] Configuring Python environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Venv created."
fi

source venv/bin/activate
pip install --upgrade pip
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "Warning: requirements.txt does not exist. Installing basics..."
    pip install fastapi uvicorn
fi

# 3. Frontend Configuration (Node.js/React)
echo -e "\n${GREEN}[3/4] Configuring Frontend (Vite + React)...${NC}"
if [ -d "frontend" ]; then
    cd frontend
    # Check if Node.js is installed
    if command -v npm &> /dev/null; then
        echo "Installing NPM dependencies..."
        npm install
    else
        echo -e "\e[31mERROR: npm is not installed! Install Node.js to run the frontend.\e[0m"
    fi
    cd ..
else
    echo "Warning: 'frontend' folder not found."
fi

# 4. Summary and execution instructions
echo -e "\n${BLUE}=== Setup completed successfully! ===${NC}"
echo -e "To run the system:"
echo -e " 1. Backend:  ${BLUE}source venv/bin/activate && python src/server.py${NC}"
echo -e " 2. Frontend: ${BLUE}cd frontend && npm run dev${NC}"
echo -e "\nRemember to have both your phone and computer on the same network (Hotspot)!"