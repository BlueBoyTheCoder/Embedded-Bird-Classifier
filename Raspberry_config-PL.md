# Dokumentacja Wdrożeniowa: Embedded Bird Classifier

**Platforma:** Raspberry Pi 4  
**OS:** Raspberry Pi OS (64-bit)  
**Katalog roboczy:** `/home/user/bird_classifier`  
**Użytkownik:** `user`

---

## Faza 1: Przygotowanie Systemu Operacyjnego

### 1.1. Aktualizacja i instalacja zależności systemowych

Na początek należy zaktualizować system oraz zainstalować wymagane sterowniki audio, narzędzia do konwersji, serwer plików oraz narzędzie do naprawy formatowania plików tekstowych:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install libportaudio2 ffmpeg samba samba-common-bin dos2unix -y
```

### 1.2. Naprawa uprawnień i formatowania plików

Pliki przeniesione z systemu Windows mogą posiadać niewidoczne znaki końca linii (CRLF), które uniemożliwiają ich uruchomienie w systemie Linux (błąd `status=2`). Należy naprawić kodowanie oraz nadać uprawnienia do wykonywania:

```bash
# Przejęcie własności nad plikami przez użytkownika 'user'
sudo chown -R user:user /home/user/bird_classifier

# Nadanie praw do wykonywania skryptów
chmod +x /home/user/bird_classifier/run.sh
chmod +x /home/user/bird_classifier/setup.sh

# Konwersja formatowania na standard uniksowy
sudo dos2unix /home/user/bird_classifier/run.sh
sudo dos2unix /home/user/bird_classifier/setup.sh
```

---

## Faza 2: Środowisko Python i Mikrofon

### 2.1. Konfiguracja wirtualnego środowiska (venv)

Utworzenie izolowanego środowiska i instalacja bibliotek AI:

```bash
cd /home/user/bird_classifier
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2.2. Identyfikacja mikrofonu USB

Aby skrypt nie oczekiwał na interakcję z klawiaturą, należy przypisać mikrofon na sztywno. Będąc w środowisku wirtualnym (`venv`), wykonaj:

```bash
python3 -c "import sounddevice as sd; print(sd.query_devices())"
```

_Znajdź na liście swój mikrofon (np. "USB Audio Device") i zapamiętaj jego unikalny człon nazwy. Użyjemy go w kolejnym kroku._

---

## Faza 3: Skrypt Uruchomieniowy (`run.sh`)

Zmodyfikuj główny plik `run.sh`, aby:

1. Zawsze uruchamiał się w poprawnym katalogu (niezależnie od tego, skąd wywoła go system).
2. Obsługiwał zidentyfikowany wcześniej mikrofon (zmień wartość `RECORDER_ARGS`).
3. Uruchamiał w tle lokalny serwer WWW do pobierania plików.

Otwórz edytor:

```bash
nano /home/user/bird_classifier/run.sh
```

Wklej poniższy, kompletny kod:

```bash
#!/bin/bash

# Ustawienie poprawnego katalogu roboczego
cd "$(dirname "$0")"

./setup.sh

source venv/bin/activate

ANALYZER="src/analyzer.py"
RECORDER="src/recorder.py"
# TUTAJ ZMIEŃ NAZWĘ NA SWÓJ MIKROFON Z KROKU 2.2 (zamiast "USB"):
RECORDER_ARGS="-m USB"

echo "Running: $ANALYZER, $RECORDER $RECORDER_ARGS..."

python "$ANALYZER" &
PID1=$!

python "$RECORDER" $RECORDER_ARGS &
PID2=$!

# Uruchomienie serwera WWW na porcie 8000 w katalogu głównym projektu
python -m http.server 8000 &
PID_SERVER=$!

echo "Press [CTRL+C] to stop the programs"

function finish {
    echo -e "\nClosing programs..."
    kill $PID1 $PID2 $PID_SERVER 2>/dev/null
    wait $PID1 $PID2 $PID_SERVER 2>/dev/null
    echo "Programs closed"
    exit 0
}

trap finish SIGINT

while true; do
    sleep 1
done
```

_Zapisz plik: `Ctrl+O`, `Enter`, `Ctrl+X`._

---

## Faza 4: Konfiguracja Usług i Sieci (Tryb "Leśny")

### 4.1. Całkowita blokada usypiania (Zarządzanie energią)

Zapobieganie wchodzeniu systemu i karty sieciowej w stan oszczędzania energii:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

### 4.2. Utworzenie stałego Hotspotu Wi-Fi

Raspberry będzie od teraz emitować własną sieć (niezbędną do komunikacji w terenie). Ustawienie flagi `autoconnect` gwarantuje start sieci przy każdym uruchomieniu zasilania.

```bash
sudo nmcli device wifi hotspot ifname wlan0 ssid DrzewoBirdNET password HasloDoDrzewa
sudo nmcli connection modify Hotspot connection.autoconnect yes
```

### 4.3. Konfiguracja Serwera Samba (Dostęp dla Windows)

Umożliwienie natywnego przeglądania plików poprzez Eksplorator Windows.

Otwórz plik konfiguracyjny:

```bash
sudo nano /etc/samba/smb.conf
```

Na samym dole pliku dodaj:

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

Zapisz plik, a następnie ustaw hasło (zalecane: to samo co do logowania) i zrestartuj usługę:

```bash
sudo smbpasswd -a user
sudo systemctl restart smbd
```

---

## Faza 5: Autostart Klasyfikatora (Usługa systemd)

Konfiguracja automatycznego uruchamiania programu `run.sh` po podłączeniu powerbanka.

1. Utwórz plik usługi:

```bash
sudo nano /etc/systemd/system/birdnet.service
```

2. Wklej poniższy kod:

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

3. Zapisz plik i uruchom usługę na stałe:

```bash
sudo systemctl daemon-reload
sudo systemctl enable birdnet.service
sudo systemctl start birdnet.service
```

---

## Instrukcja Obsługi Terenowej

Po umieszczeniu urządzenia w docelowej lokalizacji i podłączeniu zasilania, system uruchamia się i rozpoczyna działanie autonomiczne. Do interakcji użyj komputera lub telefonu.

**Krok 1:** Połącz się z siecią Wi-Fi: `DrzewoBirdNET` (Hasło: `HasloDoDrzewa`). Zignoruj ostrzeżenie o braku internetu.

### Dostęp do danych (Opcje do wyboru):

- **Przez Przeglądarkę (Szybki podgląd i pobieranie):**
  Otwórz Chrome/Edge i wejdź na adres: `http://10.42.0.1:8000`
- **Przez Eksplorator Windows (Zarządzanie i usuwanie plików):**
  W pasku adresu dowolnego folderu wpisz: `\\10.42.0.1\Raspberry` (Zaloguj się danymi użytkownika `user`).
- **Przez SSH (Zaawansowane sterowanie / Terminal):**
  Otwórz PowerShell i wpisz: `ssh user@10.42.0.1`

### Przydatne komendy SSH:

- Sprawdzenie statusu aplikacji: `sudo systemctl status birdnet.service`
- Podgląd działania na żywo (logi nasłuchu): `journalctl -u birdnet.service -f`
- Bezpieczne wyłączenie zasilania: `sudo shutdown -h now`
