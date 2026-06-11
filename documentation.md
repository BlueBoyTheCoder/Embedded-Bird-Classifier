# Dokumentacja Techniczna i Projektowa: Embedded Bird Classifier

**Autorzy projektu:** Emil Siatka, Mateusz Szwagierczak  
**Data wydania:** Czerwiec 2026 r.  
**Wersja systemu:** 1.0.0  
**Platforma bazowa:** Raspberry Pi 4 Model B (2GB RAM)  
**System operacyjny:** Raspberry Pi OS (64-bit, Debian Bookworm based)

---

## 1. Wstęp i Cel Projektu

Projekt **Embedded Bird Classifier** to autonomiczne urządzenie wbudowane przeznaczone do stałego nagrywania dźwięków otoczenia i automatycznego rozpoznawania gatunków ptaków. System został zaprojektowany do pracy w trudnych warunkach terenowych, bez dostępu do sieci internetowej oraz stałego zasilania z gniazdka.

### Główne założenia funkcjonalne:

- Cykliczne nagrywanie próbek dźwiękowych z otoczenia za pomocą podłączonego mikrofonu.
- Przetwarzanie i klasyfikacja nagrań w czasie rzeczywistym bezpośrednio na Raspberry Pi za pomocą modelu `BirdNet`.
-  Uruchomienie własnego Hotspot's, co pozwala na pobieranie danych i podgląd wyników na smartfonie lub komputerze bez użycia internetu.
- Zapisywanie pociętych próbek audio oraz logów w plikach JSON, z możliwością pobrania ich jako skompresowane archiwum ZIP i zdalnego czyszczenia pamięci flash.

---

## 2. Specyfikacja i Architektura Sprzętowa (Hardware)

Urządzenie ma budowę modułową opartą na łatwo dostępnych komponentach, co ułatwia szybkie zreplikowanie konstrukcji.

| Komponent | Model / Producent | Rola w systemie | Specyfikacja techniczna / Uwagi |
| :--- | :--- | :--- | :--- |
| **Jednostka centralna** | Raspberry Pi 4 Model B | Główny minikomputer, uruchamianie procesów, analiza audio, serwer API/WWW. | Broadcom BCM2711 (Quad-core Cortex-A72 @1.5GHz), 2GB RAM LPDDR4, wbudowane Wi-Fi 2.4/5.0 GHz. |
| **Układ zasilania** | Powerbank Xiaomi | Autonomiczne źródło energii, funkcja bufora UPS. | Wspiera jednoczesne ładowanie powerbanka i zasilanie minikomputera z zewnętrznego źródła (_pass-through charging_). |
| **Mikrofon** | Mikrofon krawatowy Esperanza | Przechwytywanie odgłosów ptaków z otoczenia. | Charakterystyka wielokierunkowa, pasmo przenoszenia dopasowane do rejestracji dźwięków natury. |
| **Karta dźwiękowa** | Karta dźwiękowa USB LogiLink | Zamiana sygnału analogowego z mikrofonu na cyfrowy. | Działa w standardzie Plug&Play w systemie Linux, dedykowane wejście mikrofonowe TRS 3.5 mm. |
| **Obudowa zewnętrzna** | Puszka elektroinstalacyjna S-BOX (Pawbol) | Ochrona komponentów przed deszczem i wilgocią. | Klasa szczelności IP65, wykonana z wytrzymałego polipropylenu. |

### Montaż i uszczelnienie:

Komponenty wewnątrz puszki S-BOX zostały unieruchomione przy użyciu kabli zasilających oraz trytytek, co zabezpiecza je przed przemieszczaniem się w trakcie transportu. Kabel mikrofonowy wyprowadzono na zewnątrz przez fabryczny przepust kablowy. Miejsce wyprowadzenia oraz łączenia obudowy uszczelniono klejem na gorąco, chroniąc wnętrze przed wilgocią. Na zewnątrz puszki mikrofon osłonięto perforowaną maskownicą ochronną.

