# ESP32-CAM MicroPython Firmware Specifications

---

## 1. Operating System & Runtime Environment
* **Firmware Binary:** `micropython_camera_feeeb5ea3_esp32_idf4_4.bin`
* **MicroPython Build:** v1.18-74-gfeeeb5ea3 (2022-02-02)
* **ESP-IDF Release:** v4.4
* **Target SoC:** Espressif ESP32-D0WD (dual-core Xtensa 32-bit LX6 @ 240 MHz)
* **Embedded Memory:** 520 KB internal SRAM + 4 MB external pseudo-static RAM (PSRAM)

---

## 2. Low-Level Camera Driver Architecture

```
[OV2640 Image Sensor]
        │
        ▼ (8-bit Parallel Video Bus: Y2-Y9 + VSYNC + HREF + PCLK)
[ESP32 Hardware I2S DMA Engine]
        │
        ▼ (Dual Ping-Pong DMA Buffers in SRAM)
[ESP-IDF Camera Driver (esp_camera.c)]
        │
        ▼ (MicroPython C-Extension: modcamera.c)
[MicroPython User Land: camera.capture()]
```

### 2.1 Camera Configuration Settings
* **Resolution:** `camera.FRAME_96X96` ($96 \times 96$ pixels)
* **Color Format:** `camera.GRAYSCALE` (8 bits per pixel, single luminance channel)
* **Master Clock (`xclk_freq`):** `camera.XCLK_20MHz`
* **Exposure & Gain Control:** Locked after 25 settling frames (`camera.gainctrl(False)`, `camera.exposure_ctrl(False)`) to prevent camera AGC from hunting and cancelling out biological pulse modulations.

---

## 3. Flash LED Thermal Management
* **Control Pin:** GPIO 4
* **Modulation:** Hardware PWM at 5000 Hz
* **Duty Cycle:** `duty(25)` out of 1023 (~2.4% duty cycle)
* **Thermal Dissipation:** Reduced from ~0.6W down to ~0.02W, preventing thermal blanching and keeping the PCB at room temperature.
