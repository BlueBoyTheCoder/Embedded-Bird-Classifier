from src.program.log_reader import *

data = read_log("running/log_files/def.BirdNET.selection.table.txt")

for key, val in data.items():
    print(key, val)


keys = ["start_time", "end_time", "name", "confidence", "path"]

for start_time, end_time, name, confidence, path in zip(*(data[k] for k in keys)):

    segmet_audio_part(path, "running/cut_audio_samples", name, float(start_time), float(end_time))