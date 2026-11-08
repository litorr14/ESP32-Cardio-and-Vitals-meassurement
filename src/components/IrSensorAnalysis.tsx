import React from 'react';
import { XCircle, AlertTriangle, CheckCircle2, Cpu, Radio, Zap, ArrowRight, Layers, ShieldX } from 'lucide-react';

export const IrSensorAnalysis: React.FC<{ onNavigateToTab: (tabId: string) => void }> = ({ onNavigateToTab }) => {
  return (
    <div className="space-y-8">
      {/* Executive Answer Card */}
      <div className="bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-rose-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            Hardware Compatibility Verdict: KY-022 &amp; KY-005
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Can we use KY-022 and KY-005 for Blood Oxygen (SpO2)?
          </h2>

          <div className="bg-slate-900/90 rounded-xl p-5 border border-rose-800/60 space-y-3">
            <div className="text-base sm:text-lg font-bold text-rose-400 flex items-center gap-2">
              <ShieldX className="w-5 h-5 shrink-0" />
              DIRECT VERDICT: NO, the KY-022 Receiver CANNOT be used for SpO2.
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              While the <strong>KY-005</strong> is a basic 940nm IR transmitter LED, the <strong>KY-022 is an infrared remote control receiver (VS1838B / TSOP1838)</strong>. 
              It is hardwired with an internal <strong>38 kHz bandpass filter, automatic gain control (AGC), and a digital Schmitt trigger</strong>. 
              It outputs only <strong>binary digital 1s and 0s</strong> for TV remotes and will <strong>completely filter out and block analog blood pulse waves (1–2 Hz)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Module Deconstruction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KY-005 Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Transmitter Module</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Partially Usable (Lacks Red LED)
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">KY-005 (Infrared Transmitter)</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              A 38kHz-capable Infrared LED emitter on a breakout board (typically <strong>940 nm or 850 nm</strong>).
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 text-emerald-900">
                <span className="font-semibold text-emerald-800">&check; What it CAN do:</span>
                <p className="text-emerald-700 mt-0.5">
                  It emits infrared photons (~940 nm) capable of penetrating human tissue and absorbing into oxygenated hemoglobin.
                </p>
              </div>

              <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-rose-900">
                <span className="font-semibold text-rose-800">&times; Why it is INCOMPLETE for SpO2:</span>
                <p className="text-rose-700 mt-0.5">
                  Pulse oximetry strictly requires <strong>TWO alternating wavelengths: 660 nm (Red) AND 880/940 nm (IR)</strong>. 
                  KY-005 only has the IR diode. You would still need to add a separate 660nm Red LED and build a switching circuit to alternate between them.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500 font-mono">
            Component: 940nm GaAlAs IR LED
          </div>
        </div>

        {/* KY-022 Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Receiver Module</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                FATAL: Physically Incompatible
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">KY-022 (Infrared Receiver)</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Built using the <strong>VS1838B / TSOP1838</strong> integrated receiver designed exclusively for <strong>infrared remote control decoding (TV/AC)</strong>.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-rose-900">
                <span className="font-semibold text-rose-800">&times; Digital Demodulation Only:</span>
                <p className="text-rose-700 mt-0.5">
                  The VS1838B chip has an internal <strong>38 kHz bandpass filter</strong>. It rejects all continuous DC light and low-frequency variations (&lt; 35 kHz). Human heartbeats oscillate at only <strong>1 to 2 Hz (60–120 BPM)</strong>, so the chip filters it out as background noise!
                </p>
              </div>

              <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-rose-900">
                <span className="font-semibold text-rose-800">&times; Binary Output (No Analog Photoplethysmogram):</span>
                <p className="text-rose-700 mt-0.5">
                  The output pin is a digital open-collector transistor (HIGH/LOW). It cannot report subtle analog absorption amplitudes (AC/DC), which are mandatory to calculate R = (AC_red / DC_red) / (AC_ir / DC_ir).
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500 font-mono">
            IC: VS1838B (38kHz Bandpass Filter + AGC Demodulator)
          </div>
        </div>
      </div>

      {/* Internal Architecture Comparison Diagram */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          Internal Architecture: Why KY-022 Fails vs. What SpO2 Needs
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Compare the internal silicon processing stages of the KY-022 receiver vs. a true pulse oximetry sensor:
        </p>

        <div className="space-y-6">
          {/* KY-022 Signal Path (Broken for PPG) */}
          <div className="bg-slate-950 rounded-xl p-5 border border-rose-900/60">
            <div className="flex items-center justify-between text-xs font-mono text-rose-400 mb-3">
              <span className="font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-500" />
                KY-022 (VS1838B) Internal Signal Path — INCOMPATIBLE
              </span>
              <span className="text-slate-500">Tuned for TV Remotes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-300">
                <div className="font-bold text-white mb-1">1. PIN Diode</div>
                <div className="text-[10px] text-slate-400">Captures incoming IR</div>
              </div>

              <div className="bg-rose-950/80 p-3 rounded-lg border border-rose-800 text-rose-200 relative">
                <div className="font-bold text-rose-300 mb-1">2. 38 kHz Bandpass</div>
                <div className="text-[10px] text-rose-300">KILLS 1–2 Hz heartbeat! Passes only 38kHz carrier</div>
              </div>

              <div className="bg-rose-950/80 p-3 rounded-lg border border-rose-800 text-rose-200">
                <div className="font-bold text-rose-300 mb-1">3. AGC Demodulator</div>
                <div className="text-[10px] text-rose-300">Cancels continuous tissue DC baseline</div>
              </div>

              <div className="bg-rose-950/80 p-3 rounded-lg border border-rose-800 text-rose-200">
                <div className="font-bold text-rose-300 mb-1">4. Schmitt Trigger</div>
                <div className="text-[10px] text-rose-300">Outputs 0V or 3.3V (Binary only, no analog PPG!)</div>
              </div>
            </div>
          </div>

          {/* Proper PPG / SpO2 Signal Path */}
          <div className="bg-slate-950 rounded-xl p-5 border border-emerald-900/60">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-3">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Proper Pulse Oximetry Signal Path (MAX30102 / True PPG)
              </span>
              <span className="text-emerald-500">Tuned for Arterial Blood Flow</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-300">
                <div className="font-bold text-white mb-1">1. Dual 660nm/880nm</div>
                <div className="text-[10px] text-slate-400">Alternating Red &amp; IR LEDs at 100 Hz</div>
              </div>

              <div className="bg-emerald-950/80 p-3 rounded-lg border border-emerald-800 text-emerald-200">
                <div className="font-bold text-emerald-300 mb-1">2. Linear Photodiode</div>
                <div className="text-[10px] text-emerald-300">Preserves linear light absorption</div>
              </div>

              <div className="bg-emerald-950/80 p-3 rounded-lg border border-emerald-800 text-emerald-200">
                <div className="font-bold text-emerald-300 mb-1">3. Ambient Rejection</div>
                <div className="text-[10px] text-emerald-300">Removes 50/60Hz AC room lighting</div>
              </div>

              <div className="bg-emerald-950/80 p-3 rounded-lg border border-emerald-800 text-emerald-200">
                <div className="font-bold text-emerald-300 mb-1">4. 18-bit Linear ADC</div>
                <div className="text-[10px] text-emerald-300">Outputs full 18-bit AC &amp; DC counts over I2C</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What if you want to build a discrete circuit? */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          What components would you need if NOT using the MAX30102?
        </h3>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          If you wanted to build a discrete optical pulse oximeter without an integrated sensor, you cannot use the KY-022. You would need to assemble:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-900 block mb-1">1. Raw Photodiode</span>
            A raw linear silicon PIN photodiode like the <strong>BPW34</strong> or <strong>TEMT6000</strong> with no 38 kHz filtering.
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-900 block mb-1">2. Transimpedance Amp</span>
            A low-noise operational amplifier (e.g. <strong>MCP6002</strong> or <strong>LM358</strong>) with a feedback resistor (100k&Omega; to 1M&Omega;) to convert microamps to volts.
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-900 block mb-1">3. Dual LED Driver</span>
            Both a <strong>660nm Red LED</strong> and an <strong>880nm/940nm IR LED</strong>, driven by two MOSFETs or GPIOs pulsing in sequence.
          </div>
        </div>

        <div className="mt-5 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-indigo-900">
            <strong className="font-semibold text-indigo-950">Engineering Recommendation:</strong> A discrete build requires 15+ external passive components, an op-amp breadboard, and custom calibration. The <strong>MAX30102 sensor module</strong> packages all of this (dual calibrated LEDs, optical filter, 18-bit ADC, and I2C) on a single board for <strong>less than $2.50</strong>.
          </div>

          <button
            onClick={() => onNavigateToTab('code')}
            className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            Get MAX30102 MicroPython Code
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
