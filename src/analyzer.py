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

file_name = f"analysis_{now.strftime('%Y-%m-%d_%H-%M-%S')}.json"
file_path = os.path.join(OUTPUT_DIR, file_name)

if not os.path.exists(file_path):
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump([], file)



class BirdWatchHandler(FileSystemEventHandler):
    def on_created(self, event):
        now = datetime.now()
        logname = now.strftime("%Y-%m-%d_%H-%M-%S-%f")

        if not event.is_directory and event.src_path.endswith((".wav")):
            print(f"Analyzing: {event.src_path}")

            recording = Recording(analyzer, event.src_path, lat=52.2, lon=21.0)
            recording.analyze()

            record_data = {
                "timestamp": logname,
                "detections": recording.detections
            }



            # Odczyt i aktualizacja pliku JSON
            try:
                with open(file_path, "r+", encoding="utf-8") as file:
                    # Przejdź na koniec pliku, aby cofnąć zamykający nawias ]
                    file.seek(0, os.SEEK_END)
                    pos = file.tell()

                    # Szukamy ostatniego znaku ']' cofając się od końca
                    while pos > 0:
                        pos -= 1
                        file.seek(pos)
                        char = file.read(1)
                        if char == "]":
                            break

                    # Obcinamy plik tak, aby usunąć znak ']'
                    file.seek(pos)
                    file.truncate()

                    # Jeśli plik nie jest pusty (zawiera już jakieś obiekty), dodajemy przecinek
                    if pos > 2:  # 2 bajty to `[]`
                        file.write(",\n")
                    else:
                        file.write("\n")

                    # Zapisujemy nowy obiekt i zamykamy tablicę
                    json.dump(record_data, file, indent=4, ensure_ascii=False)
                    file.write("\n]")

            except Exception as e:
                print(f"Błąd podczas dopisywania do JSON: {e}")
            print(recording.detections)
            segment_audio_parts(recording.detections, event.src_path, OUTPUT_WAV_DIR, logname)

            os.remove(event.src_path)
            print(f"Got results for: {event.src_path}")


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