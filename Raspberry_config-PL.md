<p align="center">🇬🇧 <b>English:</b> <a href="README.md">Documentation</a> • <a href="Raspberry_config.md">Configuration</a> │ 🇵🇱 <b>Polski:</b> <a href="README.pl.md">Dokumentacja</a> • <a href="Raspberry_config-PL.md">Konfiguracja</a></p>

---

# Dokumentacja Wdrożeniowa: Embedded Bird Classifier

**Platforma:** Raspberry Pi 4  
**OS:** Raspberry Pi OS (64-bit)  
**Katalog roboczy:** `/home/user/bird_classifier`  
**Użytkownik:** `user`

---

## Faza 1: Przygotowanie Systemu Operacyjnego

Wykonaj poniższe komendy w terminalu Raspberry Pi w celu instalacji pakietów binarnych, czyszczenia uprawnień i ujednolicenia formatów plików tekstowych:

```bash
# 1.1. Aktualizacja i instalacja zależności systemowych
sudo apt update && sudo apt upgrade -y
sudo apt install libportaudio2 ffmpeg samba samba-common-bin dos2unix -y

# 1.2. Naprawa uprawnień i przywrócenie własności katalogu użytkownikowi 'user'
sudo chown -R user:user /home/user/bird_classifier

# 1.3. Nadanie praw do wykonywania skryptów startowych
chmod +x /home/user/bird_classifier/run.sh
chmod +x /home/user/bird_classifier/setup.sh

# 1.4. Konwersja formatowania na standard uniksowy (usuwanie błędów CRLF ze środowiska Windows)
sudo dos2unix /home/user/bird_classifier/run.sh
sudo dos2unix /home/user/bird_classifier/setup.sh
```

---

## Faza 2: Środowisko Python i Konfiguracja Audio

Przygotuj niezależny kontener `venv` z bibliotekami i pobierz identyfikator sprzętowy swojej karty USB:

```bash
# 2.1. Konfiguracja wirtualnego środowiska (venv)
cd /home/user/bird_classifier
python3 -m venv venv
source venv/bin/activate

# 2.2. Instalacja zależności Pythona z pliku wymagań
pip install -r requirements.txt

# 2.3. Identyfikacja podłączonego mikrofonu USB
python3 -c "import sounddevice as sd; print(sd.query_devices())"
```

*Znajdź na wyświetlonej liście swój mikrofon (np. "USB Audio Device") i zanotuj jego nazwę lub numer indeksu.*

---

## Faza 3: Aktualizacja Konfiguracji Mikrofonu

Otwórz skrypt rozruchowy w edytorze tekstowym Nano:

```bash
nano /home/user/bird_classifier/run.sh
```

Zmień wartość zmiennej `RECORDER_ARGS` na identyfikator odczytany w poprzednim kroku:

```bash
RECORDER_ARGS="-m <twój_zidentyfikowany_mikrofon>"
```

*Zapisz plik kombinacją klawiszy: `Ctrl+O`, zatwierdź `Enter`, wyjdź za pomocą `Ctrl+X`.*

---

## Faza 4: Konfiguracja Usług Sieciowych i Energii

Zabezpiecz system przed usypianiem interfejsów sieciowych oraz skonfiguruj Hotspot i Sambę.

```bash
# 4.1. Całkowita blokada usypiania (Zarządzanie energią)
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# 4.2. Utworzenie stałego Hotspotu Wi-Fi
sudo nmcli device wifi hotspot ifname wlan0 ssid DrzewoBirdNET password HasloDoDrzewa
sudo nmcli connection modify Hotspot connection.autoconnect yes
```

### 4.3. Konfiguracja Serwera Samba (Dostęp dla Windows)
Otwórz plik konfiguracyjny Samby:
```bash
sudo nano /etc/samba/smb.conf
```

Na samym dole pliku dopisz blok konfiguracji udostępniania katalogu:
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

Zapisz plik (`Ctrl+O`, `Enter`, `Ctrl+X`), a następnie ustaw hasło sieciowe dla użytkownika i zrestartuj usługę:
```bash
sudo smbpasswd -a user
sudo systemctl restart smbd
```

---

## Faza 5: Autostart Klasyfikatora (Usługa systemd)

Zarejestruj skrypt startowy jako serwis systemowy uruchamiany w tle zaraz po bootowaniu urządzenia.

1. Utwórz plik konfiguracyjny usługi:
```bash
sudo nano /etc/systemd/system/birdnet.service
```

2. Wklej kompletną konfigurację demona startowego:
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

3. Zapisz zmiany (`Ctrl+O`, `Enter`, `Ctrl+X`), przeładuj konfigurację i aktywuj usługę:
```bash
sudo systemctl daemon-reload
sudo systemctl enable birdnet.service
sudo systemctl start birdnet.service
```

---

## Zarządzanie i Diagnostyka SSH

Użyj poniższych komend w terminalu do kontroli działania urządzenia:

* **Sprawdzenie statusu aplikacji:** `sudo systemctl status birdnet.service`
* **Podgląd działania na żywo (logi nasłuchu):** `journalctl -u birdnet.service -f`
* **Zrestartowanie klasyfikatora:** `sudo systemctl restart birdnet.service`
* **Bezpieczne wyłączenie zasilania:** `sudo shutdown -h now`
