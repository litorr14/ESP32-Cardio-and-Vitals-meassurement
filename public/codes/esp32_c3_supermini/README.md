# ESP32-C3 SuperMini Biomedical Vital Signs Station: Instructions & Manual

**Target Hardware:** ESP32-C3 SuperMini (RISC-V 32-bit Single-Core @ 160 MHz)  
**Target MicroPython Firmware:** `ESP32_GENERIC_C3-20240105-v1.22.1.bin` (or newer)  
**Interface:** Direct Native USB Type-C (Internal USB-CDC / JTAG controller)  
**Operating Voltage:** 5V via USB-C port

---

## 1. Hardware Pin Connections

The ESP32-C3 SuperMini simplifies wiring significantly: plug USB Type-C directly into the board (no FTDI adapter or external programmer required):

| Peripheral | Peripheral Pin | **ESP32-C3 SuperMini Pin** | Purpose / Signal Notes |
| :--- | :--- | :--- | :--- |
| **MAX30102** | VIN | **3V3** | Clean 3.3V LDO regulated rail |
| **MAX30102** | GND | **GND** | Common system ground |
| **MAX30102** | SCL | **GPIO 9** (or 6) | Shared Software/Hardware I2C Clock |
| **MAX30102** | SDA | **GPIO 8** (or 7) | Shared Software/Hardware I2C Data |
| **LCD 1602 I2C** | VCC | **5V (VBUS)** | Direct 5V from USB-C rail for crisp text |
| **LCD 1602 I2C** | GND | **GND** | Common system ground |
| **LCD 1602 I2C** | SCL | **GPIO 9** (or 6) | Shared I2C Clock with MAX30102 |
| **LCD 1602 I2C** | SDA | **GPIO 8** (or 7) | Shared I2C Data with MAX30102 |
| **AD8232 ECG** | 3.3V | **3V3** | Shared 3.3V power rail |
| **AD8232 ECG** | GND | **GND** | Common system ground |
| **AD8232 ECG** | OUTPUT | **GPIO 2** | **ADC1_CH2** (Clean 12-bit ADC, no Wi-Fi clash) |
| **AD8232 ECG** | LO+ / LO- | *Unconnected* | Software auto-detects disconnect from signal rail |
| **AD8232 ECG** | SDN | *Unconnected* | Internal pull-up keeps instrumentation amp ON |

### AD8232 Electrode Placement (Lead I)
- **RA (Right Arm / Red Cable):** Right inner forearm or right upper chest below clavicle.
- **LA (Left Arm / Yellow Cable):** Left inner forearm or left upper chest below clavicle.
- **RL (Right Leg / Green Cable):** Right lower abdomen or inner right ankle (Ground).

---

## 2. MicroPython Flashing Instructions (Native USB-C)

No FTDI adapter is needed. Connect the ESP32-C3 SuperMini to your computer with a standard USB-C cable:

1. **Enter Bootloader Mode:**
   - Hold down the **BOOT** button on the ESP32-C3 SuperMini.
   - Press and release the **RESET (RST)** button.
   - Release the **BOOT** button.
   - A new USB Serial/JTAG port will appear on your computer (e.g., `COM4` on Windows or `/dev/ttyACM0` on Linux/Mac).
2. **Erase and Flash Firmware:**
   ```bash
   # Erase previous flash
   esptool.py --port COM4 --baud 460800 erase_flash

   # Flash official MicroPython build for ESP32-C3
   esptool.py --port COM4 --baud 460800 write_flash -z 0x0 ESP32_GENERIC_C3-20240105-v1.22.1.bin
   ```
3. **Press RESET:** Press the `RST` button once. The board will now boot into MicroPython REPL.

---

## 3. Uploading Code in Thonny IDE

1. In **Thonny IDE**, go to **Tools $\rightarrow$ Options $\rightarrow$ Interpreter**, and select **MicroPython (ESP32)**. Select the USB Serial port.
2. Run `i2c_scanner.py` to confirm detection of:
   - `0x57` (MAX30102)
   - `0x27` or `0x3F` (LCD 1602 PCF8574 backpack)
