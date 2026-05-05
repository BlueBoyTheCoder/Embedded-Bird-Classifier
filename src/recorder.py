import os
import time
import argparse
from datetime import datetime
import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write

FOLDER_AUDIO = "./running/new_audio_samples"
RECORDING_DURATION = 9
BAR_LENGTH = 40


def find_device_id(fragment_name):
    """Searches for a device by name or substring and returns its ID."""
    devices = sd.query_devices()
    
    # Check for valid input channels
    for i, dev in enumerate(devices):
        if fragment_name.lower() in dev["name"].lower() and dev["max_input_channels"] > 0:
            return i, dev["name"]
            
    return None, None


def select_device_interactive():
    """Lists available input devices and prompts the user to choose one."""
    devices = sd.query_devices()
    valid_devices = []
    
    print("\nAvailable Input Devices:")
    for i, dev in enumerate(devices):
        if dev["max_input_channels"] > 0:
            print(f"ID: {i} | Name: {dev['name']}")
            valid_devices.append(i)
            
    if not valid_devices:
        print("Error: No input devices detected.")
        return None, None
        
    while True:
        try:
            choice = input("\nEnter the ID of the microphone you want to use: ")
            selected_id = int(choice)
            if selected_id in valid_devices:
                return selected_id, devices[selected_id]["name"]
            else:
                print("Invalid ID. Please choose from the list above.")
        except ValueError:
            print("Please enter a valid integer.")


def record(device_id):
    """Records audio from the specified device ID."""
    samplerate = 48000 
    channels = 1

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(FOLDER_AUDIO, f"audio_{timestamp}.wav")
    recording_buffer = []

    def callback(indata, frames, time_info, status):
        volume_norm = np.linalg.norm(indata) * 20 / np.sqrt(len(indata))
        recording_buffer.append(indata.copy())
        
        level = min(int(volume_norm * BAR_LENGTH), BAR_LENGTH)
        bar = "█" * level + "-" * (BAR_LENGTH - level)
        print(f"\rRecording (ID:{device_id}): [{bar}]", end="", flush=True)

    try:
        with sd.InputStream(
            samplerate=samplerate,
            channels=channels,
            callback=callback,
            device=device_id,
        ):
            time.sleep(RECORDING_DURATION)

        full_recording = np.concatenate(recording_buffer, axis=0)
        write(file_path, samplerate, full_recording)
        print(f"\nSaved: {file_path}")
        
    except Exception as e:
        print(f"\nStream error on ID {device_id}: {e}")
        time.sleep(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audio Recording Script")
    parser.add_argument(
        "-m", 
        "--microphone", 
        type=str, 
        default=None, 
        help="Name or part of the microphone's name to use"
    )
    args = parser.parse_args()

    device_id = None
    device_name = None

    if args.microphone:
        device_id, device_name = find_device_id(args.microphone)

    # If the provided name wasn't found or wasn't provided, launch interactive selection
    if device_id is None:
        device_id, device_name = select_device_interactive()
        if device_id is None:
            exit(1)

    print(f"\nUsing microphone: {device_name} (ID: {device_id})\nPress Ctrl+C to exit.")

    try:
        while True:
            record(device_id)
    except KeyboardInterrupt:
        print("\n\nExiting program.")