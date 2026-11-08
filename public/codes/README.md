# MicroPython Source Code Suite & Engineering Manual: ESP32 Biomedical Station

This directory contains the production-ready MicroPython firmware files, hardware wiring guides, dual-board architecture, conversation archives, and calibration tools for both the **ESP32-CAM** and the **ESP32-C3 SuperMini**.

---

## 1. Dedicated Subfolder Architecture

As requested, all source code and documentation are organized into two dedicated subfolders based on target hardware:

```text
/codes/
├── README.md                                # Master documentation & manual (this file)
│
├── esp32_cam/                               # Dedicated folder for AI-Thinker ESP32-CAM
│   ├── CONVERSATION_HISTORY_ESP32_CAM.md    # Complete engineering talk history & archives
│   ├── README.md                            # ESP32-CAM hardware pinout & FTDI flashing guide
│   ├── main.py                              # Master auto-boot production firmware (GPIO 14/13, GPIO 2)
│   ├── esp32_cam_heart_rate.py              # Camera-only optical contact PPG monitor (OV2640 + Flash)
│   ├── max30102_lcd_monitor.py              # MAX30102 HR + SpO2 with LCD 1602 display
│   ├── max30102_hr_spo2.py                  # MAX30102 terminal-only serial monitor
│   ├── ecg_ppg_ptt_blood_pressure.py        # AD8232 ECG + MAX30102 PTT cuff calibration diagnostic
│   ├── i2c_scanner.py                       # Diagnostic I2C scanner (GPIO 14 SCL, GPIO 13 SDA)
│   └── i2c_lcd.py                           # Modular PCF8574 LCD 1602 I2C driver
│
└── esp32_c3_supermini/                      # Dedicated folder for ESP32-C3 SuperMini
    ├── CONVERSATION_HISTORY_ESP32_C3_SUPERMINI.md # Complete engineering talk history & archives
    ├── README.md                            # ESP32-C3 SuperMini native USB-C guide & manual
    ├── main.py                              # Master auto-boot production firmware (GPIO 9/8, GPIO 2)
    ├── max30102_lcd_monitor.py              # MAX30102 HR + SpO2 + LCD 1602 (configured for C3)
    ├── max30102_hr_spo2.py                  # MAX30102 terminal-only serial monitor (configured for C3)
    ├── ecg_ppg_ptt_blood_pressure.py        # AD8232 ECG + MAX30102 PTT diagnostic (configured for C3)
    ├── i2c_scanner.py                       # Diagnostic I2C scanner (GPIO 9 SCL, GPIO 8 SDA)
    └── i2c_lcd.py                           # Modular PCF8574 LCD 1602 I2C driver
```

---

## 2. Hardware Comparison & Pinout Mapping

| Function / Peripheral | AI-Thinker ESP32-CAM Pin | **ESP32-C3 SuperMini Pin** | Engineering Notes |
| :--- | :--- | :--- | :--- |
| **Microcontroller Core** | Xtensa Dual-Core 32-bit (240 MHz) | **RISC-V Single-Core 32-bit (160 MHz)** | Modern, energy-efficient architecture |
| **PC Programming Interface** | External FTDI USB-to-UART Adapter | **Direct Native USB Type-C** | No external programmer or jumper needed |
| **Sensor Power (MAX30102 & AD8232)**| 3.3V (Left Header Pin 2) | **3V3** | Clean regulated 3.3V power |
| **LCD 1602 Backlight Power** | 5V / VIN (Right Header Pin 1) | **5V (VBUS)** | **Must be 5V** for crisp character contrast |
| **Common Ground** | GND (Left Header Pin 1) | **GND** | Shared ground plane across all sensors |
| **I2C SCL (Shared)** | GPIO 14 (Left Header Pin 4) | **GPIO 9** (or GPIO 6) | Shared clock bus (100 kHz) |
| **I2C SDA (Shared)** | GPIO 13 (Left Header Pin 6) | **GPIO 8** (or GPIO 7) | Shared bi-directional data bus |
| **AD8232 ECG Biopotential** | GPIO 2 (`ADC2_CH2` - Pin 7) | **GPIO 2 (`ADC1_CH2`)** | Clean ADC1 channel on C3 (no Wi-Fi clash) |
| **AD8232 Leads-Off (LO+ / LO-)** | *Unconnected* | *Unconnected* | Auto-detected via software voltage rail check |
| **AD8232 Shutdown (SDN)** | *Unconnected* | *Unconnected* | Internal pull-up keeps instrumentation amp ON |

