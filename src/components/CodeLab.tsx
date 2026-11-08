import React, { useState } from 'react';
import { MICROPYTHON_CODES } from '../data/micropythonCodes';
import { Copy, Check, Download, FileCode, Terminal, FolderGit2, BookOpen, FileText, Archive, Loader2 } from 'lucide-react';
import { downloadAllProjectZip } from '../utils/downloadAllZip';

export const CodeLab: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<string>('esp32-c3-supermini');
  const [folderFilter, setFolderFilter] = useState<'all' | 'esp32_c3_supermini' | 'esp32_cam'>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const filteredFiles = MICROPYTHON_CODES.filter((f) => {
    if (folderFilter === 'all') return true;
    return f.folder === folderFilter || f.folder === 'both';
  });

  const currentFile = MICROPYTHON_CODES.find((f) => f.id === selectedFileId) || filteredFiles[0] || MICROPYTHON_CODES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadAllProjectZip();
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadDoc = () => {
    const link = document.createElement('a');
    link.href = '/docs/ESP32_CAM_USER_MANUAL.doc';
    link.download = 'ESP32_CAM_USER_MANUAL.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadGuideMd = () => {
    const link = document.createElement('a');
    link.href = '/docs/ESP32_CAM_HEART_RATE_MONITOR_GUIDE.md';
    link.download = 'ESP32_CAM_HEART_RATE_MONITOR_GUIDE.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFundamentalsMd = () => {
    const link = document.createElement('a');
    link.href = '/docs/BIOLOGICAL_AND_PHYSICAL_FUNDAMENTALS.md';
    link.download = 'BIOLOGICAL_AND_PHYSICAL_FUNDAMENTALS.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadC3History = () => {
    const link = document.createElement('a');
    link.href = '/codes/esp32_c3_supermini/CONVERSATION_HISTORY_ESP32_C3_SUPERMINI.md';
    link.download = 'CONVERSATION_HISTORY_ESP32_C3_SUPERMINI.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCamHistory = () => {
    const link = document.createElement('a');
    link.href = '/codes/esp32_cam/CONVERSATION_HISTORY_ESP32_CAM.md';
    link.download = 'CONVERSATION_HISTORY_ESP32_CAM.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 7-Folder Workspace Architecture Card */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-400" />
              Project Workspace Structure &amp; Folders
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Organized into dedicated directories for firmware, documentation, hardware interfaces, and simulator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ring-2 ring-emerald-500/20 disabled:opacity-50"
              title="Download entire project workspace as a .zip"
            >
              {isZipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
              {isZipping ? 'Packaging ZIP...' : 'Download All Files (.zip)'}
            </button>
            <button
              onClick={handleDownloadC3History}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Download complete conversation log for ESP32-C3 SuperMini"
            >
              <FileText className="w-3.5 h-3.5" />
              C3 Talk History (.md)
            </button>
            <button
              onClick={handleDownloadCamHistory}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Download complete conversation log for ESP32-CAM"
            >
              <FileText className="w-3.5 h-3.5" />
              CAM Talk History (.md)
            </button>
            <button
              onClick={handleDownloadDoc}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Manual (.doc)
            </button>
            <button
              onClick={handleDownloadGuideMd}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Guide (.md)
            </button>
            <button
              onClick={handleDownloadFundamentalsMd}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Physics (.md)
            </button>
          </div>
        </div>

        {/* Dedicated Subfolders Architecture Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-purple-500/30">
            <span className="font-mono font-bold text-purple-300 block mb-0.5">/codes/esp32_c3_supermini/</span>
            <span className="text-slate-400 text-[11px]">Dedicated C3 subfolder: <code>main.py</code> (Clean ADC1, USB-C, $CAL), <code>max30102_lcd_monitor.py</code>, talk history</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-emerald-500/30">
            <span className="font-mono font-bold text-emerald-300 block mb-0.5">/codes/esp32_cam/</span>
            <span className="text-slate-400 text-[11px]">Dedicated CAM subfolder: <code>main.py</code> (GPIO 14/13/2), <code>esp32_cam_heart_rate.py</code>, talk history</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="font-mono font-bold text-indigo-300 block mb-0.5">/codes/README.md</span>
            <span className="text-slate-400 text-[11px]">Master code index, dual-board pinout matrix, flashing instructions, and clinical calibration guide</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="font-mono font-bold text-cyan-300 block mb-0.5">/docs/</span>
            <span className="text-slate-400 text-[11px]">Word manual (<code>.doc</code>), comprehensive guides (<code>.md</code>), and physics/biology fundamentals</span>
          </div>
        </div>
      </div>

      {/* Code Suite Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-600" />
              MicroPython Production Firmware &amp; Code Lab
            </h2>
            <p className="text-xs text-slate-500">
              Clean, tested MicroPython programs ready to flash and run on your ESP32
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Code'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download {currentFile.filename}
            </button>
          </div>
        </div>

        {/* Subfolder Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-3 mb-4 border-b border-slate-200 text-xs">
          <span className="font-semibold text-slate-500 mr-1">Hardware Subfolder:</span>
          <button
            onClick={() => setFolderFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              folderFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Scripts ({MICROPYTHON_CODES.length})
          </button>
          <button
            onClick={() => setFolderFilter('esp32_c3_supermini')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              folderFilter === 'esp32_c3_supermini'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <span>/codes/esp32_c3_supermini/</span>
            <span className="text-[10px] bg-purple-200/50 px-1.5 py-0.5 rounded font-bold">Recommended</span>
          </button>
          <button
            onClick={() => setFolderFilter('esp32_cam')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              folderFilter === 'esp32_cam'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <span>/codes/esp32_cam/</span>
            <span className="text-[10px] bg-emerald-200/50 px-1.5 py-0.5 rounded font-bold">Legacy CAM</span>
          </button>
        </div>

        {/* Tab Buttons for code files */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredFiles.map((file) => {
            const isSelected = file.id === currentFile.id;
            return (
              <button
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-xs font-bold text-slate-900 truncate">
                    {file.filename}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mb-1">
                  {file.path}
                </div>
                <div className="text-[10px] uppercase font-mono font-bold text-indigo-700">
                  {file.badge}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Troubleshooting Card for Firmware & Camera Driver */}
      <div className="bg-amber-50 rounded-xl border border-amber-300 p-5 shadow-xs text-amber-950 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              Verified Firmware Build: <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono text-xs">micropython_camera_feeeb5ea3_esp32_idf4_4.bin</code>
            </h3>
            <p className="text-xs text-amber-800">
              The standard MicroPython from <code className="font-mono text-amber-900">micropython.org</code> does not include the camera C-driver. You must use the verified build with I2S DMA.
            </p>
          </div>
        </div>

        <div className="bg-white/80 rounded-lg p-3 border border-amber-200 text-xs space-y-2">
          <div className="font-bold text-slate-900">Quick 3-Step Setup:</div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
            <li>
              <strong>Connect GPIO 0 to GND</strong> on the ESP32-CAM and press the Reset button to enter flash bootloader mode.
            </li>
            <li>
              <strong>Flash firmware via esptool:</strong>
              <div className="bg-slate-950 text-slate-100 p-2.5 rounded font-mono text-[11px] mt-1 overflow-x-auto select-all">
                esptool.py --chip esp32 --port /dev/ttyUSB0 --baud 460800 write_flash -z 0x1000 micropython_camera_feeeb5ea3_esp32_idf4_4.bin
              </div>
            </li>
            <li>
              <strong>Disconnect GPIO 0 from GND</strong>, press Reset, and connect via Thonny. <code className="bg-slate-100 px-1 rounded font-mono">import camera</code> will initialize immediately.
            </li>
          </ol>
        </div>
      </div>

      {/* Code Details & Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Description bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-mono font-bold">
                {currentFile.path}
              </span>
              <span className="text-xs text-slate-400 font-mono">({currentFile.filename})</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">{currentFile.title}</h3>
            <p className="text-xs text-slate-600 mt-0.5">{currentFile.description}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentFile.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Code Content */}
        <div className="relative bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-[600px] p-4 select-text">
          <pre className="leading-relaxed">
            <code>{currentFile.code}</code>
          </pre>
        </div>

        {/* How to Run Footer */}
        <div className="px-6 py-4 bg-slate-100/70 border-t border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span>
              <strong>Run via Thonny IDE:</strong> Save directly to device root as <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono">main.py</code> for auto-boot on power-up.
            </span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            Target: {currentFile.folder === 'esp32_c3_supermini' ? 'ESP32-C3 SuperMini (RISC-V / USB-C)' : currentFile.folder === 'esp32_cam' ? 'AI-Thinker ESP32-CAM (Xtensa / FTDI)' : 'Universal (C3 / CAM)'}
          </span>
        </div>
      </div>
    </div>
  );
};
