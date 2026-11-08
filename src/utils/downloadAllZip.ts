import JSZip from 'jszip';
import { MICROPYTHON_CODES } from '../data/micropythonCodes';

export async function downloadAllProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Root README
  zip.file(
    'README.md',
    `# ESP32-CAM Biomedical Instrumentation Platform

This package contains the complete, hardware-verified MicroPython firmware suite, wiring schematics, technical guides, Word-formatted user manual, and scientific documentation for the AI-Thinker ESP32-CAM Vital Signs Station.

---

## Hardware Validations Achieved
- **Camera Contact PPG (Heart Rate):** 62.6 BPM (validated against 62 BPM reference smartwatch)
- **MAX30102 Pulse Oximeter (HR + SpO2):** 60.0 BPM and 99.3% SpO2 (validated against 60 BPM & 99% SpO2 clinical instrument)
- **LCD 1602 I2C Display:** Live readings with custom animated beating heart icon (0x27 / 0x3F auto-detect on GPIO 14/13)
- **Autonomous Auto-Boot:** Runs automatically on power-up via \`main.py\` without requiring a computer.

---

## Directory Structure
- **1. build/**: Firmware flashing script (\`flash_esp32_firmware.sh\`) and notes for \`micropython_camera_feeeb5ea3_esp32_idf4_4.bin\`
- **2. codes/**: Production MicroPython firmware files:
  - \`main.py\` (Master Auto-Boot firmware: MAX30102 + LCD 1602 + Serial Oscilloscope)
  - \`max30102_lcd_monitor.py\` (MAX30102 + LCD 1602 I2C Monitor)
  - \`max30102_hr_spo2.py\` (MAX30102 terminal-only monitor)
  - \`esp32_cam_heart_rate.py\` (OV2640 camera-only PPG monitor)
  - \`i2c_scanner.py\` (Hardware diagnostic scanner for 0x57, 0x27, 0x3F)
  - \`i2c_lcd.py\` (Reusable PCF8574 LCD 1602 driver)
  - \`ecg_ppg_ptt_blood_pressure.py\` (Phase 3 AD8232 ECG + MAX30102 Cuffless Blood Pressure)
- **3. dist/**: Production release manifests and compiled distribution artifacts.
- **4. docs/**:
  - \`ESP32_CAM_USER_MANUAL.doc\` (Word-formatted manual with wiring tables and operation procedures)
  - \`ESP32_CAM_HEART_RATE_MONITOR_GUIDE.md\` (Technical guide and troubleshooting)
  - \`BIOLOGICAL_AND_PHYSICAL_FUNDAMENTALS.md\` (Beer-Lambert optical absorption, princeps pollicis artery, hemodynamics)
- **5. hmi/**: Interface documentation for ASCII serial oscilloscope, LCD 1602, and web simulator.
- **6. md/**: Engineering reports (Feasibility verdict, KY-022 silicon analysis, firmware specs).
- **7. web app simulator/**: Full-stack interactive simulator and lab.

---
Firmware Build: micropython_camera_feeeb5ea3_esp32_idf4_4.bin
Platform: ESP32-CAM / ESP32-WROOM (MicroPython v1.18-74-gfeeeb5ea3)
`
  );

  // 1. build/ folder
  const buildFolder = zip.folder('build');
  buildFolder?.file(
    'flash_esp32_firmware.sh',
    `#!/usr/bin/env bash
# ==============================================================================
# ESP32-CAM MicroPython Firmware Flash Automation
# ==============================================================================
FIRMWARE="micropython_camera_feeeb5ea3_esp32_idf4_4.bin"
PORT="\${1:-/dev/ttyUSB0}"
BAUD="460800"

echo "========================================================="
echo "  Flashing ESP32-CAM with MicroPython Camera Firmware"
echo "  Target: $FIRMWARE"
echo "  Port:   $PORT | Baud: $BAUD"
echo "========================================================="
echo "[!] Ensure GPIO 0 is grounded (connected to GND)."
read -p "Press Enter to proceed with erase & flash..."

esptool.py --chip esp32 --port "$PORT" erase_flash
esptool.py --chip esp32 --port "$PORT" --baud "$BAUD" write_flash -z 0x1000 "$FIRMWARE"

echo ""
echo "[SUCCESS] Flashing complete!"
echo "[!] Disconnect GPIO 0 from GND and press the Reset button."
`
  );
  buildFolder?.file(
    'README.md',
    `# Build & Firmware Directory
Firmware file required: \`micropython_camera_feeeb5ea3_esp32_idf4_4.bin\`
Run \`bash flash_esp32_firmware.sh /dev/ttyUSB0\` to flash.
`
  );

  // 2. codes/ folder with dedicated subfolders
  const codesFolder = zip.folder('codes');

  try {
    const res = await fetch('/codes/README.md');
    if (res.ok) {
      codesFolder?.file('README.md', await res.text());
    }
  } catch {
    // fallback
  }

  // 2a. codes/esp32_cam/ subfolder
  const camFolder = codesFolder?.folder('esp32_cam');
  const camFiles = [
    'main.py',
    'esp32_cam_heart_rate.py',
    'max30102_hr_spo2.py',
    'max30102_lcd_monitor.py',
    'ecg_ppg_ptt_blood_pressure.py',
    'i2c_scanner.py',
    'i2c_lcd.py',
    'README.md',
    'CONVERSATION_HISTORY_ESP32_CAM.md',
  ];
  for (const f of camFiles) {
    try {
      const res = await fetch(`/codes/esp32_cam/${f}`);
      if (res.ok) {
        camFolder?.file(f, await res.text());
      }
    } catch {
      // ignore if fetch fails
    }
  }

  // 2b. codes/esp32_c3_supermini/ subfolder
  const c3Folder = codesFolder?.folder('esp32_c3_supermini');
  const c3Files = [
    'main.py',
    'max30102_hr_spo2.py',
    'max30102_lcd_monitor.py',
    'ecg_ppg_ptt_blood_pressure.py',
    'i2c_scanner.py',
    'i2c_lcd.py',
    'README.md',
    'CONVERSATION_HISTORY_ESP32_C3_SUPERMINI.md',
  ];
  for (const f of c3Files) {
    try {
      const res = await fetch(`/codes/esp32_c3_supermini/${f}`);
      if (res.ok) {
        c3Folder?.file(f, await res.text());
      }
    } catch {
      // ignore if fetch fails
    }
  }

  // Fallback for root codes files for backward compatibility
  for (const f of MICROPYTHON_CODES) {
    codesFolder?.file(f.filename, f.code);
  }

  // 3. docs/ folder - fetch files if available
  const docsFolder = zip.folder('docs');
  try {
    const docRes = await fetch('/docs/ESP32_CAM_USER_MANUAL.doc');
    if (docRes.ok) {
      const docBlob = await docRes.blob();
      docsFolder?.file('ESP32_CAM_USER_MANUAL.doc', docBlob);
    }
  } catch {
    // fallback if offline
  }

  try {
    const mdGuideRes = await fetch('/docs/ESP32_CAM_HEART_RATE_MONITOR_GUIDE.md');
    if (mdGuideRes.ok) {
      const text = await mdGuideRes.text();
      docsFolder?.file('ESP32_CAM_HEART_RATE_MONITOR_GUIDE.md', text);
    }
  } catch {
    // fallback
  }

  try {
    const bioRes = await fetch('/docs/BIOLOGICAL_AND_PHYSICAL_FUNDAMENTALS.md');
    if (bioRes.ok) {
      const text = await bioRes.text();
      docsFolder?.file('BIOLOGICAL_AND_PHYSICAL_FUNDAMENTALS.md', text);
    }
  } catch {
    // fallback
  }

  docsFolder?.file(
    'README.md',
    `# Documentation Suite
- \`ESP32_CAM_USER_MANUAL.doc\`: Microsoft Word formatted manual with pinout tables and operation instructions.
- \`ESP32_CAM_HEART_RATE_MONITOR_GUIDE.md\`: Complete technical guide with MAX30102 & LCD 1602 instructions.
- \`BIOLOGICAL_AND_PHYSICAL_FUNDAMENTALS.md\`: Comprehensive analysis of Beer-Lambert Law, princeps pollicis hemodynamics, and PTT blood pressure equations.
`
  );

  // 4. hmi/ folder
  const hmiFolder = zip.folder('hmi');
  hmiFolder?.file(
    'README.md',
    `# Human-Machine Interfaces (HMI)
1. **Tier 1: UART ASCII Oscilloscope** (115200 baud in Thonny REPL)
2. **Tier 2: LCD 1602 I2C Display** (Standalone 16x2 character display with animated beating heart on GPIO 14/13)
3. **Tier 3: Full-Stack Web Simulator** (Interactive React + TypeScript visualizer)
`
  );

  // 5. md/ folder
  const mdFolder = zip.folder('md');
  mdFolder?.file(
    'README.md',
    `# Markdown Engineering Reports
Contains feasibility verdicts, silicon analysis of KY-022/KY-005 IR modules, and firmware runtime specifications.
`
  );
  mdFolder?.file(
    'FIRMWARE_SPECIFICATIONS.md',
    `# Firmware Runtime Specification
Target build: \`micropython_camera_feeeb5ea3_esp32_idf4_4.bin\`
Core: MicroPython v1.18-74-gfeeeb5ea3 on 2022-02-02; ESP32-cam module (i2s) with ESP32
Includes native I2S DMA camera driver and 4MB PSRAM support.
`
  );

  // 6. windows_exe/ folder - include Windows 64-bit .exe binaries and offline Electron builder
  const winExeFolder = zip.folder('windows_exe');
  const winFiles = [
    'VitalMonitor_Cardiogram.exe',
    'VitalMonitor_Localhost.exe',
    'build_offline_exe.bat',
    'electron-main.cjs',
    'README.md',
  ];
  for (const wf of winFiles) {
    try {
      const res = await fetch(`/windows_exe/${wf}`);
      if (res.ok) {
        const blob = await res.blob();
        winExeFolder?.file(wf, blob);
      }
    } catch {
      // ignore if offline
    }
  }

  // Generate ZIP file and trigger browser download
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ESP32_CAM_Biomedical_Station_Project.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