#### Zdjęcia komponentów sprzętowych:

<p align="center">
  <img src="screens/box_outside.jpg" width="550" alt="Obudowa IP65 zewnętrzna" /><br>
  <sub><b>Rysunek 1:</b> Zamknięta obudowa S-BOX z wyprowadzonym na dole mikrofonem.</sub>
</p>

<p align="center">
  <img src="screens/box_inside.jpg" width="550" alt="Konfiguracja wnętrza" /><br>
  <sub><b>Rysunek 2:</b> Rozmieszczenie Raspberry Pi 4, powerbanka i karty dźwiękowej wewnątrz obudowy.</sub>
</p>

---

## 3. Architektura Oprogramowania i Stos Technologiczny

System składa się z niezależnych usług systemowych oraz modułów aplikacyjnych, które współpracują ze sobą w tle.

### Stos Technologiczny (Tech Stack):

- **System Operacyjny:** Raspberry Pi OS (64-bit). Funkcje oszczędzania energii zostały wyłączone (`systemctl mask` dla acpi/sleep), aby urządzenie nie przechodziło w stan uśpienia w terenie.
- **Backend:** Python 3.11+ działający w środowisku wirtualnym (`venv`). Główne biblioteki: `FastAPI` (obsługa komunikacji z frontendem), `uvicorn` (serwer WWW), `birdnetlib` (obsługa modelu rozpoznawania BirdNet TensorFlow Lite), `watchdog` (automatyczne wykrywanie nowych plików audio), `sounddevice` i `scipy` (nagrywanie dźwięku i zapis do WAV), `pydub` (wycinanie fragmentów audio).
- **Frontend:** Aplikacja typu SPA zbudowana w `React` z użyciem narzędzia `Vite`. Wygląd ostylowano za pomocą `TailwindCSS`, ikony pochodzą z pakietu `Lucide React`, a wykresy generuje biblioteka `Recharts`.

### Struktura Katalogów Projektu:

```text
/home/user/bird_classifier/
├── autorun_logs.md                 # Logi diagnostyczne autostartu
├── bird_images/                    # Lokalna baza zdjęć ptaków do interfejsu
├── .env                            # Konfiguracja i zmienne środowiskowe
├── frontend/                       # Kod źródłowy aplikacji React (Vite)
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                 # Główny kod panelu użytkownika
│       ├── main.jsx
│       └── index.css
├── frontend.log                    # Logi działania serwera Vite
├── Raspberry_config-PL.md          # Instrukcja instalacji systemu
├── requirements.txt                # Lista bibliotek Pythona do zainstalowania
├── run.sh                          # Skrypt startowy uruchamiający wszystkie procesy
├── setup.sh                        # Skrypt do automatycznej konfiguracji malinki
├── src/                            # Skrypty backendowe (Core)
│   ├── __init__.py
│   ├── analyzer.py                 # Rozpoznawanie ptaków i wykrywanie nowych plików
│   ├── log_reader.py               # Wycinanie fragmentów audio (pydub)
│   ├── recorder.py                 # Ciągłe nagrywanie dźwięku z mikrofonu
│   └── server.py                   # Serwer FastAPI i przesyłanie plików na frontend
└── running/                        # Folder roboczy (Runtime)
    ├── export.zip                  # Tymczasowa paczka ZIP do pobrania
    ├── analizing_results/          # Pliki z wynikami rozpoznawania (JSON)
    ├── new_audio_samples/          # Bufor na surowe, 9-sekundowe pliki WAV
    └── saved_audio_samples/        # Foldery sesji z pociętymi próbkami audio
```

Poniższy zrzut ekranu przedstawia poprawnie skonstruowaną strukturę plików oraz nadane uprawnienia do uruchamiania skryptów `.sh`:

<p align="center">
  <img src="screens/project_catalog.png" width="550" alt="Katalog projektu" /><br>
  <sub><b>Rysunek 3:</b> Widok struktury plików i uprawnień wykonawczych w terminalu.</sub>
