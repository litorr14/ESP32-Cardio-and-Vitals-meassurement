# Human-Machine Interface (HMI) Architecture

This directory outlines the Human-Machine Interface (HMI) designs for the ESP32-CAM biomedical monitor across three operational tiers:

---

## Tier 1: Terminal ASCII Oscilloscope HMI (Active Production)
* **Interface Medium:** Standard UART Serial REPL (115200 baud) via Thonny or minicom.
* **Display Format:**
  ```text
  |            #            |    -- BPM               (Level:  75.0)
  |               #         |  62.5 BPM <3 BEAT #28! (Level:  75.6)
  |              #          |  62.5 BPM              (Level:  74.8)
  ```
* **Features:**
  * 25-column zero-latency ASCII oscilloscope bar trace (`|   #   |`).
  * Real-time calculated heart rate in beats per minute (`62.5 BPM`).
  * Systolic beat flash trigger (`<3 BEAT #X!`).
  * Live tissue transmission raw luminance level (`(Level: 75.6)`).
  * Auto-reset banner on finger removal (`[!] Finger removed: place gently on lens`).

---

## Tier 2: Interactive Web HMI Simulator
* **Interface Medium:** Full-stack React + Tailwind web application (available in the `web app simulator` directory).
* **Components:**
  * **Interactive Waveform Synthesizer:** Real-time canvas rendering of photoplethysmogram (PPG) waveforms with adjustable heart rate, arterial stiffness, and dicrotic notch amplitude.
  * **Optical Physics Explorer:** Real-time spectral simulation of the Beer-Lambert law comparing green ($520\text{ nm}$), red ($660\text{ nm}$), and infrared ($880\text{ nm}$) absorption.
  * **Blood Pressure Hemodynamics Visualizer:** Simultaneous ECG and PPG dual-trace showing Pulse Transit Time ($PTT$) delay and systolic/diastolic blood pressure estimation.
  * **Code Lab:** In-browser firmware browser and one-click downloader for MicroPython files.

---

## Tier 3: Standalone Wearable OLED HMI (Planned for MAX30102 / AD8232 Expansion)
When the external sensors arrive, the ESP32-CAM can be converted into a pocket wearable monitor:
* **Display:** 0.96-inch monochrome I2C OLED display (SSD1306, $128 \times 64$ pixels).
* **Bus:** Shared I2C bus on **GPIO 14 (SCL)** and **GPIO 13 (SDA)** with MAX30102.
* **Screen Layout:**
  * Top Bar: Battery voltage, sensor status, Bluetooth icon.
  * Middle Section: Large numeric Heart Rate (BPM) and $\text{SpO}_2$ (%).
  * Bottom Section: Scrolling 64-pixel real-time cardiac waveform.
