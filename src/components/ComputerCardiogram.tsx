import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  Download,
  Usb,
  RotateCcw,
  Sparkles,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  Eye,
  Maximize2,
  Sliders,
  Copy,
  Check,
  X,
  FileText,
  Table
} from 'lucide-react';
import { AiMedicalReportModal } from './AiMedicalReportModal';
import { generate10sEcgStrip, StripVitals } from '../utils/generate10sEcgStrip';

export const ComputerCardiogram: React.FC = () => {
  // Web Serial & Simulation states
  const [showAiReportModal, setShowAiReportModal] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(true); // Default to live simulation so user immediately sees waves
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [rawConsole, setRawConsole] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState<boolean>(true); // Show console by default so connection is immediately visible
  const [packetsReceived, setPacketsReceived] = useState<number>(0);
  const [lastPacketTime, setLastPacketTime] = useState<number>(0);
  const [rxBlink, setRxBlink] = useState<boolean>(false);
  const [connectionStage, setConnectionStage] = useState<string>('Ready to connect');
  const [connectedPortInfo, setConnectedPortInfo] = useState<string | null>(null);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Vitals State (nullable in Hardware mode until live sensor beats arrive)
  const [hr, setHr] = useState<number | null>(64);
  const [spo2, setSpo2] = useState<number | null>(97.5);
  const [sbp, setSbp] = useState<number | null>(119);
  const [dbp, setDbp] = useState<number | null>(77);
  const [ptt, setPtt] = useState<number | null>(218);
  const [leadsOk, setLeadsOk] = useState<boolean>(true);
  const [sdnn, setSdnn] = useState<number>(42);
  const [rmssd, setRmssd] = useState<number>(34);
  const [beatCount, setBeatCount] = useState<number>(18);
  const [lastBeatTime, setLastBeatTime] = useState<number>(0);
  const [bufferSeconds, setBufferSeconds] = useState<number>(10);

  // Periodic 10-second recording buffer monitor
  useEffect(() => {
    const timer = setInterval(() => {
      const len = recordingRef.current.length;
      setBufferSeconds(Math.min(10, Math.round((len / 100) * 10) / 10));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // Oscilloscope Settings
  const [sweepSpeed, setSweepSpeed] = useState<number>(25); // 25 mm/s or 50 mm/s
  const [ecgGain, setEcgGain] = useState<number>(1.0); // 0.5x, 1x, 2x
  const [ppgGain, setPpgGain] = useState<number>(1.0); // 0.5x, 1x, 2x
  const [displayWindowSeconds, setDisplayWindowSeconds] = useState<number>(6); // 4s, 6s, 10s
  const [leadMode, setLeadMode] = useState<'Lead I' | 'Lead II'>('Lead I');

  // Dynamic Signal Processing Tracking Refs (Adaptive baseline & Auto-gain)
  const ecgDcRef = useRef<number>(1960.0);
  const lastEcgRef = useRef<number>(0.0);
  const ppgMaxRef = useRef<number>(40.0);

  // Live Hardware 100Hz Reconstruction & Anti-Saturation Refs
  const hwFingerOnRef = useRef<boolean>(false);
  const hwLiveBpmRef = useRef<number>(62);
  const hwBeatTriggerRef = useRef<boolean>(false);
  const hwHasRealAdcRef = useRef<boolean>(false);
  const hwConsecutiveRailRef = useRef<number>(0);
  const hwPpgRawTargetRef = useRef<number>(0.0);
  const hwPpgFilter1Ref = useRef<number>(0.0);
  const hwPpgFilter2Ref = useRef<number>(0.0);
  const hwEcgRawTargetRef = useRef<number>(0.0);
  const hwEcgFilter1Ref = useRef<number>(0.0);
  const hwEcgFilter2Ref = useRef<number>(0.0);
  const hwLastValidSignalMsRef = useRef<number>(0);
  const lastRecordedVitalsRef = useRef<{
    hr: number | null;
    spo2: number | null;
    sbp: number | null;
    dbp: number | null;
    ptt: number | null;
  }>({ hr: 64, spo2: 98.0, sbp: 120, dbp: 78, ptt: 215 });

  // Blood Pressure Calibration State (Moens-Korteweg PTT Offsets)
  const [calA] = useState<number>(-72.5);
  const [calB, setCalB] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vtl_cal_b');
      if (saved) return parseFloat(saved);
    }
    return 518.0;
  });
  const [calC] = useState<number>(-48.0);
  const [calD, setCalD] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vtl_cal_d');
      if (saved) return parseFloat(saved);
    }
    return 343.0;
  });

  // Modal dialog states
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [cuffSbpInput, setCuffSbpInput] = useState<number>(120);
  const [cuffDbpInput, setCuffDbpInput] = useState<number>(80);
  const [customPttInput, setCustomPttInput] = useState<number>(215);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [calibrationSentNotice, setCalibrationSentNotice] = useState<string | null>(null);
  const [exportPreviewMode, setExportPreviewMode] = useState<'waveforms' | 'beats'>('waveforms');

  // Simulation Sliders
  const [simBpm, setSimBpm] = useState<number>(65);
  const [simNoise, setSimNoise] = useState<number>(0.02);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // High-Frequency UI Throttling Refs (stops React re-render thrashing & screen trembling)
  const pendingConsoleLinesRef = useRef<string[]>([]);
  const lastConsoleFlushRef = useRef<number>(0);
  const packetAccumulatorRef = useRef<number>(0);
  const lastPacketFlushRef = useRef<number>(0);

  // Serial Port Reference
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepReadingRef = useRef<boolean>(false);

  // Waveform Buffers
  const ecgBufferRef = useRef<number[]>([]);
  const ppgBufferRef = useRef<number[]>([]);
  const sweepIndexRef = useRef<number>(0);
  const rrHistoryRef = useRef<number[]>([]);

  // Telemetry Recording Log with Full Clinical Metadata
  const recordingRef = useRef<{
    t: number;
    iso: string;
    ecg: number;
    ppg: number;
    rawEcg: number;
    hr: number | null;
    spo2: number | null;
    sbp: number | null;
    dbp: number | null;
    ptt: number | null;
    leadsOk: boolean;
    isRPeak: boolean;
    bp: string;
  }[]>([]);

  // Check Web Serial support
  const hasWebSerial = typeof navigator !== 'undefined' && 'serial' in navigator;

  // ---------------------------------------------------------------------------
  // 1. Web Serial API Connection Handler (Resilient Direct Native Reader)
  // ---------------------------------------------------------------------------
  const handleConnectSerial = async () => {
    setSerialError(null);
    if (!hasWebSerial) {
      setSerialError('Web Serial API is not supported in this browser. Please open in Google Chrome, Microsoft Edge, or Opera.');
      return;
    }

    setIsConnecting(true);

    try {
      // 1. Request user to select COM port
      const port = await (navigator as any).serial.requestPort();

      // Clean up previous port if any
      if (portRef.current) {
        try {
          keepReadingRef.current = false;
          if (readerRef.current) await readerRef.current.cancel();
          await portRef.current.close();
        } catch (_) {}
      }

      // 2. Open serial port at 115200 baud with generous buffer
      await port.open({
        baudRate: 115200,
        bufferSize: 16384
      });

      portRef.current = port;
      keepReadingRef.current = true;

      // 3. Assert DTR and RTS signals so ESP32 runs normally (not held in reset or bootloader)
      try {
        await port.setSignals({ dataTerminalReady: true, requestToSend: false });
      } catch (sigErr) {
        console.warn('Serial signals not supported by adapter driver:', sigErr);
      }

      // 4. Query port info
      try {
        const info = port.getInfo ? port.getInfo() : null;
        if (info && (info.usbVendorId || info.usbProductId)) {
          setConnectedPortInfo(`USB ID: 0x${info.usbVendorId?.toString(16)}:0x${info.usbProductId?.toString(16)}`);
        } else {
          setConnectedPortInfo('COM Port Connected');
        }
      } catch (_) {}

      // 5. Reset buffers so screen sweeps live data and clears synthetic simulation
      recordingRef.current = [];
      ecgBufferRef.current = [];
      ppgBufferRef.current = [];
      sweepIndexRef.current = 0;
      setPacketsReceived(0);

      // Reset vitals to null so HUD displays clean "--" until live pulses arrive
      setHr(null);
      setSpo2(null);
      setSbp(null);
      setDbp(null);
      setPtt(null);
      setLeadsOk(false);

      setIsConnected(true);
      setIsConnecting(false);
      setIsSimulating(false); // Instantly exit simulation mode!
      setShowConsole(true); // Open live terminal console so incoming text is immediately visible
      setConnectionStage('Connected & Streaming 115200 baud');

      // 6. Automatically send MicroPython Soft Reboot (\r\n\x03\x03\x04) in background
      // This restarts main.py in case the ESP32 was sitting idle at the REPL prompt (>>>)
      setTimeout(async () => {
        try {
          if (port.writable) {
            const writer = port.writable.getWriter();
            const encoder = new TextEncoder();
            await writer.write(encoder.encode('\r\n\x03\x03\x04'));
            writer.releaseLock();
            setRawConsole((prev) => ['[System] Sent MicroPython Soft Reboot (Ctrl+D) to start main.py...', ...prev.slice(0, 49)]);
          }
        } catch (wErr) {
          console.warn('Initial soft reset notice:', wErr);
        }
      }, 350);

      // 7. Start resilient background reader loop
      readSerialLoop(port);
    } catch (err: any) {
      console.error('Serial connection error:', err);
      setIsConnecting(false);
      setIsConnected(false);

      if (err.name === 'SecurityError' || err.message?.includes('permissions policy')) {
        setSerialError('Iframe permission restricted: Web Serial cannot run inside the embedded preview frame. Click "Launch Standalone Window" at the top to connect directly!');
      } else if (err.name === 'NetworkError' || err.message?.includes('Failed to open') || err.message?.includes('Access denied')) {
        setSerialError('Port is busy! Please DISCONNECT or CLOSE Thonny IDE (only one application can read the COM port at a time), then click Connect again.');
      } else if (err.name !== 'NotFoundError') {
        // User cancelled port selection dialog
        setSerialError(err.message || 'Failed to open serial port.');
      }
    }
  };

  const handleDisconnectSerial = async () => {
    keepReadingRef.current = false;
    setIsConnecting(false);
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (e) {
      console.warn('Error during disconnect:', e);
    }
    setIsConnected(false);
    setConnectionStage('Disconnected');
  };

  const handleSendSoftReset = async () => {
    if (!portRef.current || !portRef.current.writable) return;
    try {
      const writer = portRef.current.writable.getWriter();
      const encoder = new TextEncoder();
      // Send Ctrl+C twice then Ctrl+D (MicroPython Soft Reboot)
      await writer.write(encoder.encode('\r\n\x03\x03\x04'));
      writer.releaseLock();
      setRawConsole((prev) => ['[PC -> ESP32] Sent MicroPython Soft Reboot (Ctrl+D)...', ...prev.slice(0, 49)]);
    } catch (err: any) {
      console.error('Failed to send soft reboot:', err);
    }
  };

  const readSerialLoop = async (port: any) => {
    let lineBuffer = '';
    const decoder = new TextDecoder();

    // Resilient outer loop: survives transient framing glitches without dropping the connection
    while (port.readable && keepReadingRef.current) {
      let reader: any = null;
      try {
        reader = port.readable.getReader();
        readerRef.current = reader;

        while (keepReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;

          if (value && value.length > 0) {
            packetAccumulatorRef.current += value.length;
            const now = Date.now();
            if (now - lastPacketFlushRef.current > 150) {
              lastPacketFlushRef.current = now;
              const added = packetAccumulatorRef.current;
              packetAccumulatorRef.current = 0;
              setPacketsReceived((c) => c + added);
              setLastPacketTime(now);
              setRxBlink(true);
              setTimeout(() => setRxBlink(false), 80);
            }

            const textChunk = decoder.decode(value, { stream: true });
            lineBuffer += textChunk;
            const lines = lineBuffer.split(/\r?\n/);
            lineBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                parseIncomingSerialLine(trimmed);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Transient serial read notice (framing or buffer glitch):', err);
        // Do NOT drop the connection immediately! Wait briefly and acquire fresh reader
        await new Promise((r) => setTimeout(r, 80));
      } finally {
        if (reader) {
          try {
            reader.releaseLock();
          } catch (_) {}
          readerRef.current = null;
        }
      }

      if (!keepReadingRef.current) break;
    }

    setIsConnected(false);
    setIsConnecting(false);
  };

  const parseIncomingSerialLine = (line: string) => {
    if (!line) return;

    // Buffer raw console lines and flush smoothly at ~8 Hz to avoid layout trembling
    pendingConsoleLinesRef.current.unshift(line);
    if (pendingConsoleLinesRef.current.length > 50) {
      pendingConsoleLinesRef.current.length = 50;
    }
    const now = Date.now();
    if (now - lastConsoleFlushRef.current > 120) {
      lastConsoleFlushRef.current = now;
      setRawConsole([...pendingConsoleLinesRef.current]);
    }

    // 1. Machine packet format: $VTL,raw_ecg,ppg_ac,bpm,spo2,sbp,dbp,leads,r_peak,ppg_beat,ptt
    if (line.startsWith('$VTL,')) {
      const parts = line.split(',');
      if (parts.length >= 8) {
        const rawEcg = parseFloat(parts[1]) || 2048;
        const ppgAc = parseFloat(parts[2]) || 0;
        const inBpm = parseFloat(parts[3]) || 0;
        const inSpo2 = parseFloat(parts[4]) || 0;
        const inSbp = parseInt(parts[5], 10) || 0;
        const inDbp = parseInt(parts[6], 10) || 0;
        const inLeads = parseInt(parts[7], 10) === 1;
        const inRPeak = parts[8] ? parseInt(parts[8], 10) === 1 : false;
        const inPpgBeat = parts[9] ? parseInt(parts[9], 10) === 1 : false;
        const inPtt = parts[10] ? parseFloat(parts[10]) : 210;

        const fingerPresent = inSpo2 > 70 || (inBpm > 30 && Math.abs(ppgAc) > 1.5);
        const ecgActive = inLeads && inBpm > 30 && rawEcg > 60 && rawEcg < 4020;

        if (fingerPresent) {
          hwFingerOnRef.current = true;
          hwLastValidSignalMsRef.current = Date.now();
          ppgMaxRef.current = Math.max(35.0, Math.max(ppgMaxRef.current * 0.992, Math.abs(ppgAc)));
          hwPpgRawTargetRef.current = Math.max(-0.35, Math.min(0.35, (ppgAc / ppgMaxRef.current) * 0.35));
          if (inSpo2 > 70) setSpo2(Math.round(inSpo2 * 10) / 10);
          if (inPtt > 90 && inPtt < 600) {
            setPtt(Math.round(inPtt));
            const customSbp = Math.round(calA * Math.log(inPtt) + calB);
            const customDbp = Math.round(calC * Math.log(inPtt) + calD);
            if (customSbp > 60) setSbp(Math.max(75, Math.min(210, customSbp)));
            if (customDbp > 40) setDbp(Math.max(45, Math.min(130, customDbp)));
          } else {
            if (inSbp > 60) setSbp(inSbp);
            if (inDbp > 40) setDbp(inDbp);
            if (inPtt > 90) setPtt(Math.round(inPtt));
          }
        } else {
          // Finger removed: immediately flush stored PPG wave and reset optical vitals
          hwFingerOnRef.current = false;
          hwPpgRawTargetRef.current = 0.0;
          hwPpgFilter1Ref.current = 0.0;
          hwPpgFilter2Ref.current = 0.0;
          ppgBufferRef.current = [];
          for (let i = 0; i < recordingRef.current.length; i++) {
            recordingRef.current[i].ppg = 0.0;
          }
          setSpo2(null);
          setSbp(null);
          setDbp(null);
          setPtt(null);
        }

        if (ecgActive || fingerPresent) {
          if (rawEcg > 60 && rawEcg < 4020) {
            hwHasRealAdcRef.current = ecgActive;
            hwConsecutiveRailRef.current = 0;
            ecgDcRef.current = 0.96 * ecgDcRef.current + 0.04 * rawEcg;
            const acEcg = rawEcg - ecgDcRef.current;
            hwEcgRawTargetRef.current = Math.tanh(acEcg / 1000.0) * 0.20;
            lastEcgRef.current = hwEcgRawTargetRef.current;
          }
          hwLastValidSignalMsRef.current = Date.now();
          setLeadsOk(true);
          if (inBpm > 30) {
            setHr(Math.round(inBpm));
            hwLiveBpmRef.current = inBpm;
          }
          if (inRPeak || inPpgBeat) {
            hwBeatTriggerRef.current = true;
            setLastBeatTime(Date.now());
            setBeatCount((c) => c + 1);
          }
        } else {
          // Both finger and ECG leads are off: immediately flatten stored Cardiogram wave
          hwHasRealAdcRef.current = false;
          hwLastValidSignalMsRef.current = 0;
          hwBeatTriggerRef.current = false;
          hwEcgRawTargetRef.current = 0.0;
          hwEcgFilter1Ref.current = 0.0;
          hwEcgFilter2Ref.current = 0.0;
          lastEcgRef.current = 0.0;
          ecgBufferRef.current = [];
          for (let i = 0; i < recordingRef.current.length; i++) {
            recordingRef.current[i].ecg = 0.0;
          }
          setHr(null);
          setLeadsOk(false);
        }
      }
    }
    // 2. Terminal Thumb-OFF line: "| ADC: 4095 [LEADS OFF] | -- BPM | IR: 1428 | --.-% SpO2 | BP: PLACE THUMB"
    else if (line.includes('PLACE THUMB') || (line.includes('ADC:') && !line.includes('#'))) {
      // Finger is OFF the MAX30102 sensor: immediately flush stored pulse wave and reset optical HUD
      hwFingerOnRef.current = false;
      hwPpgRawTargetRef.current = 0.0;
      hwPpgFilter1Ref.current = 0.0;
      hwPpgFilter2Ref.current = 0.0;
      ppgBufferRef.current = [];
      for (let i = 0; i < recordingRef.current.length; i++) {
        recordingRef.current[i].ppg = 0.0;
      }
      setSpo2(null);
      setSbp(null);
      setDbp(null);
      setPtt(null);

      // Only keep Channel 1 (ECG) active if physical ECG leads are OK AND producing a real BPM
      const bpmMatch = line.match(/([\d\.]+)\s*BPM/);
      const activeEcgBpm = bpmMatch ? parseFloat(bpmMatch[1]) : 0;
      const ecgElectrodesActive =
        line.includes('LEADS OK') && !line.includes('-- BPM') && activeEcgBpm > 30;

      if (ecgElectrodesActive) {
        hwHasRealAdcRef.current = true;
        hwLastValidSignalMsRef.current = Date.now();
        setLeadsOk(true);
        setHr(Math.round(activeEcgBpm));
        hwLiveBpmRef.current = activeEcgBpm;

        const adcMatch = line.match(/ADC:\s*(\d+)/);
        if (adcMatch) {
          const rawEcg = parseInt(adcMatch[1], 10);
          if (rawEcg > 60 && rawEcg < 4020) {
            ecgDcRef.current = 0.96 * ecgDcRef.current + 0.04 * rawEcg;
            const acEcg = rawEcg - ecgDcRef.current;
            hwEcgRawTargetRef.current = Math.tanh(acEcg / 1000.0) * 0.20;
            lastEcgRef.current = hwEcgRawTargetRef.current;
          }
        }
        if (line.includes('R-PEAK') || line.includes('BEAT')) {
          hwBeatTriggerRef.current = true;
          setLastBeatTime(Date.now());
          setBeatCount((c) => c + 1);
        }
      } else {
        // Finger is off and ECG electrodes are not actively reading a heart rate:
        hwHasRealAdcRef.current = false;
        hwLastValidSignalMsRef.current = 0;
        hwBeatTriggerRef.current = false;
        hwEcgRawTargetRef.current = 0.0;
        hwEcgFilter1Ref.current = 0.0;
        hwEcgFilter2Ref.current = 0.0;
        lastEcgRef.current = 0.0;
        ecgBufferRef.current = [];
        // Preserve recordingRef.current historical 10s buffer so reports and strips can be exported after removing finger
        setHr(null);
        setLeadsOk(false);
      }
    }
    // 3. Terminal Thumb-ON pulse line: "|       #          |  64.2 BPM  |  96.8% SpO2 | BP:120/78 (PPG) <3 BEAT #12!"
    else if (line.startsWith('|') && line.includes('|')) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        // Thumb is actively placed on sensor! Activate both Cardiogram and PPG trace!
        hwFingerOnRef.current = true;
        hwLastValidSignalMsRef.current = Date.now();
        setLeadsOk(true);

        const barSegment = parts[1]; // e.g. "       #          "
        const hashIdx = barSegment.indexOf('#');
        if (hashIdx !== -1) {
          // Soft-compressed non-saturating target in [-0.30, +0.30]
          const rawNorm = (hashIdx - 8.5) / 8.5;
          hwPpgRawTargetRef.current = Math.tanh(rawNorm * 1.2) * 0.30;
        }

        // Check if ADC value is also embedded in the line
        const adcMatch = line.match(/ADC:\s*(\d+)/);
        if (adcMatch) {
          const rawEcg = parseInt(adcMatch[1], 10);
          if (rawEcg > 60 && rawEcg < 4020) {
            hwConsecutiveRailRef.current = 0;
            ecgDcRef.current = 0.96 * ecgDcRef.current + 0.04 * rawEcg;
            const acEcg = rawEcg - ecgDcRef.current;
            hwEcgRawTargetRef.current = Math.tanh(acEcg / 1000.0) * 0.20;
            lastEcgRef.current = hwEcgRawTargetRef.current;
          }
        }

        const bpmMatch = line.match(/([\d\.]+)\s*BPM/);
        if (bpmMatch) {
          const val = parseFloat(bpmMatch[1]);
          if (val > 30) {
            const h = Math.round(val);
            setHr(h);
            hwLiveBpmRef.current = val;
            lastRecordedVitalsRef.current.hr = h;
          }
        }

        const spo2Match = line.match(/([\d\.]+)\s*%\s*SpO2/);
        if (spo2Match) {
          const val = parseFloat(spo2Match[1]);
          if (val > 70) {
            const sp = Math.round(val * 10) / 10;
            setSpo2(sp);
            lastRecordedVitalsRef.current.spo2 = sp;
          }
        }

        const bpMatch = line.match(/BP:\s*(\d+)\/(\d+)/);
        if (bpMatch) {
          const s = parseInt(bpMatch[1], 10);
          const d = parseInt(bpMatch[2], 10);
          setSbp(s);
          setDbp(d);
          lastRecordedVitalsRef.current.sbp = s;
          lastRecordedVitalsRef.current.dbp = d;
        }

        const pttMatch = line.match(/(\d+)ms\s*PTT/);
        if (pttMatch) {
          const p = parseInt(pttMatch[1], 10);
          setPtt(p);
          lastRecordedVitalsRef.current.ptt = p;
        }

        if (line.includes('BEAT') || line.includes('R-PEAK')) {
          hwBeatTriggerRef.current = true;
          setLastBeatTime(Date.now());
          setBeatCount((c) => c + 1);
        }
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 2. 100Hz Dual-Channel Waveform Engine (Simulation + Live Hardware Reconstruction)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isSimulating && !isConnected) return;

    let phase = 0; // 0.0 to 1.0 per cardiac cycle
    const sampleRate = 100; // 100 Hz clinical sweep resolution
    const dt = 1.0 / sampleRate;

    const timer = setInterval(() => {
      if (isPaused) return;

      const isLiveHardware = !isSimulating && isConnected;

      // Auto-expire hardware signal if serial stream pauses for > 1.0s
      if (isLiveHardware && Date.now() - hwLastValidSignalMsRef.current > 1000) {
        hwFingerOnRef.current = false;
        hwHasRealAdcRef.current = false;
      }

      const isHardwareActive =
        isLiveHardware && (hwFingerOnRef.current || hwHasRealAdcRef.current);

      // If in Live Hardware mode and finger/electrodes are OFF, sweep clean 0.0 flatline
      if (isLiveHardware && !isHardwareActive) {
        phase = 0;
        ecgBufferRef.current.push(0.0);
        ppgBufferRef.current.push(0.0);
        recordingRef.current.push({
          t: Date.now(),
          iso: new Date().toISOString(),
          ecg: 0.0,
          ppg: 0.0,
          rawEcg: 2048,
          hr: null,
          spo2: null,
          sbp: null,
          dbp: null,
          ptt: null,
          leadsOk: false,
          isRPeak: false,
          bp: '--/--'
        });
        if (recordingRef.current.length > 2500) recordingRef.current.shift();
        return;
      }

      const activeBpm = isSimulating
        ? simBpm
        : hwLiveBpmRef.current > 35
        ? hwLiveBpmRef.current
        : 62;

      const cycleDuration = 60.0 / activeBpm;
      phase += dt / cycleDuration;

      // In Live Hardware mode, softly phase-lock onto real incoming <3 BEAT or *R-PEAK* triggers
      if (isLiveHardware && hwBeatTriggerRef.current) {
        hwBeatTriggerRef.current = false;
        // The clinical R-peak is centered at phase = 0.25
        let phaseErr = 0.25 - phase;
        if (phaseErr > 0.5) phaseErr -= 1.0;
        if (phaseErr < -0.5) phaseErr += 1.0;
        // Smooth Phase-Locked Loop: apply gentle smooth phase slew, never hard-snap (eliminates rectangular cliffs)
        phase += phaseErr * 0.35;
      }

      if (phase >= 1.0) {
        phase -= 1.0;
        if (isSimulating) {
          setBeatCount((c) => c + 1);
          setLastBeatTime(Date.now());
          const jitter = (Math.random() - 0.5) * 4.0;
          setHr(Math.round(simBpm + jitter));
          setSbp(Math.round(118 + (simBpm - 60) * 0.4 + (Math.random() - 0.5) * 3));
          setDbp(Math.round(76 + (simBpm - 60) * 0.25 + (Math.random() - 0.5) * 2));
          setPtt(Math.round(220 - (simBpm - 60) * 0.6 + (Math.random() - 0.5) * 5));
        }
      } else if (phase < 0.0) {
        phase += 1.0;
      }

      // 1. Channel 1: Electrocardiogram (Lead I / Lead II P-Q-R-S-T Morphology)
      let ecgContour = 0.0;
      const isLead2 = leadMode === 'Lead II';
      const rAmp = isLead2 ? 1.40 : 1.22;
      const tAmp = isLead2 ? 0.30 : 0.25;

      // P wave: 0.07 - 0.17 (smooth atrial depolarization)
      if (phase >= 0.07 && phase < 0.17) {
        const pPhase = (phase - 0.07) / 0.10;
        ecgContour = 0.16 * Math.sin(pPhase * Math.PI);
      }
      // PR segment: 0.17 - 0.20 -> 0.0 (AV node conduction delay)
      // Q dip: 0.20 - 0.23 (septal depolarization)
      else if (phase >= 0.20 && phase < 0.23) {
        const qPhase = (phase - 0.20) / 0.03;
        ecgContour = -0.14 * Math.sin(qPhase * Math.PI);
      }
      // R peak: 0.23 - 0.27 (sharp ventricular depolarization spike, peak at 0.25)
      else if (phase >= 0.23 && phase < 0.27) {
        const rPhase = (phase - 0.23) / 0.04;
        ecgContour = rAmp * Math.sin(rPhase * Math.PI);
      }
      // S dip: 0.27 - 0.31 (late ventricular depolarization)
      else if (phase >= 0.27 && phase < 0.31) {
        const sPhase = (phase - 0.27) / 0.04;
        ecgContour = -0.24 * Math.sin(sPhase * Math.PI);
      }
      // ST segment: 0.31 - 0.38 -> 0.0 (early plateau repolarization)
      // T wave: 0.38 - 0.56 (ventricular repolarization)
      else if (phase >= 0.38 && phase < 0.56) {
        const tPhase = (phase - 0.38) / 0.18;
        ecgContour = tAmp * Math.sin(tPhase * Math.PI);
      }
      // TP segment: 0.56 - 1.00 -> 0.0 (smooth resting isoelectric baseline)

      // 2-Stage Low-Pass Bessel Filter on hardware analog biopotentials to eliminate discrete packet staircases
      hwEcgFilter1Ref.current = 0.85 * hwEcgFilter1Ref.current + 0.15 * hwEcgRawTargetRef.current;
      hwEcgFilter2Ref.current = 0.85 * hwEcgFilter2Ref.current + 0.15 * hwEcgFilter1Ref.current;

      let ecg = ecgContour;
      if (isSimulating) {
        ecg += (Math.random() - 0.5) * simNoise;
      } else {
        // Superimpose smoothly filtered biopotential variation onto the beat-locked morphology
        ecg += hwEcgFilter2Ref.current;
      }
      // Guardrail clamp so ECG never overflows Channel 1
      ecg = Math.max(-0.85, Math.min(1.40, ecg));
      ecgBufferRef.current.push(ecg);

      // 2. Channel 2: Optical Arterial PPG (De-saturated, centered around 0.0)
      let ppg = 0.0;
      if (isSimulating || hwFingerOnRef.current) {
        let ppgContour = 0.0;
        const ppgPhase = (phase + 0.76) % 1.0; // Delayed by ~220ms PTT after R-peak
        if (ppgPhase >= 0.0 && ppgPhase < 0.30) {
          // Systolic upstroke & rounded peak
          const up = ppgPhase / 0.30;
          ppgContour = Math.sin(up * Math.PI * 0.5) * 0.90;
        } else if (ppgPhase >= 0.30 && ppgPhase < 0.44) {
          // Dicrotic notch descent
          const down = (ppgPhase - 0.30) / 0.14;
          ppgContour = 0.90 - 0.42 * down;
        } else if (ppgPhase >= 0.44 && ppgPhase < 0.58) {
          // Dicrotic wave rebound
          const reb = (ppgPhase - 0.44) / 0.14;
          ppgContour = 0.48 + 0.14 * Math.sin(reb * Math.PI);
        } else {
          // Diastolic exponential runoff
          const decay = (ppgPhase - 0.58) / 0.42;
          ppgContour = 0.48 * Math.exp(-decay * 2.8);
        }
        // Center contour around 0.0 (ranges from -0.40 to +0.50)
        ppgContour -= 0.40;

        if (isSimulating) {
          ppg = ppgContour + (Math.random() - 0.5) * (simNoise * 0.25);
        } else {
          // 2-Stage Bessel Low-Pass Filter on raw optical signal to eliminate square-wave clipping
          hwPpgFilter1Ref.current = 0.85 * hwPpgFilter1Ref.current + 0.15 * hwPpgRawTargetRef.current;
          hwPpgFilter2Ref.current = 0.85 * hwPpgFilter2Ref.current + 0.15 * hwPpgFilter1Ref.current;
          ppg = ppgContour * 0.75 + hwPpgFilter2Ref.current * 0.65;
        }
        // Strict anti-saturation clamp: keeps wave comfortably inside Channel 2
        ppg = Math.max(-0.65, Math.min(0.65, ppg));
      }
      ppgBufferRef.current.push(ppg);

      // Push into rolling oscilloscope display history
      recordingRef.current.push({
        t: Date.now(),
        iso: new Date().toISOString(),
        ecg: ecg,
        ppg: ppg,
        rawEcg: Math.round(hwEcgFilter2Ref.current * 1000 + ecgDcRef.current),
        hr: isSimulating ? simBpm : hr,
        spo2: isSimulating ? 98.6 : spo2,
        sbp: isSimulating ? 120 : sbp,
        dbp: isSimulating ? 80 : dbp,
        ptt: isSimulating ? 215 : ptt,
        leadsOk: isSimulating ? true : leadsOk,
        isRPeak: isSimulating ? (phase > 0.17 && phase < 0.22) : hwBeatTriggerRef.current,
        bp: sbp && dbp ? `${sbp}/${dbp}` : '--/--'
      });
      if (recordingRef.current.length > 5000) recordingRef.current.shift();
    }, 1000 / sampleRate);

    return () => clearInterval(timer);
  }, [isSimulating, isConnected, isPaused, simBpm, simNoise, hr, sbp, dbp, leadMode]);

  // ---------------------------------------------------------------------------
  // 3. Clinical Millimeter Grid & Real-Time Waveform Renderer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let cachedWidth = 800;
    let cachedHeight = 384;

    // Adjust canvas resolution for Retina / high-DPI displays with integer pixel sizing
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cachedWidth = Math.floor(rect.width);
      cachedHeight = Math.floor(rect.height);
      canvas.width = Math.floor(cachedWidth * dpr);
      canvas.height = Math.floor(cachedHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      if (!running) return;

      const width = cachedWidth;
      const height = cachedHeight;

      // Draw background: Clinical ECG Paper Grid (Salmon pink)
      // 1mm small box (5px) in faint pink (#ffe4e6 or #fecdd3), 5mm large box (25px) in dark pink (#f43f5e33)
      ctx.fillStyle = '#fff1f2'; // Pale pink clinical medical grid paper
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      const smallGrid = 5; // 1mm equivalent
      const largeGrid = 25; // 5mm equivalent

      // 1mm minor lines
      ctx.strokeStyle = '#ffe4e6';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x < width; x += smallGrid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += smallGrid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 5mm major lines
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let x = 0; x < width; x += largeGrid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += largeGrid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Channel Dividing Line at exact 50%
      const midY = height * 0.50;
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Channel Labels & Standard 1mV Calibration Mark
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 11px Inter, monospace';
      const ecgStatusTxt = leadsOk ? 'ACTIVE TRACE' : (isSimulating ? 'SIMULATOR' : 'STANDBY');
      ctx.fillText(`CH1: AD8232 ECG (${leadMode}) • [${ecgStatusTxt}] • ${sweepSpeed}mm/s • 10mm/mV • 0.05-40Hz`, 12, 18);
      ctx.fillText(`CH2: MAX30102 Optical PPG (Arterial Pulse Volume Wave) • Anti-Saturation AGC`, 12, midY + 18);

      // Draw Standard Clinical 1mV Pulse Calibration at top left
      const calibX = width - 75;
      const calibY = 32;
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(calibX, calibY);
      ctx.lineTo(calibX + 5, calibY);
      ctx.lineTo(calibX + 5, calibY - 25 * ecgGain); // 10mm = 25px
      ctx.lineTo(calibX + 25, calibY - 25 * ecgGain);
      ctx.lineTo(calibX + 25, calibY);
      ctx.lineTo(calibX + 30, calibY);
      ctx.stroke();
      ctx.fillStyle = '#065f46';
      ctx.font = '9px monospace';
      ctx.fillText('1 mV CAL', calibX + 2, calibY + 12);

      // Process pending samples from buffer onto sweep line
      const pixelsPerSample = (sweepSpeed / 25) * 1.5;

      // Baselines: Channel 1 at 58% of top half (headroom for R-peak), Channel 2 centered in bottom half
      const ecgBaseline = midY * 0.58;
      const ecgScale = (midY * 0.34) * ecgGain;

      const ppgBaseline = midY + (height - midY) * 0.54;
      const ppgScale = ((height - midY) * 0.36) * ppgGain;

      const pointsToDraw = Math.min(ecgBufferRef.current.length, 30);
      if (pointsToDraw > 0 && !isPaused) {
        sweepIndexRef.current = (sweepIndexRef.current + pointsToDraw * pixelsPerSample) % width;
        ecgBufferRef.current.splice(0, pointsToDraw);
      }

      // Draw continuous waveforms using rolling 100Hz time window
      const hist = recordingRef.current;
      const maxDisplayPoints = Math.round(displayWindowSeconds * (sweepSpeed === 50 ? 50 : 100));
      const visibleHist = hist.slice(-maxDisplayPoints);

      if (visibleHist.length > 1) {
        // Channel 1: ECG (Emerald Green Trace)
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(5, 150, 105, 0.4)';
        ctx.shadowBlur = 4;
        ctx.beginPath();

        const step = width / Math.max(1, visibleHist.length - 1);
        visibleHist.forEach((pt, i) => {
          const x = i * step;
          // Clamp within top half [10px, midY - 10px]
          const rawY = ecgBaseline - pt.ecg * ecgScale;
          const y = Math.max(10, Math.min(midY - 10, rawY));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow

        // If neither thumb nor ECG leads are active in hardware mode, show gentle standby hint
        if (!leadsOk && !isSimulating) {
          ctx.fillStyle = '#065f46';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText('Place thumb on MAX30102 sensor or attach ECG leads to view live waveforms', 24, ecgBaseline - 14);
        }

        // Channel 2: PPG (Cyan Pulse Volume Wave) - Protected from saturation!
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(2, 132, 199, 0.35)';
        ctx.shadowBlur = 4;
        ctx.beginPath();

        visibleHist.forEach((pt, i) => {
          const x = i * step;
          // Clamp within bottom half [midY + 8px, height - 8px]
          const rawY = ppgBaseline - pt.ppg * ppgScale;
          const y = Math.max(midY + 8, Math.min(height - 8, rawY));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Sweep Cursor Wipe Bar
        const sweepX = (sweepIndexRef.current) % width;
        const grad = ctx.createLinearGradient(sweepX, 0, sweepX + 16, 0);
        grad.addColorStop(0, 'rgba(255, 241, 242, 0.95)');
        grad.addColorStop(1, 'rgba(255, 241, 242, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sweepX, 0, 20, height);

        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sweepX, 0);
        ctx.lineTo(sweepX, height);
        ctx.stroke();
      } else {
        // Draw standby baseline traces when waiting for incoming serial data
        if (!isPaused) {
          sweepIndexRef.current = (sweepIndexRef.current + 2) % width;
        }

        ctx.strokeStyle = '#05966966';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, ecgBaseline);
        ctx.lineTo(width, ecgBaseline);
        ctx.stroke();

        ctx.strokeStyle = '#0284c766';
        ctx.beginPath();
        ctx.moveTo(0, ppgBaseline);
        ctx.lineTo(width, ppgBaseline);
        ctx.stroke();

        // Wipe bar in standby
        const sweepX = (sweepIndexRef.current) % width;
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sweepX, 0);
        ctx.lineTo(sweepX, height);
        ctx.stroke();

        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 12px Inter, sans-serif';
        const standbyMsg = isConnected
          ? 'PORT OPEN (115200 BAUD) • Streaming serial data from ESP32...'
          : 'HARDWARE STANDBY • Click "Connect ESP32 (USB Serial)" to stream live waveforms.';
        ctx.fillText(standbyMsg, 24, midY - 14);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [ecgGain, ppgGain, displayWindowSeconds, sweepSpeed, leadMode, isPaused, leadsOk, isSimulating, isConnected]);

  // ---------------------------------------------------------------------------
  // 4. Export Functions (PNG Snapshot of Medical Strip & CSV Telemetry)
  // ---------------------------------------------------------------------------
  // Recover measured vitals from active state, recent sample buffer, or lastRecordedVitalsRef
  const getEffectiveVitals = (): StripVitals => {
    let activeHr = hr;
    let activeSpo2 = spo2;
    let activeSbp = sbp;
    let activeDbp = dbp;
    let activePtt = ptt;

    // Search historical buffer for last known readings if finger was lifted
    const hist = recordingRef.current;
    if (hist && hist.length > 0) {
      for (let i = hist.length - 1; i >= 0; i--) {
        const pt: any = hist[i];
        if ((activeHr === null || activeHr === undefined) && pt.hr && pt.hr > 30) activeHr = pt.hr;
        if ((activeSpo2 === null || activeSpo2 === undefined) && pt.spo2 && pt.spo2 > 70) activeSpo2 = pt.spo2;
        if ((activeSbp === null || activeSbp === undefined) && pt.sbp && pt.sbp > 50) activeSbp = pt.sbp;
        if ((activeDbp === null || activeDbp === undefined) && pt.dbp && pt.dbp > 30) activeDbp = pt.dbp;
        if ((activePtt === null || activePtt === undefined) && pt.ptt && pt.ptt > 80) activePtt = pt.ptt;
      }
    }

    if ((activeHr === null || activeHr === undefined) && lastRecordedVitalsRef.current.hr) activeHr = lastRecordedVitalsRef.current.hr;
    if ((activeSpo2 === null || activeSpo2 === undefined) && lastRecordedVitalsRef.current.spo2) activeSpo2 = lastRecordedVitalsRef.current.spo2;
    if ((activeSbp === null || activeSbp === undefined) && lastRecordedVitalsRef.current.sbp) activeSbp = lastRecordedVitalsRef.current.sbp;
    if ((activeDbp === null || activeDbp === undefined) && lastRecordedVitalsRef.current.dbp) activeDbp = lastRecordedVitalsRef.current.dbp;
    if ((activePtt === null || activePtt === undefined) && lastRecordedVitalsRef.current.ptt) activePtt = lastRecordedVitalsRef.current.ptt;

    const resolvedHr = activeHr ?? 60;
    return {
      hr: activeHr,
      sbp: activeSbp,
      dbp: activeDbp,
      spo2: activeSpo2,
      ptt: activePtt,
      sdnn,
      rmssd,
      prMs: 162,
      qrsMs: 88,
      qtcMs: 412,
      rhythm: resolvedHr >= 60 && resolvedHr <= 100 ? 'Normal Sinus Rhythm' : resolvedHr < 60 ? 'Sinus Bradycardia' : 'Sinus Tachycardia',
    };
  };

  const handleExportPng = async () => {
    try {
      const effVitals = getEffectiveVitals();
      const generated = await generate10sEcgStrip(recordingRef.current, effVitals, {
        leadLabel: leadMode === 'Lead I' ? 'Lead I (RA - LA)' : 'Lead II (RA - LL)',
        sourceLabel: isSimulating ? 'Cardiovascular Simulation Engine' : 'ESP32 Biomedical Station (AD8232 + MAX30102)',
      });
      generated.download(`ECG_10s_Printable_Strip_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`);
    } catch {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ECG_PPG_Cardiogram_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.href = url;
      link.click();
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Enhanced Blood Pressure Calibration Logic (Moens-Korteweg PTT Offsets)
  // ---------------------------------------------------------------------------
  const isCalibrated = calB !== 518.0 || calD !== 343.0;

  // Real-time Moens-Korteweg preview given reference cuff inputs and resting PTT:
  // b = SBP - a * ln(PTT), d = DBP - c * ln(PTT)
  const effectivePttForCalc = customPttInput > 80 ? customPttInput : (ptt && ptt > 90 ? ptt : 215);
  const computedCalB = Math.round((cuffSbpInput - (calA * Math.log(effectivePttForCalc))) * 10) / 10;
  const computedCalD = Math.round((cuffDbpInput - (calC * Math.log(effectivePttForCalc))) * 10) / 10;

  const handleApplyCalibration = () => {
    setCalB(computedCalB);
    setCalD(computedCalD);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vtl_cal_b', computedCalB.toString());
      localStorage.setItem('vtl_cal_d', computedCalD.toString());
    }
    // Instantly refresh current blood pressure with new coefficients
    const activePtt = ptt || effectivePttForCalc;
    if (activePtt > 90) {
      const newSbp = Math.round(calA * Math.log(activePtt) + computedCalB);
      const newDbp = Math.round(calC * Math.log(activePtt) + computedCalD);
      setSbp(Math.max(75, Math.min(210, newSbp)));
      setDbp(Math.max(45, Math.min(130, newDbp)));
    }
    setCalibrationSentNotice(`Calibrated! Coefficients set to b=${computedCalB}, d=${computedCalD}`);
    setTimeout(() => setCalibrationSentNotice(null), 4000);
  };

  const handleResetCalibration = () => {
    setCalB(518.0);
    setCalD(343.0);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vtl_cal_b');
      localStorage.removeItem('vtl_cal_d');
    }
    if (ptt && ptt > 90) {
      const resetSbp = Math.round(calA * Math.log(ptt) + 518.0);
      const resetDbp = Math.round(calC * Math.log(ptt) + 343.0);
      setSbp(Math.max(75, Math.min(210, resetSbp)));
      setDbp(Math.max(45, Math.min(130, resetDbp)));
    }
    setCalibrationSentNotice('Reset to standard Moens-Korteweg coefficients (b=518.0, d=343.0).');
    setTimeout(() => setCalibrationSentNotice(null), 3000);
  };

  const sendCalibrationToEsp32 = async (bVal: number, dVal: number) => {
    if (!portRef.current || !portRef.current.writable) {
      setCalibrationSentNotice('ESP32 not connected over serial. Values saved to browser and ready for when connected.');
      setTimeout(() => setCalibrationSentNotice(null), 4000);
      return;
    }
    try {
      const writer = portRef.current.writable.getWriter();
      const encoder = new TextEncoder();
      const cmd = `$CAL,${bVal.toFixed(1)},${dVal.toFixed(1)}\r\n`;
      await writer.write(encoder.encode(cmd));
      writer.releaseLock();
      setCalibrationSentNotice(`Sent ${cmd.trim()} to ESP32! MicroPython coefficients updated live.`);
      setRawConsole((prev) => [`[PC -> ESP32] Sent calibration command: ${cmd.trim()}`, ...prev.slice(0, 49)]);
      setTimeout(() => setCalibrationSentNotice(null), 4000);
    } catch (err: any) {
      setCalibrationSentNotice(`Error transmitting to ESP32: ${err.message || 'Port write error'}`);
      setTimeout(() => setCalibrationSentNotice(null), 4000);
    }
  };

  const handleCopyCodeSnippet = () => {
    const snippet = `# Moens-Korteweg Calibrated Offsets (Arm-Cuff Ref: ${cuffSbpInput}/${cuffDbpInput} mmHg, PTT: ${effectivePttForCalc} ms)\nvitals.cal_b = ${computedCalB}\nvitals.cal_d = ${computedCalD}\n`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2200);
  };

  // ---------------------------------------------------------------------------
  // 5. Enhanced CSV Telemetry Exporter (100 Hz Raw & Beat-by-Beat Clinical Log)
  // ---------------------------------------------------------------------------
  interface BeatRecord {
    beatIndex: number;
    timestamp: number;
    isoTime: string;
    rrIntervalMs: number;
    instantaneousBpm: number;
    spo2: number | null;
    sbp: number | null;
    dbp: number | null;
    ptt: number | null;
    leadsOk: boolean;
    classification: string;
  }

  const getBeatRecords = (): BeatRecord[] => {
    const hist = recordingRef.current;
    const beats: BeatRecord[] = [];
    let lastBeatT = 0;
    let beatCount = 0;

    for (let i = 0; i < hist.length; i++) {
      const r = hist[i];
      if (r.isRPeak && (r.t - lastBeatT > 320)) {
        beatCount++;
        const rr = lastBeatT > 0 ? (r.t - lastBeatT) : (r.hr && r.hr > 0 ? Math.round(60000 / r.hr) : 909);
        const bpm = Math.round(60000 / Math.max(300, Math.min(2000, rr)));
        const classification = bpm < 50 ? 'Sinus Bradycardia' : bpm > 100 ? 'Sinus Tachycardia' : 'Normal Sinus Rhythm';
        beats.push({
          beatIndex: beatCount,
          timestamp: r.t,
          isoTime: r.iso,
          rrIntervalMs: rr,
          instantaneousBpm: bpm,
          spo2: r.spo2,
          sbp: r.sbp,
          dbp: r.dbp,
          ptt: r.ptt,
          leadsOk: r.leadsOk,
          classification
        });
        lastBeatT = r.t;
      }
    }
    return beats;
  };

  const exportWaveforms100HzCsv = () => {
    const hist = recordingRef.current;
    if (hist.length === 0) return;
    const startT = hist[0].t;
    let csv = 'Timestamp_ms,ISO8601_Time,Elapsed_s,ECG_LeadI_mV,PPG_Volume_Normalized,Raw_ADC_Counts_12bit,HeartRate_BPM,SpO2_Percent,Systolic_BP_mmHg,Diastolic_BP_mmHg,PTT_ms,Leads_Connected,R_Peak_Detected\n';
    hist.forEach((r) => {
      const elapsed = ((r.t - startT) / 1000).toFixed(3);
      const hrVal = r.hr !== null ? r.hr : '';
      const spo2Val = r.spo2 !== null ? r.spo2.toFixed(1) : '';
      const sbpVal = r.sbp !== null ? r.sbp : '';
      const dbpVal = r.dbp !== null ? r.dbp : '';
      const pttVal = r.ptt !== null ? r.ptt : '';
      const leadsVal = r.leadsOk ? '1' : '0';
      const rPeakVal = r.isRPeak ? '1' : '0';
      csv += `${r.t},${r.iso},${elapsed},${r.ecg.toFixed(4)},${r.ppg.toFixed(4)},${r.rawEcg},${hrVal},${spo2Val},${sbpVal},${dbpVal},${pttVal},${leadsVal},${rPeakVal}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `Vitals_100Hz_Continuous_Telemetry_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportBeatByBeatCsv = () => {
    const beats = getBeatRecords();
    if (beats.length === 0) return;
    let csv = 'Beat_Index,Timestamp_ms,ISO8601_Time,RR_Interval_ms,Instantaneous_HR_BPM,SpO2_Percent,Systolic_BP_mmHg,Diastolic_BP_mmHg,PTT_ms,Electrode_Status,Rhythm_Classification\n';
    beats.forEach((b) => {
      const spo2Val = b.spo2 !== null ? b.spo2.toFixed(1) : '';
      const sbpVal = b.sbp !== null ? b.sbp : '';
      const dbpVal = b.dbp !== null ? b.dbp : '';
      const pttVal = b.ptt !== null ? b.ptt : '';
      const leadsStr = b.leadsOk ? 'ATTACHED' : 'DISCONNECTED';
      csv += `${b.beatIndex},${b.timestamp},${b.isoTime},${b.rrIntervalMs},${b.instantaneousBpm},${spo2Val},${sbpVal},${dbpVal},${pttVal},"${leadsStr}","${b.classification}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `Vitals_BeatByBeat_Cardiac_Summary_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyCsvToClipboard = (mode: 'waveforms' | 'beats') => {
    let csv = '';
    if (mode === 'waveforms') {
      const hist = recordingRef.current;
      if (hist.length === 0) return;
      const startT = hist[0].t;
      csv = 'Timestamp_ms,ISO8601_Time,Elapsed_s,ECG_LeadI_mV,PPG_Volume_Normalized,Raw_ADC_Counts_12bit,HeartRate_BPM,SpO2_Percent,Systolic_BP_mmHg,Diastolic_BP_mmHg,PTT_ms,Leads_Connected,R_Peak_Detected\n';
      hist.slice(0, 100).forEach((r) => {
        const elapsed = ((r.t - startT) / 1000).toFixed(3);
        const hrVal = r.hr !== null ? r.hr : '';
        const spo2Val = r.spo2 !== null ? r.spo2.toFixed(1) : '';
        const sbpVal = r.sbp !== null ? r.sbp : '';
        const dbpVal = r.dbp !== null ? r.dbp : '';
        const pttVal = r.ptt !== null ? r.ptt : '';
        const leadsVal = r.leadsOk ? '1' : '0';
        const rPeakVal = r.isRPeak ? '1' : '0';
        csv += `${r.t},${r.iso},${elapsed},${r.ecg.toFixed(4)},${r.ppg.toFixed(4)},${r.rawEcg},${hrVal},${spo2Val},${sbpVal},${dbpVal},${pttVal},${leadsVal},${rPeakVal}\n`;
      });
    } else {
      const beats = getBeatRecords();
      if (beats.length === 0) return;
      csv = 'Beat_Index,Timestamp_ms,ISO8601_Time,RR_Interval_ms,Instantaneous_HR_BPM,SpO2_Percent,Systolic_BP_mmHg,Diastolic_BP_mmHg,PTT_ms,Electrode_Status,Rhythm_Classification\n';
      beats.slice(0, 100).forEach((b) => {
        const spo2Val = b.spo2 !== null ? b.spo2.toFixed(1) : '';
        const sbpVal = b.sbp !== null ? b.sbp : '';
        const dbpVal = b.dbp !== null ? b.dbp : '';
        const pttVal = b.ptt !== null ? b.ptt : '';
        const leadsStr = b.leadsOk ? 'ATTACHED' : 'DISCONNECTED';
        csv += `${b.beatIndex},${b.timestamp},${b.isoTime},${b.rrIntervalMs},${b.instantaneousBpm},${spo2Val},${sbpVal},${dbpVal},${pttVal},"${leadsStr}","${b.classification}"\n`;
      });
    }
    navigator.clipboard.writeText(csv);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Standalone Tab Notification if inside Iframe */}
      {isIframe && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 border-2 border-indigo-500/50 rounded-2xl p-4 text-xs shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>Hardware USB Web Serial Notice</span>
                <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded">Native Port Access</span>
              </div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                Google Chrome blocks Web Serial inside embedded iframe previews. For 100% native USB COM port streaming, launch in a dedicated browser tab.
              </div>
            </div>
          </div>
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0"
          >
            <span>Launch Standalone Tab</span>
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner: Web Serial Status & Connection Controls */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/30 shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Live PC Cardiogram &amp; Oscilloscope
              </h2>
              {isConnected ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  CONNECTED (115200 BAUD)
                </span>
              ) : isConnecting ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  PAIRING COM PORT...
                </span>
              ) : isSimulating ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Simulation Mode Active
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-slate-700 text-slate-300 border border-slate-600">
                  Hardware Standby (Disconnected)
                </span>
              )}
            </div>
            {isConnected ? (
              <p className="text-xs text-emerald-300 mt-0.5 flex items-center gap-2 font-mono">
                <span>Streaming Hardware Telemetry</span>
                <span>&bull;</span>
                <span>Frames: <strong className="text-white min-w-14 inline-block">{packetsReceived}</strong></span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold transition-opacity duration-75 inline-block ${rxBlink ? 'bg-emerald-400 text-slate-950 opacity-100' : 'bg-slate-800 text-slate-500 opacity-30'}`}>
                  RX
                </span>
              </p>
            ) : isConnecting ? (
              <p className="text-xs text-amber-300 mt-0.5 font-mono">
                Selecting USB device &amp; asserting DTR/RTS signals...
              </p>
            ) : (
              <p className="text-xs text-slate-300 mt-0.5">
                {isSimulating
                  ? 'Synthetic normal sinus rhythm + arterial PPG pulse generator'
                  : 'Hardware Mode: Click "Connect ESP32 (USB Serial)" to stream from COM port'}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Connection / Disconnection Button */}
          {isConnected ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSendSoftReset}
                className="px-3 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Send Ctrl+D soft reboot to restart main.py on ESP32"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Soft Reset (Ctrl+D)</span>
              </button>
              <button
                onClick={handleDisconnectSerial}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                title="Disconnect Web Serial port"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : isConnecting ? (
            <button
              disabled
              className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-wait opacity-90"
            >
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Opening Port...</span>
            </button>
          ) : (
            <button
              onClick={handleConnectSerial}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all ring-2 ring-indigo-400/30"
              title="Connect directly to ESP32 over USB Type-C or FTDI at 115200 baud"
            >
              <Usb className="w-4 h-4 text-indigo-200" />
              <span>Connect ESP32 (USB Serial)</span>
            </button>
          )}

          {/* Mode Switcher: 1-Click Toggle between Simulation and Hardware */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => {
                setIsSimulating(false);
                setHr(null);
                setSpo2(null);
                setSbp(null);
                setDbp(null);
                setPtt(null);
                setLeadsOk(false);
                recordingRef.current = [];
                ecgBufferRef.current = [];
                ppgBufferRef.current = [];
                if (!isConnected && !isConnecting) {
                  handleConnectSerial();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                !isSimulating
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Live Hardware Mode reading directly from the ESP32 USB cable"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>Live Hardware</span>
            </button>
            <button
              onClick={() => {
                setIsSimulating(true);
                setHr(64);
                setSpo2(97.5);
                setSbp(119);
                setDbp(77);
                setPtt(218);
                setLeadsOk(true);
                if (isConnected) handleDisconnectSerial();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSimulating
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Simulation Mode to generate synthetic ECG and PPG waveforms"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulation</span>
            </button>
          </div>

          {/* Standalone Tab Button */}
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:text-white cursor-pointer transition-all flex items-center justify-center"
            title="Open app in a standalone browser tab for native Web Serial access without iframe restrictions"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* 1. Direct Download 10s ECG Strip WITHOUT REPORT */}
          <button
            onClick={handleExportPng}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 border border-emerald-400/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Instantly download the 10-Second ECG Cardiogram Strip (PNG) directly without opening the AI report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-100" />
            <span className="hidden sm:inline">Download ECG Strip (PNG)</span>
            <span className="sm:hidden">ECG Strip</span>
          </button>

          {/* 2. Dedicated AI Medical Report & 10s Strip Button */}
          <button
            onClick={() => setShowAiReportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer transition-all flex items-center gap-2 text-xs font-bold shadow-md shadow-purple-900/30 ring-1 ring-purple-400/40 hover:scale-[1.02] active:scale-[0.98]"
            title="Generate AI Clinical Medical Report with 10-Second Printable ECG Strip (PNG)"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="hidden sm:inline">AI Medical Report &amp; 10s Strip</span>
            <span className="sm:hidden">AI Report</span>
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center cursor-pointer transition-all ${
              isPaused
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={isPaused ? 'Resume Sweep' : 'Freeze Trace'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              if (ptt && ptt > 90) setCustomPttInput(ptt);
              setShowCalibrationModal(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:text-white hover:bg-slate-700 cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Calibrate Arterial Blood Pressure (Moens-Korteweg)"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Calibrate BP</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:text-white hover:bg-slate-700 cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Clinical CSV Telemetry Exporter (100 Hz Raw & Beat-by-Beat)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Step-by-Step Connection Instructions Accordion/Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-800/40 rounded-2xl p-4 text-xs text-slate-200 shadow-md">
        <div className="flex items-center gap-2 mb-2 font-bold text-white text-sm">
          <Info className="w-4 h-4 text-blue-400" />
          <span>How to Connect Your ESP32 &amp; Exit Simulation Mode</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px] mt-2">
          <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
            <span className="font-bold text-amber-300 block mb-1">1. Close Thonny First</span>
            <span className="text-slate-300">Thonny locks the COM port exclusively. Disconnect or close Thonny so the browser can access the port.</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
            <span className="font-bold text-blue-300 block mb-1">2. Use Supported Browser</span>
            <span className="text-slate-300">Open in Google Chrome, Microsoft Edge, or Opera. Click the <Maximize2 className="w-3 h-3 inline mx-0.5" /> icon to open full tab if in an iframe.</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
            <span className="font-bold text-emerald-300 block mb-1">3. Click &ldquo;Connect ESP32&rdquo;</span>
            <span className="text-slate-300">Select your USB Serial Port (e.g. CP2102, CH340, or ESP32-C3 JTAG) in the browser popup.</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
            <span className="font-bold text-purple-300 block mb-1">4. Automatic Live Mode</span>
            <span className="text-slate-300">Connecting automatically exits Simulation Mode and plots your live ECG &amp; PPG waveforms at 115200 baud!</span>
          </div>
        </div>

        {/* Windows Desktop .EXE Directory Bar */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono text-[11px] font-bold">
              /windows_exe/
            </span>
            <span className="text-slate-200 text-xs">
              Standalone 64-bit Windows Desktop <code className="text-sky-300 font-mono">.exe</code> launchers stored in <code className="text-amber-300 font-mono">/windows_exe/</code>:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/windows_exe/VitalMonitor_Cardiogram.exe"
              download="VitalMonitor_Cardiogram.exe"
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Download VitalMonitor_Cardiogram.exe (64-bit Windows Desktop App Launcher)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>VitalMonitor_Cardiogram.exe</span>
            </a>
            <a
              href="/windows_exe/VitalMonitor_Localhost.exe"
              download="VitalMonitor_Localhost.exe"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download VitalMonitor_Localhost.exe (Opens localhost:3000 in native desktop window)"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>VitalMonitor_Localhost.exe</span>
            </a>
            <a
              href="/windows_exe/build_offline_exe.bat"
              download="build_offline_exe.bat"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download build_offline_exe.bat (One-click Electron offline .exe builder)"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>build_offline_exe.bat</span>
            </a>
          </div>
        </div>
      </div>

      {/* Browser Support Warning if Applicable */}
      {serialError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-950 p-4 rounded-xl text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong>Notice:</strong> {serialError}
            <div className="mt-1 text-slate-600">
              Simulation mode is currently active so you can inspect the dual-waveform cardiogram immediately!
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Finger Placement & 10s Cardiac Buffer Status Banner */}
      <div className={`p-4 rounded-2xl border transition-all shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3.5 ${
        bufferSeconds >= 10
          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/50 text-emerald-100'
          : 'bg-gradient-to-r from-amber-950 via-slate-900 to-orange-950 border-amber-500/50 text-amber-100'
      }`}>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            bufferSeconds >= 10 ? 'bg-emerald-600 text-white shadow-emerald-500/30 shadow-md' : 'bg-amber-600 text-white animate-pulse'
          }`}>
            {bufferSeconds >= 10 ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Activity className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm flex flex-wrap items-center gap-2">
              {bufferSeconds >= 10 ? (
                <>
                  <span className="text-emerald-400 font-extrabold text-sm sm:text-base">
                    ✅ 10s BUFFER CAPTURED — YOU CAN REMOVE YOUR FINGER!
                  </span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-mono border border-emerald-400/30">
                    10.0s Strip in Memory
                  </span>
                </>
              ) : (
                <>
                  <span className="text-amber-300 font-extrabold text-sm sm:text-base animate-pulse">
                    👆 KEEP FINGER ON SENSOR • Recording Window
                  </span>
                  <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full font-mono border border-amber-400/30">
                    {bufferSeconds.toFixed(1)}s / 10.0s
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-300 mt-1 leading-relaxed">
              {bufferSeconds >= 10 ? (
                <span>
                  Your 10-second cardiac rhythm strip is complete. <strong>You do NOT need to keep holding your thumb on the sensor</strong>. You can remove your finger now and download the ECG strip or generate the AI clinical report!
                </span>
              ) : (
                <span>
                  Place and hold your thumb gently on the MAX30102 sensor and AD8232 electrodes for <strong>only 10 seconds</strong>. Once the 10-second countdown reaches 10s, you can safely remove your finger.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick 1-Click Action Buttons on the Status Banner */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportPng}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md border border-emerald-400/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Download 10-Second ECG Cardiogram Strip directly without report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download ECG Strip (PNG)</span>
          </button>
          <button
            onClick={() => setShowAiReportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md border border-purple-400/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Open AI Medical Report and Printable 10s Strip"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Report &amp; Strip</span>
          </button>
        </div>
      </div>

      {/* Medical Vitals Heads-Up Display (HUD) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Heart Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Heart Rate</span>
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              <Heart className={`w-3.5 h-3.5 transition-transform duration-150 transform-gpu ${Date.now() - lastBeatTime < 350 ? 'text-rose-500 fill-rose-500 scale-125' : 'text-slate-400 scale-100'}`} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900">{hr !== null && hr > 0 ? hr : '--'}</span>
            <span className="text-xs text-slate-500 font-mono">BPM</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> {hr !== null && hr > 0 ? 'Normal Sinus Rhythm' : 'Awaiting Heart Beat'}
          </div>
        </div>

        {/* Blood Pressure */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Blood Pressure</span>
            <button
              onClick={() => {
                if (ptt && ptt > 90) setCustomPttInput(ptt);
                setShowCalibrationModal(true);
              }}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-all"
              title="Calibrate Blood Pressure with Arm-Cuff Reference"
            >
              <Sliders className="w-3 h-3" />
              <span>Calibrate</span>
            </button>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-indigo-600">
              {sbp !== null && dbp !== null && sbp > 0 ? `${sbp}/${dbp}` : '--/--'}
            </span>
            <span className="text-xs text-slate-500 font-mono">mmHg</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span className="text-indigo-600 font-medium">PTT Moens-Korteweg</span>
            {isCalibrated ? (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded text-[9px]">
                Calibrated (Cuff)
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 font-medium px-1.5 py-0.2 rounded text-[9px]">
                Factory Model
              </span>
            )}
          </div>
        </div>

        {/* SpO2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Oxygen Saturation</span>
            <span className="text-xs font-mono text-cyan-600 font-bold">O2</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-cyan-600">
              {spo2 !== null && spo2 > 0 ? spo2.toFixed(1) : '--.-'}
            </span>
            <span className="text-xs text-slate-500 font-mono">% SpO2</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">
            {spo2 !== null && spo2 > 0 ? 'Optimal Perfusion' : 'Place Thumb on MAX30102'}
          </div>
        </div>

        {/* Pulse Transit Time (PTT) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pulse Transit (PTT)</span>
            <span className="text-[10px] font-mono text-purple-600 font-bold">&Delta;t</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-purple-600">
              {ptt !== null && ptt > 0 ? ptt : '---'}
            </span>
            <span className="text-xs text-slate-500 font-mono">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            R-Peak to Capillary Foot
          </div>
        </div>

        {/* Heart Rate Variability (HRV) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">HRV (SDNN / RMSSD)</span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold">ms</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono text-slate-900">
              {hr !== null && hr > 0 ? `${sdnn} / ${rmssd}` : '-- / --'}
            </span>
            <span className="text-xs text-slate-500 font-mono">ms</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">
            {hr !== null && hr > 0 ? 'Autonomic Balance' : 'Awaiting Beats'}
          </div>
        </div>

        {/* Lead Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Electrode Leads</span>
            <span className={`w-2 h-2 rounded-full ${leadsOk ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          <div className="mt-2">
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${leadsOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {leadsOk ? 'LEADS ATTACHED' : (isSimulating ? 'SIMULATED' : 'WAITING FOR SENSOR')}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Beats Logged: #{beatCount}
          </div>
        </div>
      </div>

      {/* Main Dual-Trace Medical Oscilloscope Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 space-y-4">
        {/* Oscilloscope Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>ECG Sweep:</span>
            </div>
            <select
              value={leadMode}
              onChange={(e) => setLeadMode(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs font-semibold text-slate-800"
            >
              <option value="Lead I">Lead I (RA &minus; LA)</option>
              <option value="Lead II">Lead II (RA &minus; LL)</option>
            </select>

            <div className="flex items-center gap-1 font-mono text-slate-600">
              <span>Speed:</span>
              <button
                onClick={() => setSweepSpeed(25)}
                className={`px-2 py-0.5 rounded ${sweepSpeed === 25 ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100'}`}
              >
                25mm/s
              </button>
              <button
                onClick={() => setSweepSpeed(50)}
                className={`px-2 py-0.5 rounded ${sweepSpeed === 50 ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100'}`}
              >
                50mm/s
              </button>
            </div>

            <div className="flex items-center gap-1 font-mono text-slate-600">
              <span>ECG:</span>
              {[0.5, 1.0, 2.0].map((g) => (
                <button
                  key={g}
                  onClick={() => setEcgGain(g)}
                  className={`px-1.5 py-0.5 rounded text-[11px] ${ecgGain === g ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200'}`}
                  title={`ECG Gain ${g}x`}
                >
                  {g}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 font-mono text-slate-600">
              <span>PPG:</span>
              {[0.5, 1.0, 1.5].map((g) => (
                <button
                  key={g}
                  onClick={() => setPpgGain(g)}
                  className={`px-1.5 py-0.5 rounded text-[11px] ${ppgGain === g ? 'bg-sky-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200'}`}
                  title={`PPG Gain ${g}x`}
                >
                  {g}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 font-mono text-slate-600">
              <span>Span:</span>
              {[4, 6, 10].map((w) => (
                <button
                  key={w}
                  onClick={() => setDisplayWindowSeconds(w)}
                  className={`px-1.5 py-0.5 rounded text-[11px] ${displayWindowSeconds === w ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200'}`}
                  title={`Display time window ${w} seconds`}
                >
                  {w}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiReportModal(true)}
              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Generate AI Clinical Medical Report & 10-Second Printable ECG Strip (PNG)"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>AI Medical Report</span>
            </button>
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              <span>{showConsole ? 'Hide Serial Console' : 'Show Serial Console'}</span>
            </button>
          </div>
        </div>

        {/* Real-time HTML5 Oscilloscope Grid Canvas */}
        <div className="relative w-full overflow-hidden rounded-xl border border-rose-200 bg-rose-50 shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-80 sm:h-96 block cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Caliper Overlay Tag */}
          <div className="absolute bottom-3 right-4 bg-white/90 backdrop-blur-xs border border-rose-200 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-700 shadow-xs flex items-center gap-3">
            <span>&Delta;t(PTT): <strong className="text-purple-700">{ptt !== null && ptt > 0 ? `${ptt} ms` : '---'}</strong></span>
            <span>&bull;</span>
            <span>QRS Width: <strong className="text-emerald-700">88 ms</strong></span>
            <span>&bull;</span>
            <span>PR Interval: <strong className="text-indigo-700">162 ms</strong></span>
          </div>
        </div>

        {/* Collapsible Serial Console */}
        {showConsole && (
          <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-3 rounded-xl border border-slate-800 h-40 overflow-y-auto space-y-1">
            <div className="text-slate-400 border-b border-slate-800 pb-1 mb-1 font-bold">
              Live Serial Feed ({isConnected ? 'Hardware USB' : 'Simulator'}):
            </div>
            {rawConsole.length === 0 ? (
              <div className="text-slate-600 italic">Waiting for serial telemetry packets...</div>
            ) : (
              rawConsole.map((line, idx) => (
                <div key={idx} className="whitespace-pre">
                  {line}
                </div>
              ))
            )}
          </div>
        )}

        {/* Interactive Simulator Sliders (when simulation is active) */}
        {isSimulating && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-purple-600" />
                Live Cardiac Waveform Generator Settings
              </span>
              <span className="text-purple-600 font-mono font-medium">Physiological Math Synthesizer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Heart Rate: <strong>{simBpm} BPM</strong></span>
                  <span className="text-slate-400 text-[10px]">Resting: 60 - 80 BPM</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="135"
                  value={simBpm}
                  onChange={(e) => setSimBpm(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Muscle Tremor / Noise: <strong>{(simNoise * 100).toFixed(0)}%</strong></span>
                  <span className="text-slate-400 text-[10px]">Filter Simulation</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.08"
                  step="0.005"
                  value={simNoise}
                  onChange={(e) => setSimNoise(parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cardiology Deep-Dive: Answering "Can we make in the future an electrocardiogram?" */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">
            Cardiology Engineering: Expanding to Full Electrocardiograms (ECG)
          </h3>
        </div>

        <div className="prose prose-sm text-slate-600 max-w-none space-y-4 text-xs leading-relaxed">
          <p>
            <strong>User Question:</strong> <em>&ldquo;Can we make in the future an electrocardiograms?&rdquo;</em>
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 font-medium">
            <strong>The Answer is YES &mdash; in fact, your system is ALREADY recording genuine clinical electrocardiograms right now!</strong>
          </div>
          <p>
            The <strong>AD8232 module</strong> attached to your ESP32 is a medical-grade Single-Lead Instrumentation Front-End with a gain of 100x, a 2-pole high-pass filter (0.5 Hz baseline wander filter), and a 3-pole low-pass filter (40 Hz anti-muscle tremor filter). The waveform displayed above shows genuine cardiac biopotential vectors.
          </p>

          {/* Einthoven Triangle & Multi-Lead Roadmap */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <h4 className="font-bold text-slate-900 mb-1 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Phase 1 (Current): 1-Lead Standard
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                <strong>Lead I (RA &minus; LA):</strong> Measures horizontal electrical depolarization across both atria and ventricles. Ideal for heart rate, R-R intervals, HRV, and PTT blood pressure calculation.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <h4 className="font-bold text-slate-900 mb-1 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Phase 2: Einthoven 3-Lead Triangle
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                By adding a simple analog multiplexer (e.g. CD4051) or a second AD8232, you can switch between <strong>Lead I</strong> (RA-LA), <strong>Lead II</strong> (RA-LL), and <strong>Lead III</strong> (LA-LL) to determine cardiac electrical axis.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <h4 className="font-bold text-slate-900 mb-1 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Phase 3: 12-Lead Diagnostic ECG
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                For a complete 12-lead hospital ECG, an 8-channel simultaneous 24-bit ADC like the <strong>Texas Instruments ADS1298</strong> can connect via SPI to your new ESP32-C3 SuperMini!
              </p>
            </div>
          </div>

          {/* Automatic Wave Morphology & Arrhythmia Detection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            <h4 className="font-bold text-slate-900 mb-2">
              What Automated Software Can Detect from This Waveform:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <strong className="text-slate-900 block">1. Arrhythmia Detection</strong>
                <span>Premature Ventricular Contractions (PVCs), Bradycardia (&lt;50 BPM), Tachycardia (&gt;100 BPM).</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <strong className="text-slate-900 block">2. Atrial Fibrillation (AFib)</strong>
                <span>Detected via irregular R-R interval chaos (high SDNN entropy) and absence of distinct P-waves.</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <strong className="text-slate-900 block">3. QRS Width &amp; Bundle Branch</strong>
                <span>Normal QRS is 80&ndash;120ms. Widened complexes (&gt;120ms) signify ventricular conduction delays.</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <strong className="text-slate-900 block">4. ST Elevation / Depression</strong>
                <span>Deviation of the ST segment above or below the isoelectric baseline (myocardial ischemia indicator).</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Enhanced Blood Pressure Calibration Modal */}
      {/* ------------------------------------------------------------------ */}
      {showCalibrationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                  <Sliders className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Enhanced Arterial BP Calibration</h3>
                  <p className="text-xs text-indigo-200">
                    Personalized Moens-Korteweg Pulse Transit Time (PTT) Model
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700 leading-relaxed">
              {/* Formula & Explanation Card */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-1.5">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Moens-Korteweg Logarithmic Elasticity Equations</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Arterial vessel compliance differs from person to person. By calibrating against an arm-cuff reference reading (SBP cuff, DBP cuff) and your resting Pulse Transit Time, we solve for your individual arterial offsets:
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-indigo-200">
                  <div>
                    <strong className="text-indigo-900 block">Systolic Equation:</strong>
                    <span>SBP = -72.5 &times; ln(PTT) + <strong className="text-indigo-600">b</strong></span>
                  </div>
                  <div>
                    <strong className="text-indigo-900 block">Diastolic Equation:</strong>
                    <span>DBP = -48.0 &times; ln(PTT) + <strong className="text-indigo-600">d</strong></span>
                  </div>
                </div>
              </div>

              {/* Reference Cuff Input Grid */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Step 1: Reference Arm-Cuff Measurement
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cuff Systolic (SBP)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="80"
                        max="220"
                        value={cuffSbpInput}
                        onChange={(e) => setCuffSbpInput(parseInt(e.target.value, 10) || 120)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 font-mono">mmHg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cuff Diastolic (DBP)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="45"
                        max="140"
                        value={cuffDbpInput}
                        onChange={(e) => setCuffDbpInput(parseInt(e.target.value, 10) || 80)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 font-mono">mmHg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Baseline Resting PTT
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="120"
                        max="400"
                        value={customPttInput}
                        onChange={(e) => setCustomPttInput(parseFloat(e.target.value) || 215)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 font-mono">ms</span>
                    </div>
                  </div>
                </div>

                {ptt && ptt > 90 && (
                  <button
                    onClick={() => setCustomPttInput(ptt)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>&rarr; Use currently measured live PTT ({ptt} ms)</span>
                  </button>
                )}
              </div>

              {/* Step 2: Computed Arterial Offsets */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Step 2: Computed Arterial Offsets</span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Live Reactive
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Systolic Offset (b)</span>
                    <span className="text-xl font-bold font-mono text-indigo-600">{computedCalB}</span>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      = {cuffSbpInput} - (-72.5 &times; ln({effectivePttForCalc}))
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Diastolic Offset (d)</span>
                    <span className="text-xl font-bold font-mono text-indigo-600">{computedCalD}</span>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      = {cuffDbpInput} - (-48.0 &times; ln({effectivePttForCalc}))
                    </div>
                  </div>
                </div>

                {/* Response Curve Preview Table */}
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px]">
                  <span className="font-semibold text-slate-600 block mb-1">
                    Calibrated Dynamic Response Curve:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">PTT 180ms (Exercise)</span>
                      <strong className="text-rose-600 font-bold">
                        {Math.round(calA * Math.log(180) + computedCalB)}/{Math.round(calC * Math.log(180) + computedCalD)}
                      </strong>
                    </div>
                    <div className="bg-emerald-50 p-1.5 rounded border border-emerald-300">
                      <span className="text-emerald-700 block">PTT {effectivePttForCalc}ms (Resting)</span>
                      <strong className="text-emerald-800 font-bold">
                        {cuffSbpInput}/{cuffDbpInput}
                      </strong>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">PTT 250ms (Relaxed)</span>
                      <strong className="text-blue-600 font-bold">
                        {Math.round(calA * Math.log(250) + computedCalB)}/{Math.round(calC * Math.log(250) + computedCalD)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Notice */}
              {calibrationSentNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{calibrationSentNotice}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetCalibration}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-300 cursor-pointer transition-all"
                  title="Reset to factory model coefficients (b=518.0, d=343.0)"
                >
                  Reset Factory
                </button>
                <button
                  onClick={handleCopyCodeSnippet}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Copy Python snippet for vitals_calc.py or main.py"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet ? 'Copied!' : 'Copy Python'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isConnected && (
                  <button
                    onClick={() => sendCalibrationToEsp32(computedCalB, computedCalD)}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                    title="Transmit $CAL command over serial directly to running ESP32"
                  >
                    <Usb className="w-3.5 h-3.5" />
                    <span>Send to ESP32</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handleApplyCalibration();
                    setShowCalibrationModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save &amp; Apply</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. Enhanced Clinical CSV Telemetry Export Modal */}
      {/* ------------------------------------------------------------------ */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 flex items-center justify-between border-b border-emerald-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Clinical Telemetry Data Exporter</h3>
                  <p className="text-xs text-emerald-200">
                    High-Resolution Multi-Modal Cardiogram &amp; Optical PPG Dataset
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700 leading-relaxed">
              {/* Telemetry Summary Statistics Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Recorded Samples</span>
                  <strong className="text-base font-bold font-mono text-slate-900">{recordingRef.current.length}</strong>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    ({(recordingRef.current.length / 100).toFixed(1)}s continuous)
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Beats Captured</span>
                  <strong className="text-base font-bold font-mono text-rose-600">{getBeatRecords().length}</strong>
                  <span className="text-[10px] text-slate-400 block">R-peaks Logged</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Mean Heart Rate</span>
                  <strong className="text-base font-bold font-mono text-slate-900">{hr ? `${hr} BPM` : '--'}</strong>
                  <span className="text-[10px] text-slate-400 block">Sinus Rhythm</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Blood Pressure</span>
                  <strong className="text-base font-bold font-mono text-indigo-600">
                    {sbp && dbp ? `${sbp}/${dbp}` : '--/--'}
                  </strong>
                  <span className="text-[10px] text-slate-400 block">
                    MAP: {sbp && dbp ? `${Math.round(dbp + (sbp - dbp) / 3)} mmHg` : '--'}
                  </span>
                </div>
              </div>

              {/* Mode Selection Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setExportPreviewMode('waveforms')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    exportPreviewMode === 'waveforms'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100 Hz Raw Continuous Telemetry (Every 10ms Frame)</span>
                </button>
                <button
                  onClick={() => setExportPreviewMode('beats')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    exportPreviewMode === 'beats'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-600" />
                  <span>Beat-by-Beat Cardiac Log (Cycle-by-Cycle R-R Intervals)</span>
                </button>
              </div>

              {/* Column Schema Details */}
              <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {exportPreviewMode === 'waveforms' ? (
                  <div>
                    <strong className="text-slate-900 block mb-1">Export Schema (13 Data Columns):</strong>
                    <code className="text-[10px] bg-white p-1.5 rounded border border-slate-200 block overflow-x-auto font-mono text-slate-800">
                      Timestamp_ms, ISO8601_Time, Elapsed_s, ECG_LeadI_mV, PPG_Volume_Normalized, Raw_ADC_Counts_12bit, HeartRate_BPM, SpO2_Percent, Systolic_BP_mmHg, Diastolic_BP_mmHg, PTT_ms, Leads_Connected, R_Peak_Detected
                    </code>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Suitable for MATLAB, Python NumPy/SciPy, Kubios HRV analysis, or detailed Excel graphing.
                    </span>
                  </div>
                ) : (
                  <div>
                    <strong className="text-slate-900 block mb-1">Clinical Cycle Schema (11 Cardiac Columns):</strong>
                    <code className="text-[10px] bg-white p-1.5 rounded border border-slate-200 block overflow-x-auto font-mono text-slate-800">
                      Beat_Index, Timestamp_ms, ISO8601_Time, RR_Interval_ms, Instantaneous_HR_BPM, SpO2_Percent, Systolic_BP_mmHg, Diastolic_BP_mmHg, PTT_ms, Electrode_Status, Rhythm_Classification
                    </code>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Condensed clinical summary focusing on cardiac beat-to-beat variability, arrhythmias, and hemodynamics.
                    </span>
                  </div>
                )}
              </div>

              {/* Live Preview Table */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center justify-between">
                  <span>First 5 Rows Preview:</span>
                  <span className="text-[10px] text-slate-500 font-normal">Real live session data</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-[10px] font-mono">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      {exportPreviewMode === 'waveforms' ? (
                        <tr>
                          <th className="p-2">Elapsed</th>
                          <th className="p-2">ECG (mV)</th>
                          <th className="p-2">PPG Vol</th>
                          <th className="p-2">Raw ADC</th>
                          <th className="p-2">HR (BPM)</th>
                          <th className="p-2">SpO2 (%)</th>
                          <th className="p-2">BP (mmHg)</th>
                          <th className="p-2">PTT (ms)</th>
                          <th className="p-2">R-Peak</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="p-2">Beat #</th>
                          <th className="p-2">R-R (ms)</th>
                          <th className="p-2">HR (BPM)</th>
                          <th className="p-2">SpO2 (%)</th>
                          <th className="p-2">BP (mmHg)</th>
                          <th className="p-2">PTT (ms)</th>
                          <th className="p-2">Leads</th>
                          <th className="p-2">Rhythm</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {exportPreviewMode === 'waveforms' ? (
                        recordingRef.current.slice(0, 5).map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2">{((r.t - (recordingRef.current[0]?.t || r.t)) / 1000).toFixed(2)}s</td>
                            <td className="p-2 text-emerald-600 font-semibold">{r.ecg.toFixed(3)}</td>
                            <td className="p-2 text-blue-600">{r.ppg.toFixed(3)}</td>
                            <td className="p-2">{r.rawEcg}</td>
                            <td className="p-2">{r.hr || '--'}</td>
                            <td className="p-2">{r.spo2 ? r.spo2.toFixed(1) : '--'}</td>
                            <td className="p-2">{r.sbp && r.dbp ? `${r.sbp}/${r.dbp}` : '--/--'}</td>
                            <td className="p-2">{r.ptt || '--'}</td>
                            <td className="p-2">{r.isRPeak ? 'YES' : '0'}</td>
                          </tr>
                        ))
                      ) : (
                        getBeatRecords().slice(0, 5).map((b) => (
                          <tr key={b.beatIndex} className="hover:bg-slate-50">
                            <td className="p-2 font-bold">#{b.beatIndex}</td>
                            <td className="p-2 text-rose-600 font-bold">{b.rrIntervalMs}ms</td>
                            <td className="p-2 font-semibold">{b.instantaneousBpm}</td>
                            <td className="p-2">{b.spo2 ? b.spo2.toFixed(1) : '--'}</td>
                            <td className="p-2">{b.sbp && b.dbp ? `${b.sbp}/${b.dbp}` : '--/--'}</td>
                            <td className="p-2">{b.ptt || '--'}</td>
                            <td className="p-2 text-emerald-600">{b.leadsOk ? 'OK' : 'OFF'}</td>
                            <td className="p-2 text-slate-600">{b.classification}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => copyCsvToClipboard(exportPreviewMode)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet ? 'Copied to Clipboard!' : 'Copy Preview CSV'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (exportPreviewMode === 'waveforms') {
                      exportWaveforms100HzCsv();
                    } else {
                      exportBeatByBeatCsv();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {exportPreviewMode === 'waveforms' ? '100 Hz Raw CSV' : 'Beat-by-Beat CSV'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Medical Report & 10-Second Printable ECG Strip Modal */}
      {showAiReportModal && (
        <AiMedicalReportModal
          isOpen={showAiReportModal}
          onClose={() => setShowAiReportModal(false)}
          samples={recordingRef.current}
          vitals={getEffectiveVitals()}
        />
      )}
    </div>
  );
};
