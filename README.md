# ESP32-CAM Vitals Analyzer & MicroPython Engineering Suite

A complete biomedical engineering platform, optical physics laboratory, and MicroPython firmware suite for physiological vital signs monitoring on the **AI-Thinker ESP32-CAM**.

---

## Verified Hardware Benchmark
* **Heart Rate Verification:** **62.5 – 62.6 BPM** on ESP32-CAM vs. **62 BPM** on automated reference smartwatch.
* **Firmware Runtime:** `micropython_camera_feeeb5ea3_esp32_idf4_4.bin` (MicroPython v1.18 with native I2S DMA camera driver).
* **Thermal Management:** Flash LED PWM duty set to `25` (~2.4% power) to eliminate heat buildup and prevent capillary blanching.

---

## Directory Structure

```
├── build/                 # Firmware binaries & automated esptool flashing scripts
│   ├── README.md
│   └── flash_esp32_firmware.sh
│
├── codes/                 # MicroPython production code files
│   ├── README.md
│   ├── main.py                          # Master Auto-Boot firmware (ESP32-CAM: HR + SpO2 + BP + LCD 1602)
│   ├── main_esp32_c3_supermini.py       # Master Auto-Boot firmware for ESP32-C3 SuperMini
│   ├── esp32_cam_heart_rate.py          # Standalone camera contact PPG (62.6 BPM verified)
│   ├── max30102_hr_spo2.py              # MAX30102 I2C driver for Heart Rate + SpO2
│   ├── max30102_lcd_monitor.py          # MAX30102 + LCD 1602 I2C monitor
│   └── ecg_ppg_ptt_blood_pressure.py    # AD8232 ECG + MAX30102 PPG for Blood Pressure (PTT)
│
├── windows_exe/           # Standalone 64-bit Windows Desktop .EXE Application
│   ├── README.md
│   ├── VitalMonitor_Cardiogram.exe      # Self-contained offline Windows 64-bit .exe (~224 KB)
│   ├── VitalMonitor_Localhost.exe       # Localhost:3000 desktop launcher .exe
│   ├── VitalMonitor_Standalone.html     # Single-file portable HTML/CSS/JS bundle
│   ├── electron-main.cjs                # Electron desktop wrapper with Web Serial COM support
│   └── build_offline_exe.bat            # 1-click Electron offline .exe packager
│
├── dist/                  # Production distribution packages & build guides
│   └── README.md
│
├── docs/                  # Formatted documentation & user manuals
│   ├── README.md
│   ├── ESP32_CAM_USER_MANUAL.doc        # Formatted Word-compatible complete manual
│   ├── ESP32_CAM_HEART_RATE_MONITOR_GUIDE.md
│   └── BIOLOGICAL_AND_PHYSICAL_FUNDAMENTALS.md
│
├── hmi/                   # Human-Machine Interface specifications (UART, Web, LCD 1602)
│   └── README.md
│
├── md/                    # In-depth technical reports & architectural specifications
│   ├── README.md
│   ├── BIOMEDICAL_FEASIBILITY_REPORT.md
│   ├── FIRMWARE_SPECIFICATIONS.md
│   └── KY022_KY005_SILICON_ANALYSIS.md
│
└── web app simulator/     # Interactive React + TypeScript browser simulator & physics lab
    └── README.md
```

---

## Quick Start (Heart Rate in Thonny IDE)

1. Flash your ESP32-CAM with `micropython_camera_feeeb5ea3_esp32_idf4_4.bin` (see `build/`).
2. Open Thonny IDE, connect to your ESP32-CAM at 115200 baud.
3. Open `codes/esp32_cam_heart_rate.py` and click **Run (F5)**.
4. Place your index fingertip gently over both the camera lens and flash LED.
5. In 5 seconds, the terminal displays your live pulse waveform and heart rate:
   ```text
   |               #         |  62.5 BPM <3 BEAT #28! (Level:  75.6)
   |              #          |  62.5 BPM <3 BEAT #29! (Level:  75.7)
   |              #          |  62.6 BPM <3 BEAT #30! (Level:  76.1)
   ```
6. Removing your finger immediately auto-resets the reading back to `-- BPM`.

---

## Scientific Summary: Physical & Biological Principles

### 1. Optical Transmission (Beer-Lambert Law)
Light passing through living tissue is attenuated according to the Beer-Lambert law ($I = I_0 \cdot e^{-\sum \epsilon_i c_i d_i}$). During ventricular systole, arterial blood surges into the fingertip capillaries, increasing optical absorption and causing a drop in transmitted green light ($520-540\text{ nm}$).

### 2. Why Camera Alone Cannot Measure $\text{SpO}_2$
$\text{SpO}_2$ requires measuring the ratio of optical modulation between two wavelengths: **660 nm (Red)** and **880 nm (Infrared)**. The ESP32-CAM white LED emits no 880 nm infrared light, and the OV2640 has an internal IR-cut filter. For $\text{SpO}_2$, the dedicated **MAX30102** sensor is required.

### 3. Why Blood Pressure Requires Dual Sensors (PTT)
Blood pressure is hydrostatic fluid tension ($\text{mmHg}$), not optical color. Non-invasive cuffless blood pressure is calculated via **Pulse Transit Time ($PTT$)**: the delay between the cardiac ventricular contraction ($R$-wave on an **AD8232 ECG**) and the arterial pulse arrival at the fingertip (**MAX30102 PPG**).

---

## AI Medical Report & 10-Second Printable ECG Strip

The platform now features an in-app **AI Medical Report & 10-Second Printable ECG Strip** generator accessible directly from the live cardiogram:

* **Dedicated Trigger Button:** Click the **"AI Medical Report & 10s Strip"** button on the live cardiogram toolbar to launch the automated clinical analysis.
* **10-Second Printable ECG Strip (PNG):**
  * Rendered on authentic clinical millimeter grid paper ($1\text{ mm}$ minor, $5\text{ mm}$ major pink/red grid).
  * Standard clinical calibration: **$25\text{ mm/s}$ horizontal paper speed** and **$10\text{ mm/mV}$ vertical gain**.
  * Integrated **$1.0\text{ mV}$ standard calibration rectangular pulse** ($200\text{ ms}$ width, $10\text{ mm}$ height) for clinical voltage calibration verification.
  * Synchronous Dual-Channel tracing: Channel 1 Lead I ECG biopotential + Channel 2 MAX30102 Optical PPG pulse volume wave.
  * Patient telemetry header with live HR, BP, $\text{SpO}_2$, PTT, SDNN, RMSSD, PR interval, QRS duration, and QTc interval.
* **Mandatory Preliminary Medical Disclaimer:**
  * Every generated report, printout, and exported image explicitly displays the medical safety warning:
    > **⚠ PRELIMINARY OBSERVATION NOTICE:** All observations, rhythm classifications, and biometric calculations in this report are preliminary screening assessments obtained from non-invasive single-lead biopotentials and optical photoplethysmography. They DO NOT constitute a definitive clinical diagnosis. A specialized medical doctor or cardiologist MUST be consulted for comprehensive clinical evaluation, 12-lead diagnostic electrocardiography, and therapeutic decisions.
* **Clinical Export & Print Options:**
  * **Download 10s Strip (.png):** High-resolution $2500 \times 720\text{ px}$ image ready for medical record attachment or printing.
  * **Print / Download PDF:** Formatted clinical printout with print-optimized CSS, header telemetry, doctor consultation directives, and embedded 10s strip.
  * **Copy Electrophysiological Summary:** Clean plain-text clipboard export for EHR notes.
