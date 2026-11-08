import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Activity, Heart, Sparkles, Sliders, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const VitalsSimulator: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [sensorMode, setSensorMode] = useState<'cam' | 'max30102' | 'dual_ptt'>('cam');
  
  // Controls
  const [targetHR, setTargetHR] = useState<number>(72);
  const [targetSpO2, setTargetSpO2] = useState<number>(98);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.15);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Time tracking
  const timeRef = useRef<number>(0);
  const dataHistoryRef = useRef<{ t: number; val1: number; val2: number; ecg?: number }[]>([]);

  useEffect(() => {
    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isRunning) {
        timeRef.current += dt;
        const t = timeRef.current;
        const hrHz = targetHR / 60; // frequency in Hz
        const phase = (t * hrHz * 2 * Math.PI) % (2 * Math.PI);

        // Generate physiological PPG pulse shape (systolic peak + dicrotic notch)
        // Main systolic pulse
        const systolic = Math.exp(-Math.pow((phase - 1.2) / 0.5, 2)) * 1.0;
        // Dicrotic notch reflection wave
        const dicrotic = Math.exp(-Math.pow((phase - 2.5) / 0.45, 2)) * 0.35;
        // Low frequency respiratory baseline wander (~0.25 Hz)
        const respiratoryWander = Math.sin(t * 0.25 * 2 * Math.PI) * 0.08;
        // High frequency noise
        const noise = (Math.random() - 0.5) * noiseLevel;

        const basePPG = Math.max(0, systolic + dicrotic) + respiratoryWander + noise;

        // Channel values depending on mode
        let val1 = 0; // Green channel for cam, Red channel for MAX30102
        let val2 = 0; // IR channel for MAX30102
        let ecg = 0;  // ECG R-wave for dual PTT

        if (sensorMode === 'cam') {
          // ESP32-CAM Green channel contact PPG
          // Cam has slower frame rate jitter & lower dynamic range
          val1 = basePPG * 0.8 + 0.3;
        } else if (sensorMode === 'max30102') {
          // MAX30102: Red and IR
          // Ratio of ratios: R = (110 - SpO2) / 25
          const rRatio = Math.max(0.4, (110 - targetSpO2) / 25.0);
          val2 = basePPG * 1.1; // IR channel has high amplitude
          val1 = basePPG * 1.1 * rRatio; // Red channel modulated by oxygenation
        } else if (sensorMode === 'dual_ptt') {
          // Dual mode: ECG (Sensor 1) + PPG (Sensor 2)
          val2 = basePPG; // PPG at fingertip (delayed)
          
          // Synthesize ECG QRS complex leading the PPG wave by ~220ms
          const ecgPhase = ((t + 0.22) * hrHz * 2 * Math.PI) % (2 * Math.PI);
          const pWave = Math.exp(-Math.pow((ecgPhase - 0.7) / 0.2, 2)) * 0.15;
          const qWave = -Math.exp(-Math.pow((ecgPhase - 1.05) / 0.05, 2)) * 0.2;
          const rWave = Math.exp(-Math.pow((ecgPhase - 1.2) / 0.04, 2)) * 1.8; // Sharp R peak
          const sWave = -Math.exp(-Math.pow((ecgPhase - 1.35) / 0.06, 2)) * 0.35;
          const tWave = Math.exp(-Math.pow((ecgPhase - 1.9) / 0.3, 2)) * 0.3;
          ecg = pWave + qWave + rWave + sWave + tWave + (Math.random() - 0.5) * 0.05;
        }

        dataHistoryRef.current.push({ t, val1, val2, ecg });
        if (dataHistoryRef.current.length > 300) {
          dataHistoryRef.current.shift();
        }
      }

      // Draw to canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear background
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, width, height);

          // Draw grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let x = 0; x < width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          for (let y = 0; y < height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          const history = dataHistoryRef.current;
          if (history.length > 1) {
            if (sensorMode === 'cam') {
              // Draw single Green channel waveform
              ctx.strokeStyle = '#10b981'; // Emerald
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              for (let i = 0; i < history.length; i++) {
                const x = (i / 300) * width;
                const y = height * 0.7 - history[i].val1 * (height * 0.35);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();

              // Label
              ctx.fillStyle = '#34d399';
              ctx.font = '11px monospace';
              ctx.fillText('ESP32-CAM Green Channel (OV2640 Subsampled ROI) ~20 FPS', 15, 25);
            } else if (sensorMode === 'max30102') {
              // Draw IR Channel
              ctx.strokeStyle = '#c084fc'; // Purple IR
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 0; i < history.length; i++) {
                const x = (i / 300) * width;
                const y = height * 0.5 - history[i].val2 * (height * 0.28);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();

              // Draw Red Channel
              ctx.strokeStyle = '#f87171'; // Red 660nm
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 0; i < history.length; i++) {
                const x = (i / 300) * width;
                const y = height * 0.85 - history[i].val1 * (height * 0.24);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();

              // Labels
              ctx.fillStyle = '#c084fc';
              ctx.font = '11px monospace';
              ctx.fillText('MAX30102 Infrared (880nm) Pulsatile Waveform', 15, 25);
              ctx.fillStyle = '#f87171';
              ctx.fillText('MAX30102 Red (660nm) Pulsatile Waveform', 15, height * 0.5 + 25);
            } else if (sensorMode === 'dual_ptt') {
              // Upper trace: ECG
              ctx.strokeStyle = '#60a5fa'; // Blue ECG
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 0; i < history.length; i++) {
                const x = (i / 300) * width;
                const y = height * 0.32 - (history[i].ecg || 0) * (height * 0.12);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();

              // Lower trace: PPG
              ctx.strokeStyle = '#34d399'; // Emerald PPG
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 0; i < history.length; i++) {
                const x = (i / 300) * width;
                const y = height * 0.82 - history[i].val2 * (height * 0.25);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();

              // Labels
              ctx.fillStyle = '#93c5fd';
              ctx.font = '11px monospace';
              ctx.fillText('Sensor 1: AD8232 ECG (R-wave peak at Heart)', 15, 25);
              ctx.fillStyle = '#6ee7b7';
              ctx.fillText('Sensor 2: MAX30102 PPG (Peripheral arrival at Finger) -> PTT Delay', 15, height * 0.5 + 20);
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, sensorMode, targetHR, targetSpO2, noiseLevel]);

  return (
    <div className="space-y-6">
      {/* Testbench Mode Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Interactive Vitals &amp; Optical Signal Testbench
            </h2>
            <p className="text-xs text-slate-500">
              Compare live signals and algorithm behavior across the 3 hardware configurations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors shadow-xs"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? 'Freeze Stream' : 'Resume'}
            </button>
            <button
              onClick={() => {
                dataHistoryRef.current = [];
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Reset buffer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setSensorMode('cam')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              sensorMode === 'cam'
                ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Mode 1: ESP32-CAM Only</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                HR Only
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              OV2640 Lens + Flash LED. Shows single green pulsatile channel at ~20 FPS.
            </p>
          </button>

          <button
            onClick={() => setSensorMode('max30102')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              sensorMode === 'max30102'
                ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Mode 2: MAX30102 Sensor</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                HR + SpO2
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Dual 660nm Red and 880nm IR LEDs. Ratio of ratios gives true SpO2.
            </p>
          </button>

          <button
            onClick={() => setSensorMode('dual_ptt')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              sensorMode === 'dual_ptt'
                ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Mode 3: ECG + PPG (PTT)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                HR + SpO2 + BP
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              AD8232 ECG + MAX30102. Measures &Delta;t (PTT) for cuffless blood pressure.
            </p>
          </button>
        </div>
      </div>

      {/* Live Canvas Oscilloscope */}
      <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl">
        <canvas
          ref={canvasRef}
          width={800}
          height={320}
          className="w-full h-64 sm:h-80 rounded-xl block"
        />

        {/* Live Metrics Readout Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-white">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono uppercase block">Heart Rate</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              {targetHR} <span className="text-xs text-slate-400 font-normal">BPM</span>
            </div>
            <span className="text-[10px] text-emerald-500/80">Available in all modes</span>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono uppercase block">Blood Oxygen (SpO2)</span>
            {sensorMode === 'cam' ? (
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-0.5">
                  N/A
                </div>
                <span className="text-[10px] text-amber-400/80">Lacks 880nm IR LED</span>
              </div>
            ) : (
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-purple-400 mt-0.5">
                  {targetSpO2}%
                </div>
                <span className="text-[10px] text-purple-400/80">Via 660/880nm R-ratio</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono uppercase block">Blood Pressure (BP)</span>
            {sensorMode !== 'dual_ptt' ? (
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-red-400 mt-0.5">
                  N/A
                </div>
                <span className="text-[10px] text-red-400/80">Needs 2nd timing sensor</span>
              </div>
            ) : (
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-400 mt-0.5">
                  118 / 76
                </div>
                <span className="text-[10px] text-indigo-400/80">PTT = 230ms (Moens-Korteweg)</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono uppercase block">Sampling Rate</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 mt-0.5">
              {sensorMode === 'cam' ? '22' : '100'} <span className="text-xs text-slate-400 font-normal">Hz</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {sensorMode === 'cam' ? 'OV2640 frame limit' : 'I2C FIFO 18-bit'}
            </span>
          </div>
        </div>
      </div>

      {/* Simulator Parameters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-600" />
          Physiological Controls &amp; Signal Perturbations
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
              <span>Target Heart Rate:</span>
              <span className="font-mono font-bold text-blue-600">{targetHR} BPM</span>
            </div>
            <input
              type="range"
              min="48"
              max="150"
              step="1"
              value={targetHR}
              onChange={(e) => setTargetHR(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>48 (Bradycardia)</span>
              <span>72 (Rest)</span>
              <span>150 (Tachycardia)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
              <span>Target SpO2 Level:</span>
              <span className="font-mono font-bold text-purple-600">{targetSpO2}%</span>
            </div>
            <input
              type="range"
              min="75"
              max="100"
              step="1"
              disabled={sensorMode === 'cam'}
              value={targetSpO2}
              onChange={(e) => setTargetSpO2(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>75% (Severe hypoxia)</span>
              <span>90% (Threshold)</span>
              <span>100% (Normal)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
              <span>Motion / Ambient Noise:</span>
              <span className="font-mono font-bold text-slate-700">{(noiseLevel * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.4"
              step="0.02"
              value={noiseLevel}
              onChange={(e) => setNoiseLevel(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>0% (Clean Lab)</span>
              <span>15% (Typical)</span>
              <span>40% (Heavy motion artifact)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