### AD8232 Electrode Lead Placement (Lead I / Lead II)
- **RA (Right Arm / Red Lead):** Right inner forearm or right upper chest below clavicle.
- **LA (Left Arm / Yellow Lead):** Left inner forearm or left upper chest below clavicle.
- **RL (Right Leg / Green Lead):** Right lower abdomen, right hip, or inner right ankle (Reference Ground).

---

## 3. Engineering Conversation History Archives

Complete, chronological logs of all discussions, formulas, code iterations, circuit debugging, and user questions are preserved:

1. **`codes/esp32_cam/CONVERSATION_HISTORY_ESP32_CAM.md`**:
   - Initial feasibility inquiry on obtaining HR, SpO2, and BP using camera flash.
   - Physical justification for why white flash cannot do true pulse oximetry or blood pressure.
   - Camera contact transillumination test scripts and thermal risk analysis.
   - ESP32-CAM pin allocation avoiding strapping pins (GPIO 0, 1, 3, 12, 14, 15, 16).
   - Integration of MAX30102 pulse oximeter and PCF8574 LCD 1602 display.
   - Addition of AD8232 single-lead ECG front-end.

2. **`codes/esp32_c3_supermini/CONVERSATION_HISTORY_ESP32_C3_SUPERMINI.md`**:
   - Upgrade rationale to ESP32-C3 SuperMini (RISC-V, native USB-C, clean ADC1).
   - Detailed principle of operation: how the AD8232 + MAX30102 calculate Blood Pressure via Pulse Transit Time (PTT) and Moens-Korteweg equations.
   - Square wave cardiogram root-cause diagnosis (integer truncation / step quantization) and resolution via 2-stage Bessel IIR filtering and Phase-Locked Loop (PLL) peak tracking.
   - Health perspective cardiogram analysis: Lead I morphological breakdown (P wave, PR interval, QRS complex, ST segment, T wave), rhythm regularity, and autonomic balance.
   - Screen tremble & layout jitter diagnosis and permanent stabilization.
   - Enhanced Blood Pressure calibration system with dynamic `$CAL,b,d` serial command dispatch.
   - High-resolution CSV telemetry data export specification.

---

## 4. Instructions of Use

### A. Flashing Firmware to the ESP32-CAM (with FTDI Adapter)
1. Wire the FTDI programmer to the ESP32-CAM:
   - `FTDI 5V` $\rightarrow$ `ESP32-CAM 5V`
   - `FTDI GND` $\rightarrow$ `ESP32-CAM GND`
   - `FTDI TX` $\rightarrow$ `ESP32-CAM U0R (GPIO 3)`
   - `FTDI RX` $\rightarrow$ `ESP32-CAM U0T (GPIO 1)`
   - Connect a jumper wire between `GPIO 0` and `GND`.
2. Connect FTDI to PC and flash:
   ```bash
   esptool.py --port COM3 --baud 460800 erase_flash
   esptool.py --port COM3 --baud 460800 write_flash -z 0x1000 micropython_camera_feeeb5ea3_esp32_idf4_4.bin
   ```
3. Remove the `GPIO 0` jumper wire and press the `RST` button.

### B. Flashing Firmware to the ESP32-C3 SuperMini (Native USB-C)
1. Plug a standard USB-C cable directly into the ESP32-C3 SuperMini.
2. Hold down the **BOOT** button, press and release the **RESET (RST)** button, then release **BOOT**.
3. Flash the official ESP32-C3 MicroPython firmware:
   ```bash
   esptool.py --port COM4 --baud 460800 erase_flash
   esptool.py --port COM4 --baud 460800 write_flash -z 0x0 ESP32_GENERIC_C3-20240105-v1.22.1.bin
   ```
4. Press the **RESET (RST)** button to boot into MicroPython.

### C. Installing MicroPython Code via Thonny IDE
1. Open **Thonny IDE** and select **Tools $\rightarrow$ Options $\rightarrow$ Interpreter $\rightarrow$ MicroPython (ESP32)** on your board's COM port.
2. First run `i2c_scanner.py` from your target subfolder:
   - Should report `0x57` (MAX30102) and `0x27` or `0x3F` (LCD 1602 backpack).
