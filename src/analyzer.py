import os
import time
import json
from log_reader import segment_audio_parts
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from birdnetlib import Recording
from birdnetlib.analyzer import Analyzer
from dotenv import load_dotenv

load_dotenv() 

LAT = float(os.getenv("LATITUDE", "0.0"))
LON = float(os.getenv("LONGITUDE", "0.0"))


BASE_DIR = os.path.join(os.path.expanduser("~"), "Systemy_Wbudowane/Embedded-Bird-Classifier")
OUTPUT_DIR = os.path.join(BASE_DIR, "running/analizing_results")
WATCH_PATH = os.path.join(BASE_DIR, "running/new_audio_samples")
BASE_AUDIO_DIR = os.path.join(BASE_DIR, "running/saved_audio_samples")

analyzer = Analyzer()
now = datetime.now()

# Creating folder for audio recordings from this session
SESSION_WAV_DIR = os.path.join(BASE_AUDIO_DIR, now.strftime('%Y-%m-%d_%H-%M-%S'))
os.makedirs(SESSION_WAV_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

file_path = os.path.join(OUTPUT_DIR, f"analysis_{now.strftime('%Y-%m-%d_%H-%M-%S')}.json")

class BirdWatchHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory or not event.src_path.lower().endswith(".wav"):
            return

        # Waiting a moment for the recorder to finish writing the file
        time.sleep(1) 
        
        print(f"Analyzing: {event.src_path}")
        try:
            recording = Recording(analyzer, event.src_path, lat=LAT, lon=LON)
            recording.analyze()

            if recording.detections:
                print(f"Detected: {len(recording.detections)} birds")
                
                # Creating a JSON file ONLY if there are detections and it doesn't exist yet
                if not os.path.exists(file_path):
                    with open(file_path, "w", encoding="utf-8") as f:
                        json.dump([], f)

                record_data = {
                    "timestamp": os.path.basename(event.src_path)[6:-4],
                    "file": os.path.basename(event.src_path),
                    "detections": recording.detections
                }

                with open(file_path, "r+", encoding="utf-8") as f:
                    data = json.load(f)
                    data.append(record_data)
                    f.seek(0)
                    json.dump(data, f, indent=4, ensure_ascii=False)
                    f.truncate()

                segment_audio_parts(recording.detections, event.src_path, SESSION_WAV_DIR, f"{os.path.basename(event.src_path)[:-4]}")
            
            print(f"Finished: {event.src_path} (Keep file)")

        except Exception as e:
            print(f"Error analyzing: {e}")

if __name__ == "__main__":
    event_handler = BirdWatchHandler()
    observer = Observer()
    observer.schedule(event_handler, WATCH_PATH, recursive=False)
    observer.start()
    print(f"Watcher started on: {WATCH_PATH}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()