</p>

---

## 4. Przepływ Danych w Systemie (Data Flow)

Urządzenie przetwarza dane w sposób ciągły, według poniższego schematu:

```text
[ Otoczenie ]
      │ (Dźwięk analogowy)
      ▼
[ Mikrofon + Karta USB ] ──(48kHz PCM)──> [ src/recorder.py ]
                                                 │
                                                 ▼ (Zapis pliku audio_*.wav co 9 sek)
                                          [ running/new_audio_samples/ ]
                                                 │
                                                 ▼ (Wykrycie nowego pliku przez Watchdog)
                                          [ src/analyzer.py ]
                                                 │
                    ┌────────────────────────────┴────────────────────────────┐
                    ▼ (Analiza BirdNet TFLite)                                ▼ (Wycięcie fragmentu)
           [ Wyniki Klasyfikacji ]                                     [ src/log_reader.py ]
                    │                                                         │
                    ▼ (Zapis do pliku)                                        ▼ (Zapis małego pliku WAV)
     [ running/analizing_results/analysis_*.json ]               [ running/saved_audio_samples/[Sesja]/ ]
                    │                                                         │
                    └────────────────────────────┬────────────────────────────┘
                                                 ▼
                                         [ Serwer FastAPI ]
                                                 │
                                                 ▼ (Odbieranie danych przez HTTP)
                                      [ Panel Użytkownika (React) ]
```

1. **Nagrywanie dźwięku:** Skrypt `recorder.py` uruchamia nagrywanie z częstotliwością 48 kHz w trybie mono. Co 9 sekund zapisuje zawartość do pliku `audio_[TIMESTAMP].wav` w folderze tymczasowym `new_audio_samples`.
2. **Wykrywanie plików:** Skrypt `analyzer.py` za pomocą modułu `watchdog` czuwa nad folderem `new_audio_samples`. Gdy pojawi się tam nowy plik `.wav`, skrypt odczekuje sekundę (aby upewnić się, że plik zapisał się w całości), a następnie przekazuje go do analizy AI.
3. **Rozpoznawanie ptaków:** Biblioteka `BirdNetLib` uruchamia lokalny model TensorFlow Lite. Do analizy przekazywane są współrzędne geograficzne (domyślnie Warszawa: lat=52.2297, lon=21.0122), co pozwala odrzucić ptaki, które nie występują w naszym regionie i zwiększa dokładność rozpoznawania. Współrzędne można zmienić w pliku `.env`.
4. **Zapis i wycinanie próbek:** Jeśli model rozpozna ptaka z odpowiednią pewnością, dane trafiają do pliku `analysis_[SESJA].json`. Jednocześnie moduł `log_reader.py` (przy użyciu `pydub`) wycina z 9-sekundowego nagrania dokładnie ten moment, w którym ptak śpiewał, i zapisuje go jako osobny mały plik `.wav`.

Struktura pliku JSON zawiera pełne informacje o rozpoznanym gatunku oraz pewności predykcji:

<p align="center">
  <img src="screens/json_web.png" width="550" alt="Format JSON" /><br>
  <sub><b>Rysunek 4:</b> Widok struktury pliku JSON wysyłanego do aplikacji frontendowej.</sub>
</p>

5. **Wyświetlanie wyników:** Serwer FastAPI udostępnia endpointy API oraz pozwala na pobieranie plików. Panel użytkownika w React odpytuje serwer co 5 sekund, automatycznie odświeżając wykresy i listę nagrań na ekranie.

---

## 5. Implementacja Backend (Python)

### 5.1. `src/recorder.py`

Ten skrypt odpowiada za obsługę karty dźwiękowej USB i nagrywanie audio.