3. Save `main.py` directly to the root of the board as **`main.py`** (**File $\rightarrow$ Save As... $\rightarrow$ MicroPython device $\rightarrow$ `main.py`**).
4. The station will now auto-boot and display real-time vitals on the LCD 1602 immediately upon power-up!

---

## 4. Enhanced Blood Pressure Calibration Guide

The system uses the **Moens-Korteweg Pulse Transit Time (PTT)** logarithmic model:
$$\text{SBP} = -72.5 \cdot \ln(\text{PTT}) + b$$
$$\text{DBP} = -48.0 \cdot \ln(\text{PTT}) + d$$

### How to Calibrate:
1. Put on an upper-arm reference blood pressure cuff and take a measurement (e.g. $120 / 80\text{ mmHg}$).
2. Open the **Live PC Cardiogram (USB)** tab in Chrome or Edge and click **Connect ESP32 (USB Serial)**.
3. Click the **"Calibrate"** button on the Blood Pressure HUD card.
4. Enter your reference cuff readings ($120\text{ SBP}, 80\text{ DBP}$) and your resting PTT (or click *"Use currently measured live PTT"*).
5. Click **"Send to ESP32"**: The browser sends `$CAL,b,d\r\n` over Web Serial directly into the running ESP32 RAM. The ESP32 confirms with `# [ESP32] Calibrated PTT Coefficients: b=..., d=...` without rebooting!
6. Click **"Save & Apply"** to store your personalized coefficients in browser `localStorage`.

---

## 5. Enhanced CSV Telemetry Data Export

Click **"Export CSV"** in the top action bar to open the clinical exporter:
- **100 Hz Continuous Waveform CSV:** Logs all $10\text{ ms}$ frames including raw 12-bit ADC counts, calibrated Lead I biopotentials ($mV$), normalized optical PPG volume, SpO2, SBP/DBP, and PTT for processing in MATLAB, Python, or Kubios.
- **Beat-by-Beat Cardiac Log CSV:** Filters to detected R-wave peaks with beat-to-beat R-R interval ($ms$), instantaneous heart rate ($BPM$), hemodynamics, and automatic arrhythmia classification.

---

## 6. Direct 1-Click ECG Rhythm Strip (PNG) Export

Click the green **"Download ECG Strip (PNG)"** button on the main toolbar to instantly download the calibrated clinical rhythm strip:
- Standard clinical millimeter grid: **$25\text{ mm/s}$ horizontal paper speed** and **$10\text{ mm/mV}$ vertical voltage calibration**.
- Standard **$1.0\text{ mV}$ calibration rectangular pulse** ($200\text{ ms}$ wide, $10\text{ mm}$ high).
- Synchronized Channel 1 (Lead I ECG) and Channel 2 (MAX30102 PPG volume wave).
- Instant 1-click download with **no need to open the AI report modal**.

---

## 7. AI Medical Report & 10-Second Finger Placement Guide

1. **How Long to Place Thumb:** You only need to place your thumb on the MAX30102 sensor and hold the AD8232 electrodes for **10 seconds** (1,000 continuous samples at 100 Hz).
2. **Buffer Status Indicator:**
   - Recording (< 10s): `👆 KEEP FINGER ON SENSOR • Recording Window (X.Xs / 10.0s)`
   - Complete (>= 10s): `✅ 10s BUFFER CAPTURED — YOU CAN REMOVE YOUR FINGER!`
3. **Finger Retrieval:** Once the banner turns green, **you can safely remove your thumb**. The historical 10-second cardiac buffer is preserved in memory.
4. **AI Report Synthesis:** Click **"AI Medical Report & 10s Strip"** to generate the electrophysiological evaluation (PR, QRS, QTc, rhythm, hemodynamics, autonomic balance).
5. **Mandatory Doctor Consultation:** All reports prominently feature the preliminary medical notice advising comprehensive follow-up with a specialized doctor or cardiologist.
6. **Print / Save Clinical PDF:** Formatted for direct attachment to medical records or printing for healthcare consultations.

