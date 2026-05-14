from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Bird Classifier API")

# Konfiguracja CORS - kluczowa dla komunikacji z telefonem i Reactem
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOGIKA ŚCIEŻEK ---
# Pobieramy ścieżkę do folderu, w którym znajduje się ten plik (src/)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Wychodzimy poziom wyżej do głównego folderu projektu
BASE_DIR = os.path.dirname(CURRENT_DIR)

# Definiujemy ścieżki do danych
RESULTS_PATH = os.path.join(BASE_DIR, "running", "analizing_results")
AUDIO_PATH = os.path.join(BASE_DIR, "running", "saved_audio_samples")

# Tworzymy foldery, jeśli nie istnieją, żeby app.mount się nie wywalił
os.makedirs(RESULTS_PATH, exist_ok=True)
os.makedirs(AUDIO_PATH, exist_ok=True)

print(f"\n{'='*50}")
print(f"BIRD ANALYZER SERVER STARTING...")
print(f"JSON Source:  {RESULTS_PATH}")
print(f"Audio Source: {AUDIO_PATH}")
print(f"{'='*50}\n")

# --- ENDPOINTY API ---

@app.get("/api/results")
def list_results():
    """Zwraca listę dostępnych plików JSON z wynikami."""
    try:
        files = [f for f in os.listdir(RESULTS_PATH) if f.endswith('.json')]
        # Sortujemy od najnowszych (zakładając format daty w nazwie)
        return {"files": sorted(files, reverse=True)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SERWOWANIE PLIKÓW STATYCZNYCH ---

# Pozwala na dostęp do JSONów: http://localhost:8000/data/results/analysis_...json
app.mount("/data/results", StaticFiles(directory=RESULTS_PATH), name="results")

# Pozwala na dostęp do WAVów: http://localhost:8000/data/audio/2026-05-14.../plik.wav
app.mount("/data/audio", StaticFiles(directory=AUDIO_PATH), name="audio")

if __name__ == "__main__":
    import uvicorn
    # host 0.0.0.0 jest niezbędny, aby telefon mógł się połączyć przez IP komputera
    uvicorn.run(app, host="0.0.0.0", port=8000)