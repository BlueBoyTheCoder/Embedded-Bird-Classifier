# Deployment Documentation: Embedded Bird Classifier

**Platform:** Raspberry Pi 4  
**OS:** Raspberry Pi OS (64-bit)  
**Working Directory:** `/home/user/bird_classifier`  
**User:** `user`

---

## Phase 1: Operating System Preparation

### 1.1. System update and dependencies installation

First, update the system and install the required audio drivers, audio processing tools, file server, and text formatting repair tool:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install libportaudio2 ffmpeg samba samba-common-bin dos2unix -y
```

### 1.2. Fixing file permissions and formatting

Files transferred from a Windows system might contain hidden end-of-line characters (CRLF) that prevent them from running in Linux (`status=2` error). You need to fix the encoding and grant execution permissions:

```bash
# Take ownership of the files by the 'user' account
sudo chown -R user:user /home/user/bird_classifier

# Grant execution rights to the scripts
chmod +x /home/user/bird_classifier/run.sh
chmod +x /home/user/bird_classifier/setup.sh

# Convert formatting to UNIX standard
sudo dos2unix /home/user/bird_classifier/run.sh
sudo dos2unix /home/user/bird_classifier/setup.sh
```

---

## Phase 2: Python Environment and Microphone

### 2.1. Virtual environment (venv) configuration

Create an isolated environment and install the necessary libraries (including AI models):

```bash
cd /home/user/bird_classifier
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2.2. USB Microphone identification

To prevent the script from waiting for keyboard interaction, the microphone must be hardcoded. While inside the virtual environment (`venv`), run:

```bash
python3 -c "import sounddevice as sd; print(sd.query_devices())"
```

_Find your microphone on the list (e.g., "USB Audio Device") and remember its unique name segment. We will use it in the next step._

---

## Phase 3: Startup Script (`run.sh`)

Modify the main `run.sh` file so that it:

1. Always runs in the correct directory (regardless of where the system calls it from).
2. Uses the previously identified microphone (change the `RECORDER_ARGS` value).
3. Runs a local HTTP server in the background for file downloading.

Open the editor:

```bash
nano /home/user/bird_classifier/run.sh
```

Paste the following complete code:

```bash
#!/bin/bash

# Set correct working directory
cd "$(dirname "$0")"

./setup.sh

source venv/bin/activate

ANALYZER="src/analyzer.py"
RECORDER="src/recorder.py"
# CHANGE THE NAME TO YOUR MICROPHONE FROM STEP 2.2 HERE (instead of "USB"):
RECORDER_ARGS="-m USB"

echo "Running: $ANALYZER, $RECORDER $RECORDER_ARGS..."

python "$ANALYZER" &
PID1=$!

python "$RECORDER" $RECORDER_ARGS &
PID2=$!

# Start the HTTP server on port 8000 in the main project directory
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

_Save the file: `Ctrl+O`, `Enter`, `Ctrl+X`._

---

## Phase 4: Services and Network Configuration ("Forest" Mode)

### 4.1. Complete sleep lock (Power Management)

Prevent the system and network card from entering power-saving states:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

### 4.2. Creating a persistent Wi-Fi Hotspot

The Raspberry Pi will now broadcast its own network (necessary for field communication). Setting the `autoconnect` flag guarantees the network will start upon every power-up.

```bash
sudo nmcli device wifi hotspot ifname wlan0 ssid DrzewoBirdNET password HasloDoDrzewa
sudo nmcli connection modify Hotspot connection.autoconnect yes
```

### 4.3. Samba Server Configuration (Windows Access)

Enable native file browsing through Windows Explorer.

Open the configuration file:

```bash
sudo nano /etc/samba/smb.conf
```

At the very bottom of the file, add:

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

Save the file, then set a password (recommended: same as your login password) and restart the service:

```bash
sudo smbpasswd -a user
sudo systemctl restart smbd
```

---

## Phase 5: Classifier Autostart (systemd service)

Configure the automatic execution of the `run.sh` program when a powerbank is connected.

1. Create the service file:

```bash
sudo nano /etc/systemd/system/birdnet.service
```

2. Paste the following code:

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

3. Save the file and enable the service permanently:

```bash
sudo systemctl daemon-reload
sudo systemctl enable birdnet.service
sudo systemctl start birdnet.service
```

---

## Field Operation Manual

After placing the device in the target location and connecting the power supply, the system will boot and begin autonomous operation. Use a computer or smartphone to interact.

**Step 1:** Connect to the Wi-Fi network: `DrzewoBirdNET` (Password: `HasloDoDrzewa`). Ignore the "no internet connection" warning.

### Data Access (Choose an option):

- **Via Web Browser (Quick preview and download):**
  Open Chrome/Edge and go to: `http://10.42.0.1:8000`
- **Via Windows Explorer (Manage and delete files):**
  In the address bar of any folder, type: `\\10.42.0.1\Raspberry` (Log in with `user` credentials).
- **Via SSH (Advanced control / Terminal):**
  Open PowerShell and type: `ssh user@10.42.0.1`

### Useful SSH commands:

- Check application status: `sudo systemctl status birdnet.service`
- Live monitoring (listening logs): `journalctl -u birdnet.service -f`
- Safely power off the device: `sudo shutdown -h now`
