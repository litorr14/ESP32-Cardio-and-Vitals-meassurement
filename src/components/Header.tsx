import React from 'react';
import { Activity, Cpu, Sparkles, CheckCircle2, AlertTriangle, XCircle, Radio, FileCode, Download } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  // Put 'code' upfront right next to verdict so it's impossible to miss!
  const tabs = [
    { id: 'verdict', label: 'Executive Engineering Verdict', icon: Activity, highlight: false },
    { id: 'code', label: 'MicroPython Code Suite (.py)', icon: FileCode, highlight: false },
    { id: 'cardiogram', label: 'Live PC Cardiogram (USB)', icon: Activity, highlight: true },
    { id: 'hardware', label: 'Hardware Pinout & C3 SuperMini', icon: Cpu, highlight: false },
    { id: 'simulator', label: 'Interactive Waveform Lab', icon: Sparkles, highlight: false },
    { id: 'blood-pressure', label: 'Hemodynamics & BP', icon: Activity, highlight: false },
    { id: 'physics', label: 'Optical Physics & SpO2', icon: Sparkles, highlight: false },
    { id: 'ir-sensors', label: 'KY-022 & KY-005 Check', icon: Radio, highlight: false },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Project: projects/627525084043
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 font-medium">ESP32-CAM + MicroPython Biomedical Architecture &amp; Feasibility</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" /> HR: Feasible
          </span>
          <span className="flex items-center gap-1 text-amber-400 font-mono">
            <AlertTriangle className="w-3.5 h-3.5" /> SpO2: Sensor Needed
          </span>
          <span className="flex items-center gap-1 text-red-400 font-mono">
            <XCircle className="w-3.5 h-3.5" /> BP: 2nd Sensor Needed
          </span>
        </div>
      </div>

      {/* Main Header title & Direct Action Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                ESP32-CAM Vitals Lab
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-normal bg-indigo-50 text-indigo-700 border border-indigo-200">
                  MicroPython
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Technical analysis for Heart Rate, Blood Oxygen (SpO2), and Blood Pressure
              </p>
            </div>
          </div>

          {/* High-Visibility Code & Download Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/windows_exe/VitalMonitor_Cardiogram.exe"
              download="VitalMonitor_Cardiogram.exe"
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ring-2 ring-slate-700/40"
              title="Download standalone Windows 64-bit .EXE desktop launcher from /windows_exe/"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Windows App</span>
              <span className="text-[10px] bg-sky-500/30 text-sky-300 border border-sky-400/40 px-1.5 py-0.5 rounded font-mono">.exe</span>
            </a>
            <button
              onClick={() => setActiveTab('code')}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer ring-2 ring-indigo-500/20"
            >
              <FileCode className="w-4 h-4 text-indigo-200" />
              <span>Code Suite</span>
              <span className="text-[10px] bg-indigo-500/60 px-1.5 py-0.5 rounded font-mono">.py</span>
            </button>
            <button
              onClick={async () => {
                const { downloadAllProjectZip } = await import('../utils/downloadAllZip');
                await downloadAllProjectZip();
              }}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer ring-2 ring-emerald-500/20"
              title="Download all project folders, codes, windows_exe, guides, and Word manual as a complete .zip archive"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>Download All (.zip)</span>
            </button>
          </div>
        </div>

        {/* Tab navigation with visible horizontal scroll styling */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : tab.highlight
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 hover:bg-indigo-100 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.highlight ? 'text-indigo-600' : 'text-slate-500'}`} />
                  {tab.label}
                  {tab.highlight && !isActive && (
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-mono">
                      PY
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