```python
# Mechanizm nagrywania dźwięku do bufora i zapisu na dysk
def record(device_id):
    samplerate = 48000
    channels = 1
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(FOLDER_AUDIO, f"audio_{timestamp}.wav")
    recording_buffer = []

    def callback(indata, frames, time_info, status):
        # Obliczanie głośności i wyświetlanie prostego paska VU w konsoli
        volume_norm = np.linalg.norm(indata) * 20 / np.sqrt(len(indata))
        recording_buffer.append(indata.copy())
        level = min(int(volume_norm * BAR_LENGTH), BAR_LENGTH)
        bar = "█" * level + "-" * (BAR_LENGTH - level)
        print(f"\rRecording (ID:{device_id}): [{bar}]", end="", flush=True)

    with sd.InputStream(samplerate=samplerate, channels=channels, callback=callback, device=device_id):
        time.sleep(RECORDING_DURATION)

    full_recording = np.concatenate(recording_buffer, axis=0)
    write(file_path, samplerate, full_recording)
```

### 5.2. `src/analyzer.py`

Główny skrypt odpowiedzialny za analizę audio i koordynację zapisu wyników.

```python
class BirdWatchHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory or not event.src_path.lower().endswith(".wav"):
            return

        time.sleep(1) # Czekamy na zakończenie zapisu pliku na karcie SD
        try:
            recording = Recording(analyzer, event.src_path, lat=52.2, lon=21.0)
            recording.analyze()

            if recording.detections:
                # Zapisywanie nowych wykryć na koniec pliku JSON
                if not os.path.exists(file_path):
                    with open(file_path, "w", encoding="utf-8") as f: json.dump([], f)

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

                # Wycięcie fragmentu audio z głosem ptaka
                segment_audio_parts(recording.detections, event.src_path, SESSION_WAV_DIR, f"{os.path.basename(event.src_path)[:-4]}")
        except Exception as e:
            print(f"Błąd analizy: {e}")
```

### 5.3. `src/server.py`

Serwer FastAPI udostępnia interfejs API dla aplikacji WWW, umożliwia pobranie spakowanych danych i czyszczenie karty pamięci.

- `GET /api/results`: Zwraca listę zapisanych sesji (plików `.json`), od najnowszych do najstarszych.
- `GET /api/export`: Pakuje w locie wszystkie wyniki i wycięte próbki audio do jednego archiwum ZIP, ułatwiając pobranie danych na raz.
- `DELETE /api/clear`: Usuwa całą zawartość folderów z wynikami i nagraniami z karty pamięci, przygotowując system na nową sesję pomiarową.

---

## 6. Interfejs Użytkownika (Frontend - React)

### Główne mechanizmy w `App.jsx`:

1. **Obsługa odświeżania w tle:** Użyto referencji `useRef`, aby uruchomiony interwał (`setInterval` co 5 sekund) zawsze wiedział, którą sesję użytkownik aktualnie przegląda. Zapobiega to resetowaniu widoku i migotaniu ekranu podczas automatycznego pobierania nowych danych.
2. **Przygotowanie danych do wykresu:** Funkcja `generateChartData` zlicza wystąpienia poszczególnych gatunków ptaków w wybranej sesji i przekazuje te dane do wykresu słupkowego `<BarChart>` z biblioteki `recharts`.
3. **Brak problemów z pamięcią podręczną:** Adresy URL plików audio i raportów JSON są uzupełniane o zmienną ze znacznikiem czasu (`?t=${new Date().getTime()}`). Dzięki temu przeglądarki na telefonach nie zapamiętują starych wersji plików i zawsze odtwarzają aktualne nagrania.

#### Wygląd panelu użytkownika:

<p align="center">
  <img src="screens/start_screen_web.png" width="550" alt="Ekran startowy" /><br>
  <sub><b>Rysunek 5:</b> Widok panelu głównego przed wybraniem sesji.</sub>
</p>

<p align="center">
  <img src="screens/birds_found_1.png" width="550" alt="Wykrycia stan 1" /><br>
  <sub><b>Rysunek 6:</b> Widok sesji z wykresem słupkowym i listą wykrytych ptaków.</sub>
