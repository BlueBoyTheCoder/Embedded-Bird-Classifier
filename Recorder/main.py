import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write
import os
import time
from datetime import datetime

# --- KONFIGURACJA ---
NAZWA_MIKROFONU = "C-Media USB Headphone Set"
FOLDER_AUDIO = "recordings"
CZAS_NAGRANIA = 20
PRZERWA = 0
DLUGOSC_PASKA = 40

if not os.path.exists(FOLDER_AUDIO):
    os.makedirs(FOLDER_AUDIO)

def znajdz_stabilne_id(fragment_nazwy):
    """Szuka urządzenia MME lub DirectSound (zazwyczaj niskie ID), ignorując WDM-KS."""
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        # Szukamy urządzenia, które ma wejścia i pasuje do nazwy
        if fragment_nazwy.lower() in dev['name'].lower() and dev['max_input_channels'] > 0:
            # POMIJAMY WDM-KS, jeśli to możliwe
            if "WDM-KS" not in dev['name']:
                return i
    # Jeśli nie znaleziono bez WDM-KS, bierzemy co jest
    for i, dev in enumerate(devices):
        if fragment_nazwy.lower() in dev['name'].lower() and dev['max_input_channels'] > 0:
            return i
    return None

def nagraj_z_podgladem():
    id_urzadzenia = znajdz_stabilne_id(NAZWA_MIKROFONU)
    
    if id_urzadzenia is None:
        print(f"\rBłąd: Nie znaleziono mikrofonu '{NAZWA_MIKROFONU}'", end="")
        return

    samplerate = 48000 
    channels = 1

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    sciezka_pliku = os.path.join(FOLDER_AUDIO, f"audio_{timestamp}.wav")
    recording = []

    def callback(indata, frames, time_info, status):
        volume_norm = np.linalg.norm(indata) * 20 / np.sqrt(len(indata))
        recording.append(indata.copy())
        poziom = min(int(volume_norm * DLUGOSC_PASKA), DLUGOSC_PASKA)
        bar = "█" * poziom + "-" * (DLUGOSC_PASKA - poziom)
        print(f"\rNagrywanie (ID:{id_urzadzenia}): [{bar}]", end="", flush=True)

    try:
        with sd.InputStream(samplerate=samplerate, 
                            channels=channels, 
                            callback=callback, 
                            device=id_urzadzenia):
            time.sleep(CZAS_NAGRANIA)

        full_recording = np.concatenate(recording, axis=0)
        write(sciezka_pliku, samplerate, full_recording)
        print(f"\nZapisano: {sciezka_pliku}")
    except Exception as e:
        print(f"\nBłąd strumienia na ID {id_urzadzenia}: {e}")
        time.sleep(1)

# Główna pętla
try:
    print(f"Szukam mikrofonu: {NAZWA_MIKROFONU}...")
    while True:
        nagraj_z_podgladem()
except KeyboardInterrupt:
    print("\n\nZatrzymano przez użytkownika.")