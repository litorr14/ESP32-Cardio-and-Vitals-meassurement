# Markdown System Documentation (`/md/`)

This directory houses the in-depth engineering reports, mathematical models, and silicon analyses for the ESP32-CAM Vitals Analyzer project.

---

## Document Index

1. **`BIOMEDICAL_FEASIBILITY_REPORT.md`**
   * Engineering verdicts for Heart Rate (HR), Blood Oxygen Saturation ($\text{SpO}_2$), and Blood Pressure (BP).
   * Physical justification of sensor requirements.
2. **`FIRMWARE_SPECIFICATIONS.md`**
   * MicroPython runtime specifications (`micropython_camera_feeeb5ea3_esp32_idf4_4.bin`).
   * OV2640 parallel bus DMA architecture and memory allocation.
3. **`KY022_KY005_SILICON_ANALYSIS.md`**
   * Teardown of the VS1838B 38 kHz bandpass receiver.
   * Explanation of why consumer IR remote controls cannot be used for pulse oximetry.
