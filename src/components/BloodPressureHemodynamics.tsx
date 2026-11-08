import React, { useState } from 'react';
import { Activity, Clock, Heart, AlertOctagon, CheckCircle2, ChevronRight, Sliders } from 'lucide-react';

export const BloodPressureHemodynamics: React.FC = () => {
  const [pttValue, setPttValue] = useState<number>(240); // ms
  const [arterialStiffness, setArterialStiffness] = useState<number>(1.0); // 0.8 (elastic) to 1.3 (stiff)

  // Calculate estimated BP based on Moens-Korteweg log-linear PTT model
  // SBP = a * ln(PTT) + b
  // DBP = c * ln(PTT) + d
  const calculateBP = (ptt: number, stiffness: number) => {
    // Slower PTT = lower BP, Faster PTT = higher BP
    const normalizedPtt = ptt / stiffness;
    const logPtt = Math.log(normalizedPtt);

    // Standard clinical regression coefficients
    const rawSbp = -75.0 * logPtt + 530.0;
    const rawDbp = -48.0 * logPtt + 344.0;

    const sbp = Math.round(Math.max(85, Math.min(195, rawSbp)));
    const dbp = Math.round(Math.max(50, Math.min(125, rawDbp)));

    let category = 'Normal';
    let colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (sbp >= 140 || dbp >= 90) {
      category = 'Stage 2 Hypertension';
      colorClass = 'text-red-700 bg-red-50 border-red-200';
    } else if (sbp >= 130 || dbp >= 80) {
      category = 'Stage 1 Hypertension';
      colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (sbp >= 120 && dbp < 80) {
      category = 'Elevated';
      colorClass = 'text-blue-700 bg-blue-50 border-blue-200';
    }

    return { sbp, dbp, category, colorClass };
  };

  const bpEstimate = calculateBP(pttValue, arterialStiffness);

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Why Blood Pressure (Systolic & Diastolic) Cannot Be Read by a Single Camera
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
          Blood pressure is a measure of <strong>hydrodynamic fluid tension (mmHg)</strong> exerted against arterial walls. 
          A single camera capturing reflected skin light has no pressure reference and cannot measure mmHg directly. 
          To estimate blood pressure without an inflatable cuff, biomedical engineering relies on 
          <strong> Pulse Transit Time (PTT)</strong>, which fundamentally demands <strong>two time-synchronized sensor locations</strong>.
        </p>
      </div>

      {/* Visual Mechanism: Pulse Transit Time (PTT) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          The Two-Sensor Principle: Pulse Transit Time (PTT) Architecture
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          How Pulse Wave Velocity (PWV) connects heart ventricular ejection to peripheral pulse arrival:
        </p>

        {/* Diagram */}
        <div className="bg-slate-950 text-white rounded-xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Sensor 1: ECG */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-indigo-400 font-bold uppercase">Sensor 1: Heart</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">t = 0 ms</span>
              </div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                AD8232 ECG Sensor
              </div>
              <p className="text-xs text-slate-400">
                Detects ventricular electrical depolarization (the sharp <strong>R-wave peak</strong>), marking the instant blood is ejected into the aorta.
              </p>
            </div>

            {/* Middle: Arterial Tree & Travel */}
            <div className="flex flex-col items-center justify-center text-center px-2 py-3 bg-slate-900/50 rounded-xl border border-slate-800">
              <span className="text-xs font-mono text-emerald-400 font-bold mb-1">
                Pulse Wave Propagation (PWV)
              </span>
              <div className="w-full flex items-center justify-center gap-2 text-slate-400 my-1">
                <div className="h-0.5 w-12 bg-slate-700" />
                <ChevronRight className="w-4 h-4 text-emerald-400 animate-pulse" />
                <div className="h-0.5 w-12 bg-slate-700" />
              </div>
              <span className="text-[11px] text-slate-300 font-mono">
                &Delta;t = PTT (180 - 350 ms)
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                Faster wave = Higher pressure / Stiffer arteries
              </span>
            </div>

            {/* Sensor 2: PPG */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">Sensor 2: Periphery</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">t = t_arrival</span>
              </div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                MAX30102 (or Cam PPG)
              </div>
              <p className="text-xs text-slate-400">
                Detects arrival of the hydrodynamic pressure pulse wave at the fingertip vascular bed (systolic pulse foot).
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>Moens-Korteweg Law: PWV = sqrt((E &bull; h) / (&rho; &bull; d))</span>
            <span className="text-amber-400 font-bold">A single camera CANNOT establish &Delta;t without Sensor 1!</span>
          </div>
        </div>

        {/* Interactive PTT Blood Pressure Simulator */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Interactive Hemodynamic PTT &rarr; BP Relationship Calculator
              </h4>
              <p className="text-xs text-slate-500">
                Adjust Pulse Transit Time and Arterial Elasticity to see the calculated Systolic and Diastolic pressure
              </p>
            </div>

            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${bpEstimate.colorClass}`}>
              {bpEstimate.category}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sliders */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Pulse Transit Time (PTT):</span>
                  <span className="font-mono font-bold text-indigo-700">{pttValue} ms</span>
                </div>
                <input
                  type="range"
                  min="170"
                  max="380"
                  step="5"
                  value={pttValue}
                  onChange={(e) => setPttValue(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>170 ms (Very fast / High BP)</span>
                  <span>260 ms (Nominal)</span>
                  <span>380 ms (Slow / Low BP)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Vascular Stiffness Factor:</span>
                  <span className="font-mono font-bold text-indigo-700">{arterialStiffness.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={arterialStiffness}
                  onChange={(e) => setArterialStiffness(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0.8x (Pliant young vessels)</span>
                  <span>1.0x (Standard)</span>
                  <span>1.3x (Stiff / Atherosclerosis)</span>
                </div>
              </div>
            </div>

            {/* Readout Display */}
            <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col justify-between border border-slate-800">
              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Estimated Arterial Blood Pressure
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                    {bpEstimate.sbp} / {bpEstimate.dbp}
                  </span>
                  <span className="text-sm font-mono text-slate-400">mmHg</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-slate-800">
                <div>
                  <span className="text-slate-400">Systolic (Peak):</span>
                  <div className="font-mono font-bold text-indigo-300">{bpEstimate.sbp} mmHg</div>
                </div>
                <div>
                  <span className="text-slate-400">Diastolic (Rest):</span>
                  <div className="font-mono font-bold text-indigo-300">{bpEstimate.dbp} mmHg</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Single-Point Pulse Wave Analysis (PWA) Fails on ESP32-CAM */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-600" />
          Can we use AI or "Pulse Wave Analysis" on the camera alone?
        </h4>

        <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            Some research papers explore extracting morphological features from a single PPG signal (e.g., <strong>Augmentation Index, Dicrotic Notch Depth, Crest Time</strong>) using neural networks to predict blood pressure. However, this is <strong>not feasible on an ESP32-CAM with MicroPython</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">1. Severe Frame Rate Undersampling</span>
              Clinical pulse wave analysis requires <strong>150 Hz to 500 Hz</strong> sampling. The ESP32-CAM OV2640 in MicroPython captures at only <strong>15 to 25 FPS</strong> (frames per second). At 20 FPS, the dicrotic notch lasts less than one frame and is completely erased by aliasing.
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">2. Mandatory Cuff Calibration</span>
              All single-point PPG blood pressure algorithms are relative, not absolute. They require individual calibration against an inflatable cuff every few hours because vascular tone shifts with temperature, hydration, and stress.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
