# Web App Simulator & Interactive Lab

This directory documents the interactive React + TypeScript web application simulator built for the ESP32-CAM Vitals Analyzer project.

---

## 1. Overview
The Web Simulator provides an interactive biomedical physics playground and code generation suite:
* **Interactive Waveform Synthesizer:** Real-time canvas simulation of physiological PPG pulses with variable heart rate, arterial stiffness, and dicrotic notch reflections.
* **Optical Physics Explorer:** Real-time Beer-Lambert attenuation model comparing $520\text{ nm}$ (Green), $660\text{ nm}$ (Red), and $880\text{ nm}$ (IR) through epidermis, dermis, subcutaneous tissue, and blood.
* **Blood Pressure Hemodynamics Visualizer:** Dual synchronized ECG ($R$-wave) and PPG ($t_{PPG}$) graphs showing real-time Pulse Transit Time ($PTT$) calculation.
* **MicroPython Code Lab:** Complete in-browser viewer and one-click downloader for `esp32_cam_heart_rate.py`, `max30102_hr_spo2.py`, and `ecg_ppg_ptt_blood_pressure.py`.
* **Hardware Wiring & Pinout Guide:** Pin-by-pin visual connection diagrams for FTDI programmer, MAX30102, and AD8232.

---

## 2. Local Development & Launching
To launch the simulator locally:
```bash
# Install dependencies
npm install

# Start Vite dev server on port 3000
npm run dev

# Open in browser:
# http://localhost:3000
```

---

## 3. Technology Stack
* **Framework:** React 19 + TypeScript
* **Build System:** Vite
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