3. Open `main.py` from your target subfolder (`codes/esp32_c3_supermini/main.py` or `codes/esp32_cam/main.py`).
4. Select **File $\rightarrow$ Save As... $\rightarrow$ MicroPython device $\rightarrow$ `main.py`**.
5. Disconnect Thonny. The station will now auto-boot and run independently on any USB power source!

### D. Connecting to Live PC Cardiogram (USB)
1. Close Thonny (so the serial port is free).
2. Open the web app or standalone desktop launcher (`/windows_exe/VitalMonitor_Cardiogram.exe`).
3. Click **"Connect ESP32 (USB Serial)"** and select your USB COM port at **115200 baud**.
4. Both the AD8232 electrocardiogram trace (green) and MAX30102 optical PPG volume wave (blue) will sweep smoothly at standard $25\text{ mm/s}$ medical speed.

### E. In-App Blood Pressure Calibration
1. Take an arm-cuff measurement with a standard sphygmomanometer (e.g. $120 / 80\text{ mmHg}$).
2. On the **Live PC Cardiogram** page, click the **"Calibrate"** button on the Blood Pressure HUD card.
3. Enter your arm cuff SBP and DBP values and your resting PTT (or click *"Use currently measured live PTT"*).
4. Click **"Send to ESP32"**: The browser transmits `$CAL,b,d\r\n` directly to the ESP32.
5. The ESP32 confirms with `# [ESP32] Calibrated PTT Coefficients: b=..., d=...` and updates in RAM immediately without resetting.

### F. High-Resolution CSV Telemetry Export
1. Click **"Export CSV"** in the top action bar.
2. Choose between:
   - **Continuous Waveform (100 Hz):** All raw 12-bit ADC biopotentials, filtered mV, optical PPG volume, SpO2, and instantaneous PTT for import into MATLAB, Python, Excel, or Kubios HRV.
   - **Beat-by-Beat Cardiac Summary:** Detected R-wave events, R-R intervals, heart rate, hemodynamics, and rhythm classifications.

### G. 1-Click Direct ECG Strip (PNG) Export
1. Click the green **"Download ECG Strip (PNG)"** button on the main toolbar.
2. The browser immediately renders and saves a high-resolution ($2500 \times 720\text{ px}$) clinical rhythm strip on standard pink/red millimeter grid paper.
3. Incorporates exact clinical standards:
   - **$25\text{ mm/s}$ horizontal paper speed** ($40\text{ ms}$ per small box, $200\text{ ms}$ per large box).
   - **$10\text{ mm/mV}$ vertical voltage calibration** ($0.1\text{ mV}$ per small box).
   - **$1.0\text{ mV}$ standard calibration pulse** ($200\text{ ms}$ wide, $10\text{ mm}$ high).
   - Synchronized Lead I ECG biopotential and MAX30102 PPG volume tracing.
   - Measured vital telemetry header and preliminary screening notice.

### H. AI Medical Report & Finger Placement Timing
1. **10-Second Contact Rule:** Place and hold your thumb gently over the MAX30102 optical sensor and keep your fingers on the AD8232 electrodes for **exactly 10 seconds** (1,000 continuous samples at 100 Hz).
2. **Buffer Status Indicator:**
   - While recording: `👆 KEEP FINGER ON SENSOR • Recording Window (X.Xs / 10.0s)`
   - Once complete: `✅ 10s BUFFER CAPTURED — YOU CAN REMOVE YOUR FINGER!`
3. **Finger Retrieval:** Once the buffer status turns green, **you do NOT need to keep holding your finger on the sensor**. You can safely remove your finger while reviewing the report or printing.
4. **Generating the AI Report:** Click **"AI Medical Report & 10s Strip"**.
   - Evaluates cardiac rhythm, intervals ($PR$, $QRS$, $QT_c$), hemodynamic compliance, and autonomic balance ($SDNN$, $RMSSD$).
   - Displays measured metrics even after finger retrieval via persistent historical buffer recovery.
   - Enforces the mandatory clinical disclaimer requiring follow-up with a specialized physician or cardiologist.
   - Includes **"Print / Save Clinical PDF"** for attaching to electronic health records or bringing to clinical appointments.