</p>

<p align="center">
  <img src="screens/birds_found_2.png" width="550" alt="Wykrycia stan 2" /><br>
  <sub><b>Rysunek 7:</b> Wyświetlanie zdjęcia rozpoznanego gatunku z lokalnej bazy danych.</sub>
</p>

<p align="center">
  <img src="screens/widok_mobilny.png" width="280" alt="Widok mobilny" /><br>
  <sub><b>Rysunek 8:</b> Widok panelu zarządzania na ekranie smartfona.</sub>
</p>

---

## 7. Środowisko Systemowe, Autostart i Wdrożenie Terenowe

Urządzenie działa w pełni samodzielnie dzięki odpowiedniej konfiguracji usług systemowych i sieci na poziomie systemu operacyjnego Linux.

### 7.1. Konfiguracja sieci (Hotspot w terenie)

Za pomocą narzędzia NetworkManager (`nmcli`) karta Wi-Fi malinki (`wlan0`) została skonfigurowana jako punkt dostępowy:

```bash
sudo nmcli device wifi hotspot ifname wlan0 ssid DrzewoBirdNET password HasloDoDrzewa
sudo nmcli connection modify Hotspot connection.autoconnect yes
```

Malinka ma w tej sieci stały adres IP: `10.42.0.1`.

<p align="center">
  <img src="screens/connected_wifi.png" width="400" alt="Sieć wifi" /><br>
  <sub><b>Rysunek 9:</b> Połączenie z siecią Wi-Fi generowaną przez urządzenie.</sub>
</p>

### 7.2. Udostępnianie plików przez Sambę

Aby ułatwić bezpośredni dostęp do plików z komputera, skonfigurowano serwer Samba (`smbd`). W pliku `/etc/samba/smb.conf` dodano wpis:

```ini
[Raspberry]
   path = /home/user
   writeable = yes
   browseable = yes
   public = no
   create mask = 0644
   directory mask = 0755
   force user = user
```

Dzięki temu katalog domowy urządzenia można zamontować jako dysk sieciowy:

<p align="center">
  <img src="screens/samba_windows.png" width="550" alt="Samba Windows" /><br>
  <sub><b>Rysunek 10:</b> Dostęp do plików projektu z poziomu Eksploratora Windows.</sub>
</p>

### 7.3. Automatyczne uruchamianie procesów (Systemd)

Usługa `birdnet.service` dba o to, aby skrypt startowy `run.sh` włączał się samoczynnie od razu po uruchomieniu malinki (gdy tylko załadują się systemy audio i sieciowe), a także w razie błędu uruchamiał procesy ponownie.

Plik konfiguracyjny usługi (`/etc/systemd/system/birdnet.service`):

```ini
[Unit]
Description=Embedded Bird Classifier
After=network.target sound.target

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/bird_classifier
ExecStart=/bin/bash /home/user/bird_classifier/run.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Nagrania z poszczególnych dni są zapisywane w osobnych folderach, co ułatwia zachowanie porządku:

<p align="center">
  <img src="screens/logs_term.png" width="400" alt="Struktura logów terminal" /><br>
  <sub><b>Rysunek 11:</b> Wygląd struktury folderów sesji w oknie terminala.</sub>
</p>

---

## 8. Instrukcja Obsługi i Procedury Terenowe

### Krok 1: Uruchomienie i Połączenie

1. Podłącz urządzenie do powerbanka. Odczekaj około 40–60 sekund na uruchomienie systemu.
2. Na telefonie lub komputerze znajdź sieć Wi-Fi o nazwie **`DrzewoBirdNET`** i zaloguj się hasłem **`HasloDoDrzewa`**. Ignoruj komunikat o braku dostępu do internetu.

### Krok 2: Przeglądanie danych (Trzy sposoby)

- **Panel WWW (Zalecany):** Otwórz przeglądarkę i wpisz adres `http://10.42.0.1:5173`. Zobaczysz panel użytkownika, w którym z menu bocznego możesz wybrać interesującą Cię sesję, aby przeglądać wykresy i odsłuchiwać nagrania ptaków.
- **Eksplorator Windows:** Wpisz w pasek adresu managera plików: `\\10.42.0.1\Raspberry`. Po podaniu loginów użytkownika systemu (`user`), zyskasz bezpośredni dostęp do folderów na karcie pamięci.
- **Konsola (SSH):** Do celów diagnostycznych możesz połączyć się przez SSH: `ssh user@10.42.0.1`.

