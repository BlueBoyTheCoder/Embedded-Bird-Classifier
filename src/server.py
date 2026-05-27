from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
import zipfile

app = FastAPI(title="Bird Classifier API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOGIKA ŚCIEŻEK ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)

RESULTS_PATH = os.path.join(BASE_DIR, "running", "analizing_results")
AUDIO_PATH = os.path.join(BASE_DIR, "running", "saved_audio_samples")
IMAGES_PATH = os.path.join(BASE_DIR, "bird_images")
ZIP_PATH = os.path.join(BASE_DIR, "running", "export.zip") # Plik tymczasowy na paczkę

os.makedirs(RESULTS_PATH, exist_ok=True)
os.makedirs(AUDIO_PATH, exist_ok=True)
os.makedirs(IMAGES_PATH, exist_ok=True)

# --- ENDPOINTY API ---

@app.get("/api/results")
def list_results():
    """Zwraca listę dostępnych plików JSON z wynikami."""
    try:
        files = [f for f in os.listdir(RESULTS_PATH) if f.endswith('.json')]
        return {"files": sorted(files, reverse=True)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export")
def export_all_data():
    """Tworzy paczkę ZIP ze wszystkimi logami i nagraniami, po czym ją zwraca."""
    try:
        with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Pakujemy JSONy
            for root, _, files in os.walk(RESULTS_PATH):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, arcname=f"JSON_LOGS/{file}")
            # Pakujemy nagrania WAV
            for root, _, files in os.walk(AUDIO_PATH):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Zachowujemy nazwy folderów (z datą) wewnątrz paczki ZIP
                    folder_name = os.path.basename(root)
                    zipf.write(file_path, arcname=f"AUDIO/{folder_name}/{file}")
        
        return FileResponse(ZIP_PATH, media_type="application/zip", filename="ZGRANE_PTAKI_SD.zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/clear")
def clear_sd_card():
    """Bezlitośnie kasuje wszystkie logi JSON i wycięte audio z karty SD."""
    try:
        # Usuwamy JSONy
        for filename in os.listdir(RESULTS_PATH):
            file_path = os.path.join(RESULTS_PATH, filename)
            if os.path.isfile(file_path):
                os.unlink(file_path)
                
        # Usuwamy foldery z nagraniami
        for item in os.listdir(AUDIO_PATH):
            item_path = os.path.join(AUDIO_PATH, item)
            if os.path.isdir(item_path):
                shutil.rmtree(item_path)
                
        # Usuwamy paczkę zip jeśli istnieje
        if os.path.exists(ZIP_PATH):
            os.unlink(ZIP_PATH)
            
        return {"status": "success", "message": "Karta SD wyczyszczona pomyślnie!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- SERWOWANIE PLIKÓW STATYCZNYCH ---
app.mount("/data/results", StaticFiles(directory=RESULTS_PATH), name="results")
app.mount("/data/audio", StaticFiles(directory=AUDIO_PATH), name="audio")
app.mount("/data/images", StaticFiles(directory=IMAGES_PATH), name="images")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)