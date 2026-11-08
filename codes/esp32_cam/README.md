# ESP32-CAM Biomedical Vital Signs Station: Instructions & Manual

**Target Hardware:** AI-Thinker ESP32-CAM (ESP32-D0WDQ6, 240 MHz Dual-Core)  
**Target MicroPython Firmware:** `micropython_camera_feeeb5ea3_esp32_idf4_4.bin`  
**Operating Voltage:** 5V via 5V/GND pins (FTDI or external power supply)

---

## 1. Hardware Pin Connections

All peripheral connections use non-strapping pins that avoid interfering with the OV2640 camera bus or boot modes:

| Peripheral | Peripheral Pin | ESP32-CAM Pin | Physical Header Location | Purpose / Signal |
| :--- | :--- | :--- | :--- | :--- |
| **MAX30102** | VIN | **3.3V** | Left Header Pin 2 | Regulated 3.3V power |
| **MAX30102** | GND | **GND** | Left Header Pin 1 | Common Ground |
| **MAX30102** | SCL | **GPIO 14** | Left Header Pin 4 | Shared Software I2C Clock |
| **MAX30102** | SDA | **GPIO 13** | Left Header Pin 6 | Shared Software I2C Data |
| **LCD 1602 I2C** | VCC | **5V** | Right Header Pin 1 | **Must be 5V** for crisp contrast |
| **LCD 1602 I2C** | GND | **GND** | Common Ground | Shared Ground |
| **LCD 1602 I2C** | SCL | **GPIO 14** | Left Header Pin 4 | Shared Software I2C Clock |
| **LCD 1602 I2C** | SDA | **GPIO 13** | Left Header Pin 6 | Shared Software I2C Data |
| **AD8232 ECG** | 3.3V | **3.3V** | Left Header Pin 2 | Shared 3.3V power rail |
| **AD8232 ECG** | GND | **GND** | Common Ground | Shared Ground |
| **AD8232 ECG** | OUTPUT | **GPIO 2** | **Left Header Pin 7** | Analog Biopotential (`ADC2_CH2`) |
| **AD8232 ECG** | LO+ / LO- | *Unconnected* | — | Detected via software voltage rail check |
| **AD8232 ECG** | SDN | *Unconnected* | — | Pulled high internally (always ON) |

### AD8232 Electrode Placement (Lead I / Lead II)
- **RA (Right Arm / Red):** Right inner forearm or right upper chest below clavicle.
- **LA (Left Arm / Yellow):** Left inner forearm or left upper chest below clavicle.
- **RL (Right Leg / Green):** Right lower abdomen, right hip, or inner right ankle (Ground).

---

## 2. MicroPython Flashing Instructions (FTDI Adapter)

Because the ESP32-CAM lacks an onboard USB-to-UART chip, an external FTDI USB programmer is required:

1. **Wiring FTDI to ESP32-CAM:**
   - `FTDI VCC (5V)` $\rightarrow$ `ESP32-CAM 5V`
   - `FTDI GND` $\rightarrow$ `ESP32-CAM GND`
   - `FTDI TX` $\rightarrow$ `ESP32-CAM U0R (GPIO 3)`
   - `FTDI RX` $\rightarrow$ `ESP32-CAM U0T (GPIO 1)`
   - **Flashing Jumper:** Connect `GPIO 0` to `GND` before plugging into USB.
2. **Erase and Flash Firmware:**
   Using `esptool.py` in your terminal:
   ```bash
   # Erase previous flash
   esptool.py --port COM3 --baud 460800 erase_flash

   # Flash MicroPython Camera build
   esptool.py --port COM3 --baud 460800 write_flash -z 0x1000 micropython_camera_feeeb5ea3_esp32_idf4_4.bin
   ```
3. **Boot into Normal Mode:**
   - Disconnect the `GPIO 0` to `GND` jumper wire.
   - Press the tiny `RST` button on the back of the ESP32-CAM.

---

## 3. Uploading Code in Thonny IDE

1. Open **Thonny IDE**, go to **Tools $\rightarrow$ Options $\rightarrow$ Interpreter**, and select **MicroPython (ESP32)** on your COM port.
2. First run `i2c_scanner.py` to confirm detection of:
   - `0x57` (MAX30102)
   - `0x27` or `0x3F` (LCD 1602 PCF8574 backpack)
3. Open `main.py` in Thonny and select **File $\rightarrow$ Save As... $\rightarrow$ MicroPython device $\rightarrow$ `main.py`**.
4. The station will now automatically boot and run on power-up!

---

## 4. Connecting to Live PC Cardiogram

1. Close Thonny (Thonny exclusively locks the serial port).
2. Open the **Live PC Cardiogram (USB)** tab in Google Chrome, Microsoft Edge, or Opera.
3. Click **Connect ESP32 (USB Serial)** and choose your FTDI COM port at 115200 baud.
4. Waveforms will immediately stream live in full clinical millimeter grid resolution!

---

## 5. Clinical ECG Strip Export & AI Medical Report

1. **Direct ECG Download:** Click the green **"Download ECG Strip (PNG)"** button on the main toolbar to instantly save the 10-second calibrated rhythm strip ($25\text{ mm/s}$, $10\text{ mm/mV}$, $1.0\text{ mV}$ pulse) with 1 click.
2. **Finger Placement Timing:** Keep your thumb on the MAX30102 sensor and fingers on the AD8232 electrodes for **10 seconds** until `✅ 10s BUFFER CAPTURED — YOU CAN REMOVE YOUR FINGER!` appears.
3. **Removing Your Finger:** You can remove your thumb safely once the buffer is full. The 10-second waveform and measured vitals remain preserved in memory.
4. **AI Medical Report:** Click **"AI Medical Report & 10s Strip"** to view electrophysiological analysis and export/print a formatted clinical PDF with mandatory cardiologist follow-up directives.