### Krok 3: Pobieranie danych i czyszczenie pamięci

Zarządzanie zapisanymi plikami odbywa się w lewym panelu aplikacji:

<p align="center">
  <img src="screens/delete_files.png" width="250" alt="Panel boczny pamięć" /><br>
  <sub><b>Rysunek 12:</b> Przyciski do pobierania i usuwania danych w menu bocznym.</sub>
</p>

1. Kliknij zielony przycisk **"Zgraj paczkę (ZIP)"**.
2. System przygotuje i pobierze spakowane archiwum na Twój telefon lub komputer:

<p align="center">
  <img src="screens/zip_downloaded.png" width="450" alt="Zgrana paczka zip" /><br>
  <sub><b>Rysunek 13:</b> Pobieranie wygenerowanej paczki ZIP w przeglądarce.</sub>
</p>

3. Po rozpakowaniu archiwum otrzymasz uporządkowaną strukturę plików z logami i nagraniami:

<p align="center">
  <img src="screens/zip_unpacked.png" width="550" alt="Rozpakowany zip" /><br>
  <sub><b>Rysunek 14:</b> Zawartość pobranej paczki ZIP po rozpakowaniu.</sub>
</p>

<p align="center">
  <img src="screens/zip_json_logs_windows.png" width="550" alt="Spis JSONów" /><br>
  <sub><b>Rysunek 15:</b> Zapisane pliki tekstowe JSON z wynikami analizy.</sub>
</p>

<p align="center">
  <img src="screens/zip_audio_catalog.png" width="550" alt="Katalogi audio" /><br>
  <sub><b>Rysunek 16:</b> Foldery z próbkami dźwiękowymi podzielone na daty.</sub>
</p>

<p align="center">
  <img src="screens/zip_audio_files.png" width="550" alt="Próbki WAV" /><br>
  <sub><b>Rysunek 17:</b> Wycięte, krótkie nagrania audio poszczególnych śpiewów ptaków.</sub>
</p>

4. Po upewnieniu się, że pliki zostały w całości zapisane na Twoim komputerze lub telefonie, kliknij czerwony przycisk **"Wyczyść Malinkę"** i potwierdź operację w oknie, które się pojawi:

<p align="center">
  <img src="screens/confirm_deleting.png" width="500" alt="Alert usunięcia" /><br>
  <sub><b>Rysunek 18:</b> Ostrzeżenie przed przypadkowym usunięciem plików.</sub>
</p>

<p align="center">
  <img src="screens/confirmation_deletion.png" width="500" alt="Potwierdzenie alertu" /><br>
  <sub><b>Rysunek 19:</b> Potwierdzenie pomyślnego usunięcia danych z urządzenia.</sub>
</p>

5. Karta pamięci zostanie wyczyszczona, a panel wróci do stanu początkowego (brak dostępnych sesji):

<p align="center">
  <img src="screens/deleted_files_web.png" width="550" alt="Pusty dashboard" /><br>
  <sub><b>Rysunek 20:</b> Widok pustego panelu użytkownika po wyczyszczeniu pamięci.</sub>
</p>

<p align="center">
  <img src="screens/deleted_files_term.png" width="400" alt="Czyste drzewo" /><br>
  <sub><b>Rysunek 21:</b> Widok pustej struktury folderów roboczych w terminalu.</sub>
</p>