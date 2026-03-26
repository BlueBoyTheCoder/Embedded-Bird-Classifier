from pydub import AudioSegment

def read_log(filename = "plik.txt"):
    with open(filename, "r", encoding="utf-8") as f:
        data = {}
        labels = []
        for label in f.readline().split("\t"):
            data[label] = []
            labels.append(label)

        for line in f:
            for i, value in enumerate(line.strip().split("\t")):
                data[labels[i]].append(value)
    
    return strip_data(data)

def strip_data(data):
    new_data = {}
    new_keys = ["start_time", "end_time", "name", "confidence", "path"]
    old_keys = ["Begin Time (s)", "End Time (s)", "Common Name", "Confidence", "Begin Path"]
    for new_key, old_key in zip(new_keys, old_keys):
        new_data[new_key] = data[old_key]

    return new_data


def segmet_audio_part(audio_path, destination_folder_path, name, start_time, end_time):
    audio = AudioSegment.from_wav(audio_path)
    print(audio_path)

    fragment = audio[start_time * 1000 : end_time * 1000]

    fragment.export(destination_folder_path + "\\" + audio_path[:-4].replace("\\","+") + "-" + str(start_time) + "-" + str(end_time) + "-" + name + ".wav", format="wav")