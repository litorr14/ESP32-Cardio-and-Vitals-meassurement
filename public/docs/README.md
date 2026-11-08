# Documentation Directory (`/docs/`)

This directory contains the complete technical manuals, user guides, biological and physical fundamentals, and Word-compatible documentation files for both the **AI-Thinker ESP32-CAM** and the **ESP32-C3 SuperMini** Biomedical Station.

---

## Document Index

1. **`ESP32_CAM_USER_MANUAL.doc`**
   * **Format:** Microsoft Word Compatible (`.doc`).
   * **Contents:** Full manual with formatted tables, hardware pinouts, operating instructions, and DSP architecture. Opens directly in Microsoft Word, LibreOffice Writer, or Google Docs.

2. **`ESP32_CAM_HEART_RATE_MONITOR_GUIDE.md`**
   * **Format:** Markdown (`.md`).
   * **Contents:** Step-by-step Thonny IDE setup, finger placement technique, oscilloscope trace explanation, and MicroPython firmware details (`micropython_camera_feeeb5ea3_esp32_idf4_4.bin`).

3. **`BIOLOGICAL_AND_PHYSICAL_FUNDAMENTALS.md`**
   * **Format:** Markdown (`.md`).
   * **Contents:** Deep scientific breakdown of the Beer-Lambert law ($I = I_0 e^{-\epsilon c d}$), Green vs. Red/IR absorption spectra, ventricular systole/diastole hemodynamics, dicrotic notch physics, Moens-Korteweg Pulse Wave Velocity ($PWV$), and Pulse Transit Time ($PTT$) blood pressure calculation.

4. **Engineering Conversation History Archives (`/codes/`):**
   * **`codes/esp32_cam/CONVERSATION_HISTORY_ESP32_CAM.md`**: Complete chronological talk history for the AI-Thinker ESP32-CAM (optical feasibility, pinout constraints, FTDI flashing, MAX30102 + AD8232 integration, PC software suite).
   * **`codes/esp32_c3_supermini/CONVERSATION_HISTORY_ESP32_C3_SUPERMINI.md`**: Complete chronological talk history for the ESP32-C3 SuperMini (migration, AD8232 blood pressure principle, square wave filter repair, clinical cardiogram analysis, screen tremble fix, cuff calibration, CSV telemetry, AI medical report with mandatory cardiologist follow-up, direct ECG strip PNG download, and 10s buffer persistence).

5. **Hardware Source Code Manuals (`/codes/`):**
   * **`codes/README.md`**: Master code suite overview and dual-board comparison.
   * **`codes/esp32_cam/README.md`**: Dedicated hardware manual for ESP32-CAM.
   * **`codes/esp32_c3_supermini/README.md`**: Dedicated hardware manual for ESP32-C3 SuperMini.
