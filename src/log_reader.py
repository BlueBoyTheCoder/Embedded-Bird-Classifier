from pydub import AudioSegment


def segmet_audio_part(audio_path, destination_folder_path, name, start_time, end_time):
    audio = AudioSegment.from_wav(audio_path)
    print(audio_path)

    fragment = audio[start_time * 1000 : end_time * 1000]

    fragment.export(f"{destination_folder_path}/{name}_{start_time}_{end_time}.wav", format="wav")


def segment_audio_parts(data, audio_path, destination_folder_path, name):
    last_start_time = -1
    index = 0
    for subdata in data:
        start_time, end_time = subdata['start_time'], subdata['end_time']
        if float(start_time) != last_start_time:
            segmet_audio_part(audio_path, destination_folder_path, name, float(start_time), float(end_time))
            last_start_time = float(start_time)
            index+=1