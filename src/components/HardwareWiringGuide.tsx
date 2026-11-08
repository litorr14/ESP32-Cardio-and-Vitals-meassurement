import React, { useState } from 'react';
import { Cpu, AlertTriangle, CheckCircle2, XCircle, Heart, Activity, Monitor, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export const HardwareWiringGuide: React.FC = () => {
  const [selectedBoard, setSelectedBoard] = useState<'esp32cam' | 'c3supermini'>('esp32cam');
  const [activeSensor, setActiveSensor] = useState<'ad8232' | 'station' | 'max30102' | 'lcd1602' | 'ftdi'>('ad8232');

  const c3SuperMiniPins = [
    { pin: '5V (VBUS)', type: 'Power (from USB-C)', status: 'recommended', note: 'Direct 5.0V from USB Type-C cable. Connect to LCD 1602 VCC for maximum contrast.' },
    { pin: '3V3', type: 'Regulated 3.3V Output', status: 'recommended', note: 'Clean on-board LDO output. Powers MAX30102 (VIN) and AD8232 ECG (3.3V).' },
    { pin: 'GND', type: 'Ground', status: 'safe', note: 'Common system ground rail. Connected to LCD, MAX30102, and AD8232 ground.' },
    { pin: 'GPIO 2', type: 'ADC1_CH2', status: 'recommended', note: 'Dedicated Analog Input for AD8232 ECG OUTPUT. 12-bit ADC unaffected by Wi-Fi/Bluetooth!' },
    { pin: 'GPIO 9', type: 'Hardware I2C SCL', status: 'recommended', note: 'Default I2C Clock: Connects to MAX30102 SCL and LCD 1602 SCL simultaneously.' },
    { pin: 'GPIO 8', type: 'Hardware I2C SDA', status: 'recommended', note: 'Default I2C Data: Connects to MAX30102 SDA and LCD 1602 SDA simultaneously.' },
    { pin: 'GPIO 0 / 1 / 3 / 4', type: 'ADC1 Channels', status: 'safe', note: 'Additional free ADC1 analog inputs. Available for secondary sensors or buttons.' },
    { pin: 'GPIO 18 / 19', type: 'Native USB-CDC', status: 'safe', note: 'Internal USB-D- and USB-D+ lines. Connected directly to USB-C port (no FTDI required!).' },
    { pin: 'GPIO 20 / 21', type: 'UART RX / TX', status: 'safe', note: 'Standard hardware UART pins if external serial hardware is needed.' },
  ];

  const esp32CamPins = [
    { pin: '5V', type: 'Power', status: 'safe', note: 'Primary 5V input. Connect to LCD 1602 VCC (mandatory for clear contrast) and FTDI 5V.' },
    { pin: '3V3', type: 'Power', status: 'safe', note: 'Regulated 3.3V output rail. Powers both MAX30102 and AD8232 ECG modules (draws < 30mA total).' },
    { pin: 'GND', type: 'Ground', status: 'safe', note: 'Common system ground rail. Must be shared between ESP32-CAM, MAX30102, LCD 1602, and AD8232.' },
    { pin: 'GPIO 2 (Pin 7)', type: 'Analog / ADC2', status: 'recommended', note: 'ADC2_CH2: Recommended analog input on Left Header Pin 7 for AD8232 OUTPUT.' },
    { pin: 'GPIO 14', type: 'I2C SCL', status: 'recommended', note: 'Shared Multi-Drop I2C Clock: Connects to MAX30102 SCL and LCD 1602 SCL simultaneously.' },
    { pin: 'GPIO 13', type: 'I2C SDA', status: 'recommended', note: 'Shared Multi-Drop I2C Data: Connects to MAX30102 SDA and LCD 1602 SDA simultaneously.' },
    { pin: 'GPIO 12', type: 'Digital / Strapping', status: 'safe', note: 'Available pin. Must stay LOW at boot or flash voltage triggers 1.8V error. Keep open or pull-down.' },
    { pin: 'GPIO 4', type: 'Flash LED', status: 'warning', note: 'Connected to onboard high-power flashlight LED. Used for camera PPG mode with low PWM (duty 25).' },
    { pin: 'GPIO 0', type: 'Bootloader', status: 'warning', note: 'Boot strapping pin: GND for flashing firmware via FTDI; OPEN/DISCONNECTED for normal code execution.' },
    { pin: 'GPIO 1 (U0T)', type: 'UART TX', status: 'safe', note: 'Serial TX (115200 baud). Connects to FTDI RX for Thonny REPL oscilloscope trace.' },
    { pin: 'GPIO 3 (U0R)', type: 'UART RX', status: 'safe', note: 'Serial RX. Connects to FTDI TX for program upload.' },
    { pin: 'GPIO 16', type: 'PSRAM', status: 'conflict', note: 'RESERVED: Internally hardwired to 4MB PSRAM. NEVER connect external wires to GPIO 16!' },
    { pin: 'GPIO 35 / 34', type: 'Camera Data', status: 'conflict', note: 'RESERVED: OV2640 parallel bus lines Y9 and Y8. Do not connect.' },
  ];

  return (
    <div className="space-y-8">
      {/* Target Board Selector Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
              <Cpu className="w-3.5 h-3.5" /> Hardware Architecture Selector
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Select Your Target Microcontroller
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Switch schematics between your current <strong>ESP32-CAM</strong> and your incoming <strong>ESP32-C3 SuperMini</strong>.
            </p>
          </div>

          <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700 shrink-0">
            <button
              onClick={() => setSelectedBoard('esp32cam')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                selectedBoard === 'esp32cam'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>AI-Thinker ESP32-CAM</span>
              <span className="text-[10px] bg-blue-700/60 px-1.5 py-0.5 rounded font-mono">Current</span>
            </button>
            <button
              onClick={() => setSelectedBoard('c3supermini')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                selectedBoard === 'c3supermini'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>ESP32-C3 SuperMini</span>
              <span className="text-[10px] bg-purple-700/60 px-1.5 py-0.5 rounded font-mono">New Board</span>
            </button>
          </div>
        </div>

        {/* Board Comparison Highlights */}
        {selectedBoard === 'c3supermini' ? (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-800 text-xs">
            <div className="bg-purple-950/40 border border-purple-800/50 p-3 rounded-lg">
              <span className="font-bold text-purple-300 block mb-1">Direct USB Type-C (Native CDC)</span>
              <span className="text-slate-300 text-[11px]">No FTDI programmer needed! Plug USB-C straight into your PC for Thonny and the Live Cardiogram.</span>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-lg">
              <span className="font-bold text-emerald-300 block mb-1">100% ADC1 Analog Input</span>
              <span className="text-slate-300 text-[11px]">All C3 analog channels are on ADC1. Zero conflicts with Wi-Fi/Bluetooth or camera clocks.</span>
            </div>
            <div className="bg-blue-950/40 border border-blue-800/50 p-3 rounded-lg">
              <span className="font-bold text-blue-300 block mb-1">Compact Wearable Form Factor</span>
              <span className="text-slate-300 text-[11px]">Ultra-small 22.5 &times; 18 mm footprint with direct 5V VBUS for crisp LCD 1602 contrast.</span>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-800 text-xs">
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-lg">
              <span className="font-bold text-blue-300 block mb-1">AD8232 ECG: GPIO 2</span>
              <span className="text-slate-300 text-[11px]">Physical Pin 7 on Left Header (ADC2_CH2). Filtered oversampling prevents zero-glitches.</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-lg">
              <span className="font-bold text-emerald-300 block mb-1">I2C Bus: GPIO 14 &amp; 13</span>
              <span className="text-slate-300 text-[11px]">Multi-drop shared bus for MAX30102 (0x57) and LCD 1602 (0x27) with differential latching.</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-lg">
              <span className="font-bold text-amber-300 block mb-1">Programming via FTDI</span>
              <span className="text-slate-300 text-[11px]">Connect FTDI 5V/GND, cross TX/RX. Tie GPIO 0 to GND only during firmware flashing.</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Board Detail: ESP32-C3 SuperMini */}
      {selectedBoard === 'c3supermini' && (
        <div className="bg-white rounded-xl border border-purple-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">
                ESP32-C3 SuperMini Complete Wiring Diagram
              </h3>
            </div>
            <span className="text-xs font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full">
              Firmware: main_esp32_c3_supermini.py
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Component</th>
                  <th className="py-2.5 px-4">Component Pin</th>
                  <th className="py-2.5 px-4 font-bold text-purple-700">ESP32-C3 SuperMini Pin</th>
                  <th className="py-2.5 px-4">SuperMini Pin Location</th>
                  <th className="py-2.5 px-4">Functional Role &amp; Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                <tr className="bg-white">
                  <td className="py-2.5 px-4 font-bold text-amber-600">LCD 1602 I2C</td>
                  <td className="py-2.5 px-4">VCC</td>
                  <td className="py-2.5 px-4 font-bold text-purple-700">5V (VBUS)</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Left Header Pin 1 (Top)</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Direct 5V from USB-C cable. Gives ultra-crisp character contrast.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 px-4 font-bold text-amber-600">LCD 1602 I2C</td>
                  <td className="py-2.5 px-4">GND</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Left Header Pin 2</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Common system reference ground.</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-2.5 px-4 font-bold text-amber-600">LCD 1602 I2C</td>
                  <td className="py-2.5 px-4">SCL</td>
                  <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 9</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Right Header Pin 5</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Hardware I2C Clock (Multi-drop shared line).</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 px-4 font-bold text-amber-600">LCD 1602 I2C</td>
                  <td className="py-2.5 px-4">SDA</td>
                  <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 8</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Right Header Pin 4</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Hardware I2C Data (Multi-drop shared line).</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-2.5 px-4 font-bold text-emerald-600">MAX30102 PPG</td>
                  <td className="py-2.5 px-4">VIN</td>
                  <td className="py-2.5 px-4 font-bold text-purple-700">3V3</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Left Header Pin 3</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Clean 3.3V power from C3 on-board regulator.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 px-4 font-bold text-emerald-600">MAX30102 PPG</td>
                  <td className="py-2.5 px-4">GND</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Left Header Pin 2</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Common system reference ground.</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-2.5 px-4 font-bold text-emerald-600">MAX30102 PPG</td>
                  <td className="py-2.5 px-4">SCL</td>
                  <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 9</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Right Header Pin 5</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Connected together with LCD 1602 SCL.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 px-4 font-bold text-emerald-600">MAX30102 PPG</td>
                  <td className="py-2.5 px-4">SDA</td>
                  <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 8</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Right Header Pin 4</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Connected together with LCD 1602 SDA.</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-2.5 px-4 font-bold text-rose-600">AD8232 ECG</td>
                  <td className="py-2.5 px-4">3.3V</td>
                  <td className="py-2.5 px-4 font-bold text-purple-700">3V3</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Left Header Pin 3</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Shared 3.3V rail.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 px-4 font-bold text-rose-600">AD8232 ECG</td>
                  <td className="py-2.5 px-4">GND</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Left Header Pin 2</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Common system reference ground.</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-2.5 px-4 font-bold text-rose-600">AD8232 ECG</td>
                  <td className="py-2.5 px-4">OUTPUT</td>
                  <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 2 (ADC1_CH2)</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Left Header Pin 6</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Clean 12-bit analog ECG input with zero Wi-Fi contention.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-xs text-purple-950 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <strong>Firmware Ready to Flash:</strong> When your ESP32-C3 SuperMini arrives, simply download{' '}
              <code className="bg-purple-100 px-1 py-0.5 rounded font-mono font-bold">main_esp32_c3_supermini.py</code> from the Code Suite tab, save it as{' '}
              <code className="bg-purple-100 px-1 py-0.5 rounded font-mono font-bold">main.py</code> on the board in Thonny, and connect the USB-C cable directly. It will auto-boot and stream instantly!
            </div>
          </div>
        </div>
      )}
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Phase 3 Hardware Wiring &amp; Electrical Architecture
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
          The <strong>AD8232 ECG Sensor</strong> captures ventricular cardiac biopotentials, while the <strong>MAX30102 Pulse Oximeter</strong> detects the optical capillary arrival. Synchronizing both signals through the <strong>ESP32-CAM</strong> allows computing <strong>Pulse Transit Time (PTT)</strong> and <strong>Blood Pressure (mmHg)</strong> in real time.
        </p>
      </div>

      {/* Interactive Wiring Schematics */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-base font-bold text-slate-900">
            Connection Schematics &amp; Pinout
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSensor('ad8232')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSensor === 'ad8232'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              AD8232 ECG (Blood Pressure)
            </button>
            <button
              onClick={() => setActiveSensor('station')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSensor === 'station'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              All-In-One Triple Station
            </button>
            <button
              onClick={() => setActiveSensor('max30102')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSensor === 'max30102'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              MAX30102 (SpO2 &amp; HR)
            </button>
            <button
              onClick={() => setActiveSensor('lcd1602')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSensor === 'lcd1602'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              LCD 1602 I2C Display
            </button>
            <button
              onClick={() => setActiveSensor('ftdi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSensor === 'ftdi'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              FTDI Programmer
            </button>
          </div>
        </div>

        {/* Tab 1: AD8232 ECG Sensor Focus */}
        {activeSensor === 'ad8232' && (
          <div className="space-y-6">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-950">
              <strong className="font-semibold text-rose-950">AD8232 ECG Single-Lead Analog Front-End:</strong>
              <p className="mt-1">
                The AD8232 amplifies tiny microvolt cardiac voltages with an instrumentation amplifier, 2-pole high-pass filter, and 3-pole low-pass filter (0.5 Hz &ndash; 40 Hz). It feeds an analog voltage directly to <strong>GPIO 33 (ADC1)</strong> on the ESP32-CAM.
              </p>
            </div>

            {/* AD8232 Pinout Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">AD8232 Pin</th>
                    <th className="py-2.5 px-4">ESP32-CAM Pin</th>
                    <th className="py-2.5 px-4">Function</th>
                    <th className="py-2.5 px-4">Wiring Guidance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-rose-600">3.3V</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">3.3V</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Power</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Connect to the ESP32-CAM 3.3V rail. Never connect to 5V (damages AD8232).</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-rose-600">GND</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Ground</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Common system reference ground.</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-rose-600">OUTPUT</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 2 (or GPIO 12)</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Analog Out</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">
                      <strong>Recommended: GPIO 2 (Pin 7 on Left Header)</strong>. No soldering required! Uses standard jumper wire. (Note: GPIO 33 is tied to the onboard red LED on the back of the PCB and is not on the header).
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-slate-400">LO- / LO+</td>
                    <td className="py-2.5 px-4 font-bold text-slate-400">Leave Unconnected</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Leads-Off Detect</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Software detects disconnected leads automatically when OUTPUT saturates (&gt;3980 or &lt;70 counts).</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-slate-400">SDN</td>
                    <td className="py-2.5 px-4 font-bold text-slate-400">Leave Unconnected</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Shutdown</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Breakout board has internal pullup resistor to 3.3V, keeping the IC awake.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Electrode Placement Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600" />
                3-Lead ECG Electrode Placement Guide (Lead I / Lead II)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-lg border border-rose-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 block"></span>
                    <span className="font-bold font-mono text-slate-900">RA (Right Arm / Red)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Attach to <strong>right inner wrist/forearm</strong>, or upper right chest below the right clavicle.
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 block border border-amber-400"></span>
                    <span className="font-bold font-mono text-slate-900">LA (Left Arm / Yellow)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Attach to <strong>left inner wrist/forearm</strong>, or upper left chest below the left clavicle.
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span>
                    <span className="font-bold font-mono text-slate-900">RL (Right Leg / Green)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Attach to <strong>right lower abdomen</strong>, right hip, or right ankle (reference ground).
                  </p>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
                <strong>Pro-Tip:</strong> Clean the skin with an alcohol swab and let it dry before sticking gel pads. Keep your arms relaxed and resting on a table to eliminate electromyographic (muscle tremor) noise.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: All-In-One Triple Station */}
        {activeSensor === 'station' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950">
              <strong className="font-semibold text-indigo-950">Full Autonomous Triple-Vital Signs Station:</strong>
              <p className="mt-1">
                Both the MAX30102 and LCD 1602 share the exact same two I2C pins (GPIO 14 for SCL, GPIO 13 for SDA) without collision. The AD8232 uses GPIO 33 (ADC1).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Component</th>
                    <th className="py-2.5 px-4">Pin on Component</th>
                    <th className="py-2.5 px-4">ESP32-CAM Pin</th>
                    <th className="py-2.5 px-4">Role / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-amber-600">LCD 1602</td>
                    <td className="py-2.5 px-4">VCC</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">5V (or VIN)</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Display controller power (must be 5V)</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-amber-600">LCD 1602</td>
                    <td className="py-2.5 px-4">GND</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Common ground</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-amber-600">LCD 1602</td>
                    <td className="py-2.5 px-4">SCL</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 14</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Shared I2C Clock (Address 0x27)</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-amber-600">LCD 1602</td>
                    <td className="py-2.5 px-4">SDA</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 13</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Shared I2C Data</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-emerald-600">MAX30102</td>
                    <td className="py-2.5 px-4">VIN</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">3.3V</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Sensor power</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-emerald-600">MAX30102</td>
                    <td className="py-2.5 px-4">GND</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Common ground</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-emerald-600">MAX30102</td>
                    <td className="py-2.5 px-4">SCL</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 14</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Shared I2C Clock (Address 0x57)</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-emerald-600">MAX30102</td>
                    <td className="py-2.5 px-4">SDA</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 13</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Shared I2C Data</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-rose-600">AD8232 ECG</td>
                    <td className="py-2.5 px-4">3.3V</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">3.3V</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Shared 3.3V rail</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-rose-600">AD8232 ECG</td>
                    <td className="py-2.5 px-4">GND</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Common ground</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-rose-600">AD8232 ECG</td>
                    <td className="py-2.5 px-4">OUTPUT</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 2 (or 12)</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Analog ECG input (Header Pin 7 / ADC2_CH2)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: MAX30102 Pulse Oximeter */}
        {activeSensor === 'max30102' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950">
              <strong className="font-semibold text-emerald-950">MAX30102 Optical Sensor:</strong> Dual 660 nm (Red) and 880 nm (Infrared) photoplethysmogram sensor. Connected via I2C at address <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">0x57</code>.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">MAX30102 Pin</th>
                    <th className="py-2.5 px-4">ESP32-CAM Pin</th>
                    <th className="py-2.5 px-4">Function</th>
                    <th className="py-2.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-emerald-600">VIN</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">3.3V</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Power</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Regulated 3.3V rail.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GND</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Ground</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Common ground.</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-emerald-600">SCL</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 14</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">I2C Clock</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Shared multi-drop clock line.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-emerald-600">SDA</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 13</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">I2C Data</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Shared multi-drop data line.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: LCD 1602 I2C Display */}
        {activeSensor === 'lcd1602' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950">
              <strong className="font-semibold text-amber-950">LCD 1602 Character Display (PCF8574 Backpack):</strong> Connected over the shared I2C bus at address <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">0x27</code> (or <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">0x3F</code>).
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">LCD 1602 Pin</th>
                    <th className="py-2.5 px-4">ESP32-CAM Pin</th>
                    <th className="py-2.5 px-4">Function</th>
                    <th className="py-2.5 px-4">Critical Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-amber-600">VCC</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">5V (or VIN)</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Power</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500"><strong>MUST BE 5V</strong>. At 3.3V, characters appear invisible or faint.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-amber-600">GND</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Ground</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Common system ground.</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-amber-600">SCL</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 14</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">I2C Clock</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Shared with MAX30102.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-amber-600">SDA</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">GPIO 13</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">I2C Data</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">Shared with MAX30102.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600">
              <strong>Contrast Adjustment:</strong> The blue potentiometer on the rear PCF8574 backpack adjusts screen contrast. If the backlight turns on but no text appears, rotate the brass screw with a small flathead screwdriver until clear text blocks appear.
            </div>
          </div>
        )}

        {/* Tab 5: FTDI Programmer */}
        {activeSensor === 'ftdi' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800">
              <strong className="font-semibold text-slate-900">FTDI USB Programmer Wiring:</strong>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">FTDI Adapter Pin</th>
                    <th className="py-2.5 px-4">ESP32-CAM Pin</th>
                    <th className="py-2.5 px-4">Flashing Firmware</th>
                    <th className="py-2.5 px-4">Running Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-indigo-600">VCC (Set to 5V)</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">5V</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Connected</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Connected</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-indigo-600">GND</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">GND</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Connected</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Connected</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-indigo-600">TXD</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">U0R (GPIO 3)</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Crossed (TX &rarr; RX)</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Crossed (TX &rarr; RX)</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-indigo-600">RXD</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">U0T (GPIO 1)</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Crossed (RX &rarr; TX)</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Crossed (RX &rarr; TX)</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 font-bold text-amber-600">BOOT JUMPER</td>
                    <td className="py-2.5 px-4 font-bold text-amber-600">GPIO 0 &rarr; GND</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-amber-600">TIED TO GND</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-emerald-600">OPEN / DISCONNECTED</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Complete ESP32-CAM Pin Availability Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          Full ESP32-CAM Pin Allocation Matrix
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Avoid conflicting with the internal camera bus and 4MB PSRAM:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {esp32CamPins.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                item.status === 'recommended'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  : item.status === 'conflict'
                  ? 'bg-red-50/60 border-red-200 text-red-950'
                  : item.status === 'warning'
                  ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm">{item.pin}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/80 border">
                    {item.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{item.note}</p>
              </div>

              <div className="shrink-0 mt-0.5">
                {item.status === 'recommended' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {item.status === 'conflict' && <XCircle className="w-4 h-4 text-red-600" />}
                {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {item.status === 'safe' && <span className="w-2 h-2 rounded-full bg-slate-400 block" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
