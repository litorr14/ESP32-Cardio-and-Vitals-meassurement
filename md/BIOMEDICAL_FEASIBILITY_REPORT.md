# Biomedical Feasibility & Engineering Verdict

---

## 1. Executive Summary

| Vital Sign | ESP32-CAM Alone? | With MAX30102? | With MAX30102 + AD8232? | Engineering Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Heart Rate (HR / BPM)** | **YES (Verified)** | **YES** | **YES** | **Fully feasible** with camera contact PPG. Verified on hardware at **62.6 BPM**. |
| **Blood Oxygen Saturation ($\text{SpO}_2$)** | **NO (Impossible)** | **YES** | **YES** | **Infeasible with camera alone.** Requires dual calibrated $660\text{ nm}$ (Red) and $880\text{ nm}$ (IR) wavelengths. |
| **Blood Pressure (Systolic & Diastolic)** | **NO (Impossible)** | **NO** | **YES** | **Infeasible with optical sensors alone.** Requires synchronized ECG ($R$-wave) + PPG ($t_{PPG}$) for Pulse Transit Time ($PTT$). |

---

## 2. In-Depth Analysis by Metric

### Metric 1: Heart Rate (HR)
* **Status:** Fully functional on ESP32-CAM without extra sensors.
* **Mechanism:** Green spectrum light penetration ($520-540\text{ nm}$) tracks capillary expansion and contraction during ventricular systole.
* **Performance:** Evaluated and tested in MicroPython v1.18 on the AI-Thinker board. Reading settled at **62.5 – 62.6 BPM**, providing an exact match with the reference smartwatch.

### Metric 2: Blood Oxygen Saturation ($\text{SpO}_2$)
* **Status:** Physically impossible using camera alone.
* **Physics Barrier:** The Beer-Lambert pulse oximetry ratio:
  $$R = \frac{(AC/DC)_{660\text{ nm}}}{(AC/DC)_{880\text{ nm}}}$$
  requires an Infrared wavelength ($880-940\text{ nm}$) where oxygenated hemoglobin ($\text{HbO}_2$) absorbs more light than deoxygenated hemoglobin ($\text{Hb}$).
* **Hardware Limitations:**
  1. The ESP32-CAM flash LED emits white phosphor light ($440-650\text{ nm}$) with **zero infrared output**.
  2. The OV2640 camera contains an internal physical optical filter that blocks infrared ($> 700\text{ nm}$).
* **Solution:** Use the dedicated **MAX30102** module over I2C.

### Metric 3: Blood Pressure (Systolic & Diastolic)
* **Status:** Physically impossible using camera alone or PPG alone.
* **Physics Barrier:** Blood pressure is hydrostatic fluid tension ($\text{mmHg}$), not optical color.
* **Solution:** Pulse Transit Time ($PTT$):
  * **AD8232 ECG:** Detects ventricular depolarization ($t_{ECG}$).
  * **MAX30102 PPG:** Detects peripheral pulse arrival at the finger ($t_{PPG}$).
  * $$PTT = t_{PPG} - t_{ECG}$$
  * Blood pressure is then computed via the Hughes hemodynamic model ($SBP = a \cdot \ln(PTT) + b$).
