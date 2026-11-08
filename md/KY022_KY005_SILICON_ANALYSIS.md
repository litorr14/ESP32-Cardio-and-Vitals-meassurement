# Silicon Analysis: Why KY-022 & KY-005 Cannot Be Used for Pulse Oximetry

---

## 1. Introduction
The user previously evaluated whether consumer infrared modules (KY-005 IR Transmitter and KY-022 IR Receiver) could be combined with the ESP32-CAM to measure $\text{SpO}_2$.

This document details the silicon architecture of both modules and why they are physically incapable of biological pulse oximetry.

---

## 2. KY-022 Silicon Analysis (VS1838B Infrared Receiver)

```
[Incident Light] ──► [Optical IR Filter Window (940nm)]
                               │
                               ▼
                        [PIN Photodiode]
                               │
                               ▼ (Analog Current)
               [Preamplifier & Automatic Gain Control (AGC)]
                               │
                               ▼
        [38 kHz Bandpass Filter (Q = 10, Bandwidth ~35-41 kHz)]
                               │
                               ▼
                   [Demodulator & Integrator]
                               │
                               ▼
              [Schmitt Trigger & Output Transistor]
                               │
                               ▼
              [Digital Output Pin (High/Low Pulses ONLY)]
```

### The Physical Blockers:
1. **Hardwired 38 kHz Bandpass Filter:**
   * The silicon die inside the VS1838B IC contains an active RC bandpass filter centered strictly at **38,000 Hz (38 kHz)**.
   * Human biological heart pulses occur between **0.7 Hz and 3.0 Hz (40 to 180 BPM)**.
   * The 38 kHz filter treats human pulse variations as steady DC and **completely attenuates (deletes) them by over 80 dB**.
2. **Digital-Only Output (No Analog Photodiode Access):**
   * The IC integrates the photodiode directly on the silicon substrate beneath an internal op-amp and Schmitt trigger.
   * The output pin is an open-collector digital transistor that outputs only logic **0** or logic **1**.
   * It is impossible to read analog absorption intensity or micro-level pulsatile blood volume.

---

## 3. KY-005 Silicon Analysis (Infrared LED)
* **Emitter:** Standard Gallium-Aluminum-Arsenide (GaAlAs) 940 nm infrared LED.
* **Limitations for PPG:**
  * While 940 nm is within the infrared spectrum, pulse oximetry requires dual-wavelength illumination calibrated at $660\text{ nm}$ (Red) and $880-940\text{ nm}$ (IR) synchronized to sub-millisecond precision with an ambient-light-cancelling analog-to-digital converter (ADC).
  * Lacks a high-resolution photodetector with optical rejection.

---

## 4. Conclusion
* **KY-022 / KY-005:** Exclusively intended for 38 kHz consumer remote controls (TVs, air conditioners). Incompatible with biological vital signs.
* **Recommended Replacement:** The **MAX30102** or **MAX30100** integrated pulse oximetry IC.
