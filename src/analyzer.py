import os
import time
import json
from log_reader import segment_audio_parts
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from birdnetlib import Recording
from birdnetlib.analyzer import Analyzer

OUTPUT_DIR = "./running/analizing_results"
WATCH_PATH = "./running/new_audio_samples"

analyzer = Analyzer()
now = datetime.now()

OUTPUT_WAV_DIR = f"./running/saved_audio_samples/{now.strftime('%Y-%m-%d_%H-%M-%S')}"
os.makedirs(OUTPUT_WAV_DIR, exist_ok=True)

# Definiujemy ścieżkę, ale NIE tworzymy pustego pliku!
file_name = f"analysis_{now.strftime('%Y-%m-%d_%H-%M-%S')}.json"
file_path = os.path.join(OUTPUT_DIR, file_name)

class BirdWatchHandler(FileSystemEventHandler):
    def on_created(self, event):
        # Ignoruj foldery
        if event.is_directory:
            return
        
        # Obsługuj tylko pliki .wav
        if not event.src_path.lower().endswith(".wav"):
            return

        now = datetime.now()
        logname = now.strftime("%Y-%m-%d_%H-%M-%S-%f")
        
        print(f"Analyzing: {event.src_path}")

        try:
            # 1. Analiza
            recording = Recording(analyzer, event.src_path, lat=52.2, lon=21.0)
            recording.analyze()

            # 2. Rejestrujemy TYLKO, gdy wykryto jakiegoś ptaka
            if recording.detections:
                record_data = {
                    "timestamp": logname,
                    "detections": recording.detections
                }

                # Inicjalizacja pliku JSON przy PIERWSZYM wykrytym ptaku
                if not os.path.exists(file_path):
                    with open(file_path, "w", encoding="utf-8") as file:
                        file.write("[\n]")
                
                # Zapis do JSON
                try:
                    with open(file_path, "r+", encoding="utf-8") as file:
                        file.seek(0, os.SEEK_END)
                        pos = file.tell()
                        while pos > 0:
                            pos -= 1
                            file.seek(pos)
                            if file.read(1) == "]":
                                break
                        file.seek(pos)
                        file.truncate()
                        if pos > 2:
                            file.write(",\n")
                        else:
                            file.write("\n")
                        json.dump(record_data, file, indent=4, ensure_ascii=False)
                        file.write("\n]")
                except Exception as e:
                    print(f"Błąd zapisu JSON: {e}")

                # Wycinanie fragmentów audio (uruchamiane tylko, gdy są detekcje)
                segment_audio_parts(recording.detections, event.src_path, OUTPUT_WAV_DIR, logname)
            
            # Usuwamy referencję do obiektu recording, aby zwolnić plik
            del recording 
            
            # Krótka pauza, aby system zwolnił uchwyt do pliku
            time.sleep(0.1) 

            # 3. Zawsze usuwamy plik wejściowy, żeby oszczędzić miejsce na Raspberry Pi
            if os.path.exists(event.src_path):
                os.remove(event.src_path)
                print(f"Successfully removed: {event.src_path}")

        except Exception as e:
            print(f"Błąd podczas przetwarzania pliku {event.src_path}: {e}")

if __name__ == "__main__":
    event_handler = BirdWatchHandler()
    observer = Observer()
    observer.schedule(event_handler, WATCH_PATH, recursive=False)
    observer.start()
    
    print(f"Watching directory: {WATCH_PATH}\nPress Ctrl+C to exit.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n\nUser exit.")
    
    observer.join()