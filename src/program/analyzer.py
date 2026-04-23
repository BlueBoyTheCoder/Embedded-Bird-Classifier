from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from birdnetlib import Recording
from birdnetlib.analyzer import Analyzer
import datetime, os, time, json


output_dir = "running/analizing_results"


analyzer = Analyzer() 

now = datetime.datetime.now()

file_name = f"analysis_{now.strftime('%Y-%m-%d_%H-%M-%S')}.json"
file_path = os.path.join(output_dir, file_name)

data = {}

try:
    os.makedirs(output_dir, exist_ok=True)
    print(f"Folder '{output_dir}' created")
except OSError as e:
    print(f"ERROR: Folder creation error: {e}")


class BirdWatchHandler(FileSystemEventHandler):
    def on_created(self, event):
        now = datetime.datetime.now()
        logname = now.strftime("%Y-%m-%d_%H-%M-%S-%f")
        if not event.is_directory and event.src_path.endswith(('.wav')):
            print(f"Analyzing: {event.src_path}")
            
            recording = Recording(analyzer, event.src_path, lat=52.2, lon=21.0)
            recording.analyze()
            
            data[logname] = recording.detections
            with open(file_path, 'w', encoding='utf-8') as file:
                json.dump(data, file, indent=4, ensure_ascii=False)

            os.remove(event.src_path)
            print(f"Got results for: {event.src_path}")

if __name__ == "__main__":
    path = "./running/new_audio_samples"
    event_handler = BirdWatchHandler()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()