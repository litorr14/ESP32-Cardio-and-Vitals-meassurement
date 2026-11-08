/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { FeasibilityVerdict } from './components/FeasibilityVerdict';
import { OpticalPhysicsExplorer } from './components/OpticalPhysicsExplorer';
import { BloodPressureHemodynamics } from './components/BloodPressureHemodynamics';
import { VitalsSimulator } from './components/VitalsSimulator';
import { HardwareWiringGuide } from './components/HardwareWiringGuide';
import { CodeLab } from './components/CodeLab';
import { IrSensorAnalysis } from './components/IrSensorAnalysis';
import { ComputerCardiogram } from './components/ComputerCardiogram';
import { MICROPYTHON_CODES } from './data/micropythonCodes';
import { Cpu, FileCode, Download, ArrowRight, Check } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) return tabParam;
    }
    return 'cardiogram';
  });
  const [downloaded, setDownloaded] = useState<boolean>(false);

  const handleQuickDownload = () => {
    const file = MICROPYTHON_CODES[0]; // esp32_cam_heart_rate.py
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Persistent Quick Download Banner */}
        {activeTab !== 'code' && (
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-xl p-4 text-white shadow-md border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <FileCode className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  MicroPython Script Ready: <code className="bg-indigo-950/70 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">esp32_cam_heart_rate.py</code>
                </div>
                <div className="text-xs text-indigo-200 mt-0.5">
                  Pre-configured with OV2640 exposure lock, PWM flash protection, and terminal pulse graph.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleQuickDownload}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                {downloaded ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Download className="w-3.5 h-3.5" />}
                {downloaded ? 'Downloaded .py!' : 'Download .py File'}
              </button>

              <button
                onClick={() => setActiveTab('code')}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
              >
                <span>View Full Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'code' && <CodeLab />}

        {activeTab === 'cardiogram' && <ComputerCardiogram />}

        {activeTab === 'verdict' && (
          <FeasibilityVerdict onNavigateToTab={(tabId) => setActiveTab(tabId)} />
        )}

        {activeTab === 'ir-sensors' && (
          <IrSensorAnalysis onNavigateToTab={(tabId) => setActiveTab(tabId)} />
        )}

        {activeTab === 'physics' && <OpticalPhysicsExplorer />}

        {activeTab === 'blood-pressure' && <BloodPressureHemodynamics />}

        {activeTab === 'simulator' && <VitalsSimulator />}

        {activeTab === 'hardware' && <HardwareWiringGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>ESP32-CAM Biomedical Systems Lab</span>
            <span className="text-slate-300">&bull;</span>
            <span className="font-mono text-slate-400">Target Project: projects/627525084043</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button
              onClick={() => setActiveTab('code')}
              className="text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              MicroPython Code Suite (.py)
            </button>
            <button
              onClick={() => setActiveTab('verdict')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Feasibility Verdict
            </button>
            <button
              onClick={() => setActiveTab('hardware')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Wiring Guide
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
