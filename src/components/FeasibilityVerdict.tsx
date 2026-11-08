import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';

interface FeasibilityVerdictProps {
  onNavigateToTab: (tabId: string) => void;
}

export const FeasibilityVerdict: React.FC<FeasibilityVerdictProps> = ({ onNavigateToTab }) => {
  return (
    <div className="space-y-8">
      {/* High-Impact Executive Summary Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            Engineering Feasibility Assessment & Scientific Analysis
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Can the ESP32-CAM measure HR, SpO2, and Blood Pressure in MicroPython?
          </h2>
          
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Here is the direct engineering answer to your two core questions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Question 1: Can we do it with ESP32-CAM alone?
              </div>
              <div className="text-sm font-medium text-slate-200">
                <span className="text-emerald-400 font-bold">Partially (Heart Rate only)</span>. The camera alone <span className="text-red-400 font-bold">CANNOT</span> accurately measure <span className="text-white font-semibold">SpO2</span> or <span className="text-white font-semibold">Blood Pressure</span> due to fundamental optical physics and hemodynamic laws.
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Question 2: Do we need other sensors?
              </div>
              <div className="text-sm font-medium text-slate-200">
                <span className="text-amber-300 font-bold">YES, definitely!</span> To read true SpO2 and Blood Pressure, you need dedicated optical and biosignal sensors connected to the ESP32 (e.g., <span className="text-emerald-300 font-semibold">MAX30102</span> + <span className="text-indigo-300 font-semibold">AD8232 ECG</span>).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Parameter Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Heart Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Parameter 1</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                FEASIBLE
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">Heart Rate (BPM)</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Achieved by placing the fingertip against the OV2640 camera lens with the onboard Flash LED turned on at low power.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800">Physical Principle:</span>
                <p className="text-slate-600 mt-0.5">
                  Contact Photoplethysmography (PPG). Arterial pulsations modulate tissue absorption in the <strong>Green color channel</strong> (520–550 nm), producing periodic intensity oscillations.
                </p>
              </div>

              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-amber-900">
                <span className="font-semibold text-amber-800">ESP32-CAM Caveat:</span>
                <p className="text-amber-700 mt-0.5">
                  Flash LED gets very hot if driven at 100% (must use PWM ~15%). Frame rate in MicroPython is limited to 15–25 FPS (QQVGA 160x120), adequate only for resting pulse.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Extra sensor needed?</span>
            <span className="font-bold text-slate-700">Optional (Cam works)</span>
          </div>
        </div>

        {/* 2. SpO2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Parameter 2</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                SENSOR NEEDED
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">Blood Oxygen (SpO2)</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Standard white LED and camera lens <strong>cannot measure true SpO2</strong> accurately without severe error (±12–20%).
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800">The Optical Physics:</span>
                <p className="text-slate-600 mt-0.5">
                  Beer-Lambert Law demands <strong>TWO distinct wavelengths</strong>: <strong>660 nm (Red)</strong> where deoxygenated Hb absorbs heavily, and <strong>880–940 nm (Infrared)</strong> where oxygenated HbO2 absorbs heavily.
                </p>
              </div>

              <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 text-red-900">
                <span className="font-semibold text-red-800">Why ESP32-CAM Fails:</span>
                <p className="text-red-700 mt-0.5">
                  1) White LED emits blue & yellow phosphor, <strong>zero 880nm IR</strong>.<br />
                  2) OV2640 has an <strong>IR-cut filter</strong> blocking &gt;700nm. Attempting "RGB ratios" is scientifically flawed.
                </p>
              </div>
              <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 text-slate-700 mt-2">
                <button
                  onClick={() => onNavigateToTab('ir-sensors')}
                  className="text-left w-full text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center justify-between"
                >
                  <span>Can we use KY-022 &amp; KY-005 IR modules?</span>
                  <ArrowRight className="w-3 h-3 shrink-0 ml-1" />
                </button>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  No: KY-022 has a 38kHz remote filter that suppresses heart pulses.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Extra sensor needed?</span>
            <span className="font-bold text-amber-600">YES: MAX30102 (~$2.50)</span>
          </div>
        </div>

        {/* 3. Blood Pressure */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Parameter 3</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                CANNOT DO WITH CAM
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">Systolic & Diastolic BP</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Blood pressure is hydraulic mechanical pressure (mmHg). A single camera sensor cannot measure arterial wall pressure directly.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800">Hemodynamic Principle:</span>
                <p className="text-slate-600 mt-0.5">
                  Cuffless BP estimation requires <strong>Pulse Transit Time (PTT)</strong>: measuring the speed of the arterial pressure wave between the heart (ECG R-wave) and finger (PPG arrival).
                </p>
              </div>

              <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 text-red-900">
                <span className="font-semibold text-red-800">Why ESP32-CAM Fails:</span>
                <p className="text-red-700 mt-0.5">
                  A single optical point has no reference baseline. Single-point Pulse Wave Analysis (PWA) requires 200+ Hz sampling &amp; individual cuff calibration, which MicroPython video cannot provide.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Extra sensor needed?</span>
            <span className="font-bold text-red-600">YES: ECG + PPG or Cuff</span>
          </div>
        </div>
      </div>

      {/* MicroPython Firmware Critical Warning */}
      <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-900">
            <strong className="font-semibold text-amber-950">Important MicroPython Constraint:</strong> Official MicroPython firmware from <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-amber-900">micropython.org</code> does <strong>not</strong> include the OV2640 camera C-driver. To execute camera code in MicroPython, you must flash a specialized ESP32-CAM build (e.g. Lemariva's camera firmware).
          </div>
        </div>
        <button
          onClick={() => onNavigateToTab('code')}
          className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          View Flashing Guide &amp; Code
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recommended Sensor Architecture Solutions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">
            Recommended Hardware Architecture for Your Project
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mb-6">
          To successfully deliver all three vitals (Heart Rate, SpO2, and Blood Pressure) on your ESP32-CAM project, here are the two practical engineering routes:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Route A: Dual Sensor Cuffless */}
          <div className="border border-indigo-200 rounded-xl p-5 bg-gradient-to-b from-indigo-50/40 to-white relative">
            <span className="absolute top-4 right-4 text-[10px] uppercase font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
              Recommended for Research
            </span>
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm mb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-mono">A</span>
              ESP32 + MAX30102 + AD8232 (PTT Method)
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Uses the MAX30102 for authentic 660nm/880nm dual-wavelength SpO2 and HR, paired with an AD8232 ECG sensor module. Measures Pulse Transit Time to estimate continuous blood pressure trends.
            </p>
            <ul className="text-xs space-y-1.5 text-slate-700">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <strong>SpO2:</strong> ±2% accuracy via true Red/IR ratio of ratios
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <strong>Heart Rate:</strong> Medical grade optical pulse &amp; ECG R-peak
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <strong>Blood Pressure:</strong> Cuffless estimation calibrated to user
              </li>
              <li className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] pt-1">
                Hardware Cost: ~$6 total (MAX30102 $2.50 + AD8232 $3.50)
              </li>
            </ul>
          </div>

          {/* Route B: MAX30102 + Digital Cuff Module */}
          <div className="border border-emerald-200 rounded-xl p-5 bg-gradient-to-b from-emerald-50/40 to-white relative">
            <span className="absolute top-4 right-4 text-[10px] uppercase font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Clinical Standard
            </span>
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-mono">B</span>
              ESP32 + MAX30102 + Oscillometric Cuff
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Uses MAX30102 for fingertip pulse and blood oxygen, plus a motorized blood pressure cuff module (MPX5050GP pressure transducer or Bluetooth BLE cuff) for FDA/CE grade Systolic/Diastolic readings.
            </p>
            <ul className="text-xs space-y-1.5 text-slate-700">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <strong>SpO2:</strong> High accuracy 70–100% saturation
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <strong>Heart Rate:</strong> Real-time dual verification
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <strong>Blood Pressure:</strong> Gold standard oscillometric mmHg accuracy
              </li>
              <li className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] pt-1">
                Hardware Cost: ~$15–$25 (includes air pump &amp; valve)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
