# Windows Desktop `.EXE` Directory (`/windows_exe`)

This directory stores the **100% self-contained, offline Windows 64-bit `.exe` application** and packaging scripts for the **ESP32 Vital Sign & Computer Cardiogram Monitor**.

---

## 1. Self-Contained Offline Windows `.EXE` (No Installation or Internet Required)

| File Name | Size | Target Mode | Description |
| :--- | :--- | :--- | :--- |
| **`VitalMonitor_Cardiogram.exe`** | **~224 KB** | **100% Self-Contained Offline Desktop App** | Native 64-bit Windows executable (`PE32+ x86_64`) with the **entire compiled application embedded inside the `.exe`**. Double-clicking it starts an automatic local loopback server on `http://127.0.0.1:18765/` and opens the app in a standalone Windows desktop window with full **ESP32 USB Serial (`COM` port)** support—no cloud URLs and no `404` errors. |
| **`VitalMonitor_Standalone.html`** | **~897 KB** | **Single-File Portable HTML Bundle** | Complete all-in-one HTML + CSS + JS application in a single file. |
| **`VitalMonitor_Localhost.exe`** | **2 KB** | **Local Dev Server (`localhost:3000`)** | Native 64-bit Windows launcher that opens `http://localhost:3000` in a standalone desktop window. |

### How to Use `VitalMonitor_Cardiogram.exe` on Windows 10 / 11
1. Download **`VitalMonitor_Cardiogram.exe`** (click the **"Windows App (.exe)"** button in the top bar or inside the **Live PC Cardiogram** tab).
2. Plug your **ESP32** or **ESP32-C3 SuperMini** into a USB port (make sure **Thonny** is closed so the COM port is unlocked).
3. Double-click **`VitalMonitor_Cardiogram.exe`**.
   - *Note:* If Windows SmartScreen shows *"Windows protected your PC"*, click **More info** → **Run anyway**.
4. The app opens immediately in a standalone desktop window at `http://127.0.0.1:18765/`. Click **Connect ESP32 (USB Serial)**, select your `COM` port, and place your finger on the sensor.
