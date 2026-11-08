import React, { useState } from 'react';
import { Sparkles, Info, AlertTriangle, CheckCircle, Sliders } from 'lucide-react';

export const OpticalPhysicsExplorer: React.FC = () => {
  const [selectedWavelength, setSelectedWavelength] = useState<number>(660);

  // Absorption spectrum data (600nm - 950nm)
  // Simplified realistic extinction coefficients (cm^-1 / M)
  const getExtinction = (wl: number) => {
    let hb = 0;
    let hbo2 = 0;
    let whiteLed = 0;

    // Hb (Deoxyhemoglobin): High around 660nm, drops at isosbestic 805nm
    if (wl <= 660) {
      hb = 3200 - (660 - wl) * 15;
      hbo2 = 320 + (660 - wl) * 2;
    } else if (wl <= 805) {
      const progress = (wl - 660) / (805 - 660);
      hb = 3200 - progress * (3200 - 800);
      hbo2 = 320 + progress * (800 - 320);
    } else {
      const progress = (wl - 805) / (950 - 805);
      hb = 800 + progress * 250;
      hbo2 = 800 + progress * 500;
    }

    // White LED emission curve: High at 450 (blue, off chart), moderate at 550-600, near zero above 700
    if (wl < 700) {
      whiteLed = Math.max(0, 100 - Math.pow((wl - 560) / 10, 2) * 0.5);
    } else {
      whiteLed = Math.max(0, 20 - (wl - 700) * 0.35);
    }

    return { hb: Math.round(hb), hbo2: Math.round(hbo2), whiteLed: Math.max(0, Math.round(whiteLed)) };
  };

  const currentData = getExtinction(selectedWavelength);

  // Points for drawing SVG graph
  const wavelengths = [
    600, 620, 640, 660, 680, 700, 720, 740, 760, 780, 800, 805, 820, 840, 860, 880, 900, 920, 940, 950
  ];

  const graphPoints = wavelengths.map((wl) => {
    const { hb, hbo2, whiteLed } = getExtinction(wl);
    const x = ((wl - 600) / (950 - 600)) * 500 + 40; // SVG width 580
    // Scale y: max hb is ~3400, map to 200 - 30
    const yHb = 210 - (hb / 3500) * 170;
    const yHbo2 = 210 - (hbo2 / 3500) * 170;
    const yLed = 210 - (whiteLed / 100) * 120;
    return { wl, x, yHb, yHbo2, yLed, hb, hbo2, whiteLed };
  });

  const hbPath = 'M ' + graphPoints.map((p) => `${p.x},${p.yHb}`).join(' L ');
  const hbo2Path = 'M ' + graphPoints.map((p) => `${p.x},${p.yHbo2}`).join(' L ');
  const ledPath = 'M ' + graphPoints.map((p) => `${p.x},${p.yLed}`).join(' L ');

  const currentX = ((selectedWavelength - 600) / (950 - 600)) * 500 + 40;

  return (
    <div className="space-y-8">
      {/* Introduction Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Why ESP32-CAM Cannot Measure SpO2: The Optical Physics Breakdown
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
          Standard pulse oximetry operates on the <strong>Beer-Lambert Law</strong> of light absorption. 
          To determine the percentage of oxygenated hemoglobin in blood, an instrument must measure light absorption at 
          <strong> two precise wavelengths</strong> where oxygenated hemoglobin (HbO<sub>2</sub>) and deoxygenated hemoglobin (Hb) 
          have radically opposite optical absorption profiles.
        </p>
      </div>

      {/* Interactive Optical Spectrum Explorer */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Hemoglobin Extinction Spectrum vs. White LED Emission
            </h3>
            <p className="text-xs text-slate-500">
              Compare Deoxygenated Hb, Oxygenated HbO2, and the ESP32-CAM onboard white LED
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              Selected: {selectedWavelength} nm
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-600" />
            <span className="font-medium text-slate-700">Deoxygenated Hemoglobin (Hb)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-400" />
            <span className="font-medium text-slate-700">Oxygenated Hemoglobin (HbO2)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400" />
            <span className="font-medium text-slate-700">ESP32-CAM White Flash LED Spectrum</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-slate-400 border-dashed" />
            <span className="font-medium text-slate-500">805nm Isosbestic Point</span>
          </div>
        </div>

        {/* SVG Graph */}
        <div className="relative overflow-x-auto bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-inner">
          <svg viewBox="0 0 580 250" className="w-full h-64 select-none">
            {/* Grid Lines */}
            <line x1="40" y1="30" x2="540" y2="30" stroke="#334155" strokeDasharray="3 3" />
            <line x1="40" y1="90" x2="540" y2="90" stroke="#334155" strokeDasharray="3 3" />
            <line x1="40" y1="150" x2="540" y2="150" stroke="#334155" strokeDasharray="3 3" />
            <line x1="40" y1="210" x2="540" y2="210" stroke="#475569" strokeWidth="1.5" />

            {/* 660nm Red Marker */}
            <line x1={((660 - 600) / 350) * 500 + 40} y1="20" x2={((660 - 600) / 350) * 500 + 40} y2="210" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" />
            <text x={((660 - 600) / 350) * 500 + 40} y="16" fill="#f87171" fontSize="9" textAnchor="middle" fontFamily="monospace">660nm (Red)</text>

            {/* 805nm Isosbestic Marker */}
            <line x1={((805 - 600) / 350) * 500 + 40} y1="20" x2={((805 - 600) / 350) * 500 + 40} y2="210" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
            <text x={((805 - 600) / 350) * 500 + 40} y="16" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">805nm (Isosbestic)</text>

            {/* 880nm IR Marker */}
            <line x1={((880 - 600) / 350) * 500 + 40} y1="20" x2={((880 - 600) / 350) * 500 + 40} y2="210" stroke="#a855f7" strokeWidth="1" strokeDasharray="2 2" />
            <text x={((880 - 600) / 350) * 500 + 40} y="16" fill="#c084fc" fontSize="9" textAnchor="middle" fontFamily="monospace">880nm (Infrared)</text>

            {/* IR Cut Filter Zone Shade */}
            <rect x={((700 - 600) / 350) * 500 + 40} y="25" width={((950 - 700) / 350) * 500} height="185" fill="#f43f5e" fillOpacity="0.08" />
            <text x={((820 - 600) / 350) * 500 + 40} y="100" fill="#f43f5e" fontSize="10" fillOpacity="0.6" textAnchor="middle" fontFamily="sans-serif">
              BLOCKED BY OV2640 IR-CUT FILTER (&gt;700nm)
            </text>

            {/* Paths */}
            <path d={hbPath} fill="none" stroke="#e11d48" strokeWidth="2.5" />
            <path d={hbo2Path} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <path d={ledPath} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 2" />

            {/* Vertical Cursor Indicator */}
            <line x1={currentX} y1="20" x2={currentX} y2="210" stroke="#38bdf8" strokeWidth="2" />
            <circle cx={currentX} cy={210 - (currentData.hb / 3500) * 170} r="4" fill="#e11d48" />
            <circle cx={currentX} cy={210 - (currentData.hbo2 / 3500) * 170} r="4" fill="#38bdf8" />

            {/* Wavelength Axis */}
            <text x="40" y="225" fill="#94a3b8" fontSize="10" textAnchor="middle">600nm</text>
            <text x="182" y="225" fill="#94a3b8" fontSize="10" textAnchor="middle">700nm</text>
            <text x="325" y="225" fill="#94a3b8" fontSize="10" textAnchor="middle">800nm</text>
            <text x="468" y="225" fill="#94a3b8" fontSize="10" textAnchor="middle">900nm</text>
            <text x="540" y="225" fill="#94a3b8" fontSize="10" textAnchor="middle">950nm</text>
          </svg>
        </div>

        {/* Slider */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              Scrub Wavelength (&lambda;):
            </span>
            <span className="font-mono font-bold text-slate-800">{selectedWavelength} nm</span>
          </div>
          <input
            type="range"
            min="600"
            max="950"
            step="5"
            value={selectedWavelength}
            onChange={(e) => setSelectedWavelength(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>600 nm (Orange)</span>
            <span className="text-red-500 font-bold">660 nm (Red)</span>
            <span className="text-slate-500">805 nm (Isosbestic)</span>
            <span className="text-purple-500 font-bold">880 nm (Infrared)</span>
            <span>950 nm (Far IR)</span>
          </div>
        </div>

        {/* Live Extinction Readout */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-rose-800">Deoxyhemoglobin (Hb) Extinction</div>
            <div className="text-xl font-bold font-mono text-rose-900 mt-0.5">{currentData.hb} <span className="text-xs font-normal">cm⁻¹/M</span></div>
            <div className="text-[10px] text-rose-700 mt-1">High at 660nm, drops past 800nm</div>
          </div>

          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-sky-800">Oxyhemoglobin (HbO2) Extinction</div>
            <div className="text-xl font-bold font-mono text-sky-900 mt-0.5">{currentData.hbo2} <span className="text-xs font-normal">cm⁻¹/M</span></div>
            <div className="text-[10px] text-sky-700 mt-1">Low at 660nm, dominates past 850nm</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-amber-800">ESP32-CAM White LED Emission</div>
            <div className="text-xl font-bold font-mono text-amber-900 mt-0.5">
              {currentData.whiteLed}% <span className="text-xs font-normal">{selectedWavelength >= 750 ? '(NEAR ZERO!)' : 'power'}</span>
            </div>
            <div className="text-[10px] text-amber-700 mt-1">
              {selectedWavelength >= 700 ? 'No Infrared emitted for SpO2' : 'Adequate for green/red visible'}
            </div>
          </div>
        </div>
      </div>

      {/* The Beer-Lambert Ratio-of-Ratios Formula */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            The Standard SpO2 "Ratio of Ratios" Math
          </h4>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            In commercial pulse oximeters, the photodetector measures the pulsatile (AC) arterial blood flow divided by the non-pulsatile baseline (DC) tissue absorption at both 660nm and 880nm:
          </p>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
            <div className="text-blue-400">// 1. Ratio of Modulation R</div>
            <div className="text-emerald-400">R = (AC_660nm / DC_660nm) / (AC_880nm / DC_880nm)</div>
            <div className="text-blue-400 pt-1">// 2. Empirical Calibration Curve</div>
            <div className="text-indigo-300">SpO2 (%) = 110.0 - (25.0 * R)</div>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            When blood is fully oxygenated (~100% SpO2), R &approx; 0.4. When SpO2 drops to 85%, R &approx; 1.0. 
            Because the ESP32-CAM camera lacks the 880nm channel, you cannot compute the denominator of <strong>R</strong>!
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Why "Camera RGB Ratio" Hacks Fail Dangerously
          </h4>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Some hobbyist tutorials propose using the Camera's Red channel and Green channel to calculate SpO2 without infrared light. Here is why medical literature rejects this:
          </p>

          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold shrink-0">&bull;</span>
              <span><strong>Skin Pigmentation Bias:</strong> Melanin absorbs heavily in the green and blue wavelengths, skewing RGB ratios by 15-25% depending on skin tone. Infrared (880nm) penetrates melanin cleanly.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold shrink-0">&bull;</span>
              <span><strong>No True Isosbestic Balance:</strong> Green light has shallow skin penetration (~0.5mm, capillaries only), while Red penetrates deeper into arterioles (~2.5mm). They sample completely different vascular beds.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold shrink-0">&bull;</span>
              <span><strong>Severe False Sense of Security:</strong> A patient experiencing hypoxia (low oxygen &lt; 90%) could display 98% on an uncalibrated camera calculation.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
