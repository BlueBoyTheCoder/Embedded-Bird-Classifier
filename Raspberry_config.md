<p align="center">🇬🇧 <b>English:</b> <a href="README.md">Documentation</a> • <a href="Raspberry_config.md">Configuration</a> │ 🇵🇱 <b>Polski:</b> <a href="README.pl.md">Dokumentacja</a> • <a href="Raspberry_config-PL.md">Konfiguracja</a></p>

---

# Deployment Documentation: Embedded Bird Classifier

**Platform:** Raspberry Pi 4  
**OS:** Raspberry Pi OS (64-bit)  
**Working Directory:** `/home/user/bird_classifier`  
**User:** `user`

---

## Phase 1: Operating System Preparation

Execute the following commands in the Raspberry Pi terminal to install binary packages, fix permissions, and normalize text file formats:

```bash
# 1.1. Update and install system dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install libportaudio2 ffmpeg samba samba-common-bin dos2unix -y

# 1.2. Fix permissions and restore ownership of the project directory to user 'user'
sudo chown -R user:user /home/user/bird_classifier

# 1.3. Grant execution permissions to startup scripts
chmod +x /home/user/bird_classifier/run.sh
chmod +x /home/user/bird_classifier/setup.sh

# 1.4. Convert formatting to Unix standard (removing CRLF errors from Windows environment)
sudo dos2unix /home/user/bird_classifier/run.sh
sudo dos2unix /home/user/bird_classifier/setup.sh
```

---

## Phase 2: Python Environment and Audio Configuration

Set up an isolated `venv` container with libraries and retrieve the hardware ID of your USB sound card:

```bash
# 2.1. Configure virtual environment (venv)
cd /home/user/bird_classifier
python3 -m venv venv
source venv/bin/activate

# 2.2. Install Python dependencies from the requirements file
pip install -r requirements.txt

# 2.3. Identify the connected USB microphone
python3 -c "import sounddevice as sd; print(sd.query_devices())"
```

*Find your microphone (e.g., "USB Audio Device") in the displayed list and note its name or index number.*

---

## Phase 3: Updating Microphone Configuration

Open the startup script in the Nano text editor:

```bash
nano /home/user/bird_classifier/run.sh
```

Change the value of the `RECORDER_ARGS` variable to the identifier read in the previous step:

```bash
RECORDER_ARGS="-m <your_identified_microphone>"
```

*Save the file using `Ctrl+O`, confirm with `Enter`, and exit using `Ctrl+X`.*

---

## Phase 4: Network and Power Services Configuration

Completely prevent system interfaces from sleeping, and configure the Hotspot and Samba.

```bash
# 4.1. Completely disable sleep/suspend states (Power Management)
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# 4.2. Create a permanent Wi-Fi Hotspot
sudo nmcli device wifi hotspot ifname wlan0 ssid DrzewoBirdNET password HasloDoDrzewa
sudo nmcli connection modify Hotspot connection.autoconnect yes
```

### 4.3. Samba Server Configuration (Windows Access)
Open the Samba configuration file:
```bash
sudo nano /etc/samba/smb.conf
```

At the very bottom of the file, append the directory sharing configuration block:
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

Zapisz plik (`Ctrl+O`, `Enter`, `Ctrl+X`), then set a network password for the user and restart the service:
```bash
sudo smbpasswd -a user
sudo systemctl restart smbd
```

---

## Phase 5: Classifier Autostart (systemd service)

Register the startup script as a system service running in the background immediately after the device boots.

1. Create the service configuration file:
```bash
sudo nano /etc/systemd/system/birdnet.service
```

2. Paste the complete startup daemon configuration:
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

3. Save the changes (`Ctrl+O`, `Enter`, `Ctrl+X`), reload the configuration, and enable the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable birdnet.service
sudo systemctl start birdnet.service
```

---

## SSH Management and Diagnostics

Use the following commands in the terminal to monitor and control the device:

* **Check application status:** `sudo systemctl status birdnet.service`
* **View live logs (listening logs):** `journalctl -u birdnet.service -f`
* **Restart the classifier:** `sudo systemctl restart birdnet.service`
* **Safe shutdown:** `sudo shutdown -h now`