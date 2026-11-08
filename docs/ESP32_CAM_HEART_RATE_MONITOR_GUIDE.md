# ESP32-CAM Vital Signs & Cuffless Blood Pressure Monitor: User & Technical Guide

---

## 1. Executive Summary & Verification
This project implements a complete biomedical vital signs station using an **AI-Thinker ESP32-CAM**, an external **MAX30102 pulse oximeter** (I2C), an **AD8232 single-lead ECG module** (ADC1), and an **LCD 1602 I2C display**, programmed in **MicroPython**.

### Hardware Validations Achieved
* **Camera Contact PPG:** Verified at **62.5 – 62.6 BPM** vs. 62 BPM reference sports smartwatch using OV2640 and GPIO 4 Flash LED.
* **MAX30102 Pulse Oximeter:** Verified at **60.0 BPM** and **99.3% SpO2** against clinical ground truth (60 BPM & 99% SpO2).
* **LCD 1602 I2C Display:** Verified on I2C address `0x27` (auto-detects `0x3F`). Renders animated custom 5x8 beating heart icon (`♥`) and dual-row readings.
* **AD8232 ECG + PTT Blood Pressure (Phase 3):** Synchronized ECG R-peak on GPIO 33 (ADC1) with MAX30102 optical systolic foot on GPIO 14/13 to compute Pulse Transit Time (PTT) and cuffless continuous Blood Pressure (mmHg).

---

## 2. Firmware Specifications

To support the camera sensor alongside standard MicroPython peripherals, the verified and required firmware build is:
* **Firmware Binary:** `micropython_camera_feeeb5ea3_esp32_idf4_4.bin`
* **Release Git Hash:** `feeeb5ea3`
* **ESP-IDF Runtime:** `ESP-IDF v4.4`
* **MicroPython Core:** `MicroPython v1.18-74-gfeeeb5ea3 on 2022-02-02; ESP32-cam module (i2s) with ESP32`
* **Memory Architecture:** Hardware I2S DMA with 4MB PSRAM enabled

---

## 3. Hardware Architecture & Complete Station Pinout

All sensors and the LCD display share the ESP32-CAM pins without conflict:

| Peripheral | Module Pin | ESP32-CAM Pin | Role / Electrical Function | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **LCD 1602 Display** | VCC | **5V (or VIN)** | Display Controller & Backlight | **Must be 5V** for crisp contrast |
| **LCD 1602 Display** | GND | **GND** | System Ground | Common ground |
| **LCD 1602 Display** | SCL | **GPIO 14** | Shared I2C Clock | Shared with MAX30102 (`0x27` / `0x3F`) |
| **LCD 1602 Display** | SDA | **GPIO 13** | Shared I2C Data | Shared with MAX30102 |
| **MAX30102 Sensor** | VIN | **3.3V** | Optical Sensor Power | 3.3V regulated rail |
| **MAX30102 Sensor** | GND | **GND** | Sensor Ground | Common ground |
| **MAX30102 Sensor** | SCL | **GPIO 14** | Shared I2C Clock | Multi-drop I2C address `0x57` |
| **MAX30102 Sensor** | SDA | **GPIO 13** | Shared I2C Data | Multi-drop I2C bus |
| **AD8232 ECG Module** | 3.3V | **3.3V** | Analog Front-End Power | Shared 3.3V rail (draws < 170 µA) |
| **AD8232 ECG Module** | GND | **GND** | Analog Ground | Common ground |
| **AD8232 ECG Module** | OUTPUT | **GPIO 33** | Analog ECG Signal | ADC1_CH5 (12-bit: 0 - 4095 counts) |
| **AD8232 ECG Module** | LO- / LO+ | *Unconnected* | Leads-Off Status | Detected automatically in software |
| **AD8232 ECG Module** | SDN | *Unconnected* | Shutdown Pin | Internal pull-up keeps chip awake |

---

## 4. AD8232 ECG Electrode Placement & Skin Preparation

The AD8232 measures microvolt cardiac potentials using a 3-lead differential configuration:

### Electrode Placement (Lead I / Lead II)
1. **RA (Right Arm - Red Cable):**
   * Place on: Right inner wrist/forearm, or upper right chest below the right clavicle.
2. **LA (Left Arm - Yellow Cable):**
   * Place on: Left inner wrist/forearm, or upper left chest below the left clavicle.
3. **RL (Right Leg - Green Cable / Reference Ground):**
   * Place on: Lower right abdomen, right hip, or right ankle.

### Skin Preparation Tips
* Clean application sites with an alcohol wipe to remove skin oils and lower contact impedance.
* Allow skin to dry thoroughly before sticking gel pads.
* Rest forearms comfortably on a desk to eliminate electromyographic (muscle tremor) interference.

---

## 5. Pulse Transit Time (PTT) Blood Pressure Principles

### 5.1 Hemodynamic Physics (Moens-Korteweg & Hughes Law)
Pulse Transit Time (PTT) is the latency between ventricular electrical depolarization (the **R-peak** on the ECG) and the physical arrival of the systolic pulse wave at the thumb (detected by the **MAX30102**).

Pulse Wave Velocity (PWV) is governed by the Moens-Korteweg equation:
$$PWV = \sqrt{\frac{E \cdot h}{\rho \cdot d}}$$

Where arterial wall stiffness $E$ increases exponentially with blood pressure $P$ (Hughes equation):
$$E = E_0 e^{\gamma P}$$

Because $PTT = \text{Distance} / PWV$, higher blood pressure increases arterial stiffness, speeds up the pressure wave, and **decreases PTT**. Lower blood pressure softens arterial walls, slowing the wave and **increasing PTT**:
$$SBP = a \cdot \ln(PTT) + b$$
$$DBP = c \cdot \ln(PTT) + d$$

### 5.2 Calibrated Constants
* **Systolic:** $a = -72.5, \quad b = 518.0$
* **Diastolic:** $c = -48.0, \quad d = 343.0$
* At normal resting $PTT = 250\text{ ms} \rightarrow SBP = 118\text{ mmHg}, DBP = 78\text{ mmHg}$.

### 5.3 Quick Calibration with an Arm Cuff
To customize the offsets $b$ and $d$ to your exact arterial length:
1. Run `main.py` and note your resting PTT (e.g., $248\text{ ms}$).
2. Take a reference reading with your arm cuff (e.g., $120 / 80\text{ mmHg}$).
3. In Python:
   ```python
   import math
   log_ptt = math.log(248.0)  # ~5.513
   cal_b = 120.0 - (-72.5 * log_ptt)  # ~519.7
   cal_d = 80.0 - (-48.0 * log_ptt)   # ~344.6
   ```
4. Insert these into lines 181-184 of `codes/main.py`.

---

## 6. LCD 1602 Display Layout

The LCD 1602 displays live vitals across two 16-character rows with differential character updates (zero flicker):

```text
+----------------+
|HR: 60  99.3%  ♥|   <-- Row 0: "HR: " (1 space) + HR + 2 spaces + SpO2 (up to 3 int, 1 dec) + Heart
|BP:118/78 mmHg  |   <-- Row 1: Continuous Systolic/Diastolic BP (mmHg) or PTT (ms)
+----------------+
```

* **Row 0 Formatting (`"HR: %.0f  %s"`):**
  * Leaves **1 space** between `HR:` and the BPM integer (`HR: 60`).
  * Leaves **2 spaces** after the BPM value (`  `), followed by the **SpO₂ reading with up to 3 integers and 1 decimal** (`99.3%` or `100.0%`) and the animated beating heart icon (`♥`) at column 16.
* **Flashing Heart Icon (`♥`):** Custom 5×8 pixel character programmed into CGRAM location 0, flashing on every detected systolic pulse.
* **Finger Removal Reset:** Lifting your thumb immediately switches Row 0 to `VITAL SIGNS MON ` and Row 1 to `PLACE THUMB PAD `.

---

## 7. Autonomous Auto-Boot Deployment (`main.py`)

To run the station independently from a battery or 5V USB charger without a computer:
1. In **Thonny IDE**, open `codes/main.py` (or `codes/main_esp32_c3_supermini.py` for the ESP32-C3 SuperMini).
2. Select **File -> Save As... -> MicroPython device**.
3. Name the file **`main.py`** in the root directory of the ESP32.
4. Disconnect the computer and power the ESP32 via any 5V USB power bank or power adapter.
5. The station boots in under 2 seconds, displaying `ECG+PPG+BP READY`.

---

## 8. Windows `.EXE` Desktop Application (`/windows_exe/`)

The **`/windows_exe/VitalMonitor_Cardiogram.exe`** (**~224 KB**) executable provides a 100% self-contained Windows 10/11 desktop application:
* **Embedded Offline Application:** Contains the full compiled HTML/CSS/JS application inside the `.exe` binary and serves it on `http://127.0.0.1:18765/` (a local loopback Secure Context for native **Web Serial USB COM** support).
* **Dual-Channel Live Waveforms:** Renders simultaneous **Lead I / II Electrocardiogram (P-Q-R-S-T)** and **Optical Arterial PPG** traces at 100 Hz, and immediately clears stored waves to a `0.0` baseline the instant the finger is removed from the sensor.

