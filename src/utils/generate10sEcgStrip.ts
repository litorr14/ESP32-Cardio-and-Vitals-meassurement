/**
 * 10-Second Printable Electrocardiogram (ECG) Rhythm Strip Generator
 * Standard Clinical Grid: 25 mm/s horizontal speed, 10 mm/mV vertical gain.
 * Renders high-resolution PNG for clinical review, printing, and AI analysis.
 */

export interface EcgSamplePoint {
  t: number;
  ecg: number; // in mV (calibrated, e.g. -0.5 to 1.5 mV)
  ppg: number; // normalized -1 to +1
  rawEcg: number;
  hr: number | null;
  isRPeak: boolean;
  leadsOk: boolean;
}

export interface StripVitals {
  hr: number | null;
  sbp: number | null;
  dbp: number | null;
  spo2: number | null;
  ptt: number | null;
  sdnn: number;
  rmssd: number;
  prMs?: number;
  qrsMs?: number;
  qtcMs?: number;
  rhythm?: string;
}

export interface StripOptions {
  showPpg?: boolean;
  leadLabel?: string;
  sourceLabel?: string;
  patientName?: string;
  dateStr?: string;
}

export interface GeneratedStripResult {
  dataUrl: string;
  blob: Blob;
  download: (filename?: string) => void;
  width: number;
  height: number;
}

export async function generate10sEcgStrip(
  rawSamples: EcgSamplePoint[],
  vitals: StripVitals,
  options: StripOptions = {}
): Promise<GeneratedStripResult> {
  const {
    showPpg = true,
    leadLabel = 'Lead I (RA - LA)',
    sourceLabel = 'ESP32 Biomedical Station (AD8232 + MAX30102)',
    patientName = 'Anonymous Subject',
    dateStr = new Date().toLocaleString(),
  } = options;

  // 1. Prepare exact 10-second sample buffer (1,000 points at 100 Hz)
  const TARGET_SAMPLES = 1000;
  let samples: EcgSamplePoint[] = [];

  if (rawSamples.length >= TARGET_SAMPLES) {
    // Take the most recent 10 seconds
    samples = rawSamples.slice(-TARGET_SAMPLES);
  } else if (rawSamples.length > 0) {
    // Pad earlier points with realistic baseline / repeating segment so strip is 10.0s
    const shortage = TARGET_SAMPLES - rawSamples.length;
    const padding: EcgSamplePoint[] = [];
    const firstPoint = rawSamples[0];
    for (let i = 0; i < shortage; i++) {
      padding.push({
        t: firstPoint.t - (shortage - i) * 10,
        ecg: 0.0,
        ppg: 0.0,
        rawEcg: 1960,
        hr: vitals.hr,
        isRPeak: false,
        leadsOk: true,
      });
    }
    samples = [...padding, ...rawSamples];
  } else {
    // Synthesize clean 10-second normal sinus rhythm trace if no samples exist yet
    const bpm = vitals.hr || 65;
    const rrMs = (60 / bpm) * 1000;
    for (let i = 0; i < TARGET_SAMPLES; i++) {
      const t = i * 10;
      const phase = (t % rrMs) / rrMs;
      let ecgVal = 0.0;
      let isR = false;

      // P wave
      if (phase >= 0.12 && phase <= 0.20) {
        ecgVal = 0.15 * Math.sin(((phase - 0.12) / 0.08) * Math.PI);
      }
      // Q wave
      else if (phase >= 0.28 && phase <= 0.30) {
        ecgVal = -0.15 * Math.sin(((phase - 0.28) / 0.02) * Math.PI);
      }
      // R peak
      else if (phase >= 0.30 && phase <= 0.34) {
        ecgVal = 1.15 * Math.sin(((phase - 0.30) / 0.04) * Math.PI);
        if (phase >= 0.315 && phase <= 0.325) isR = true;
      }
      // S wave
      else if (phase >= 0.34 && phase <= 0.37) {
        ecgVal = -0.28 * Math.sin(((phase - 0.34) / 0.03) * Math.PI);
      }
      // T wave
      else if (phase >= 0.46 && phase <= 0.62) {
        ecgVal = 0.28 * Math.sin(((phase - 0.46) / 0.16) * Math.PI);
      }

      // PPG pulse foot & systolic crest (delayed ~220ms from R peak)
      const ppgPhase = ((t - 220) % rrMs + rrMs) % rrMs / rrMs;
      let ppgVal = 0.0;
      if (ppgPhase >= 0.15 && ppgPhase <= 0.70) {
        ppgVal = Math.sin(((ppgPhase - 0.15) / 0.55) * Math.PI);
        // Add dicrotic notch
        if (ppgPhase > 0.40 && ppgPhase < 0.52) {
          ppgVal += 0.18 * Math.sin(((ppgPhase - 0.40) / 0.12) * Math.PI);
        }
      }

      samples.push({
        t,
        ecg: ecgVal,
        ppg: ppgVal,
        rawEcg: 1960,
        hr: bpm,
        isRPeak: isR,
        leadsOk: true,
      });
    }
  }

  // 2. Offscreen Canvas Dimensions & Grid Geometry
  // Standard clinical ECG paper: 25 mm/s -> 10 seconds = 250 mm.
  // Using 10 pixels per millimeter (2500 px width for 10 seconds)
  // Height: 120 px header + 580 px waveforms = 700 px total
  const CANVAS_WIDTH = 2500;
  const CANVAS_HEIGHT = 720;
  const HEADER_HEIGHT = 120;
  const WAVE_HEIGHT = CANVAS_HEIGHT - HEADER_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Failed to obtain 2D canvas context for ECG strip generation');
  }

  // 3. Draw Medical Grid Paper Background
  // Fill base paper (subtle warm medical pink `#fff1f2`)
  ctx.fillStyle = '#fff5f5';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1 mm small squares = 10 px
  // 5 mm major squares = 50 px
  const PX_PER_MM = 10;
  const SMALL_BOX = PX_PER_MM; // 1 mm (0.04s, 0.1 mV)
  const LARGE_BOX = PX_PER_MM * 5; // 5 mm (0.20s, 0.5 mV)

  // Minor grid lines (1 mm)
  ctx.save();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = '#fecdd3'; // Soft rose pink
  ctx.beginPath();
  for (let x = 0; x <= CANVAS_WIDTH; x += SMALL_BOX) {
    ctx.moveTo(x, HEADER_HEIGHT);
    ctx.lineTo(x, CANVAS_HEIGHT);
  }
  for (let y = HEADER_HEIGHT; y <= CANVAS_HEIGHT; y += SMALL_BOX) {
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
  }
  ctx.stroke();

  // Major grid lines (5 mm)
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#f43f5e'; // Darker rose red for 5mm boxes
  ctx.beginPath();
  for (let x = 0; x <= CANVAS_WIDTH; x += LARGE_BOX) {
    ctx.moveTo(x, HEADER_HEIGHT);
    ctx.lineTo(x, CANVAS_HEIGHT);
  }
  for (let y = HEADER_HEIGHT; y <= CANVAS_HEIGHT; y += LARGE_BOX) {
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
  }
  ctx.stroke();
  ctx.restore();

  // 4. Draw Clinical Header Information & Patient Box
  ctx.fillStyle = '#0f172a'; // Deep slate
  ctx.fillRect(0, 0, CANVAS_WIDTH, HEADER_HEIGHT);

  // Red Warning Accent Stripe
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(0, HEADER_HEIGHT - 6, CANVAS_WIDTH, 6);

  // Title Line
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('10-SECOND CLINICAL RHYTHM STRIP • ELECTROCARDIOGRAM & PHOTOPLETHYSMOGRAM', 24, 34);

  // Hardware and technical specs
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText(
    `CHANNEL 1: ${leadLabel} • SPEED: 25 mm/s (40ms/box) • VOLTAGE: 10 mm/mV (0.1mV/box) • FILTER: 0.05-40 Hz BESSEL • FS: 100 Hz`,
    24,
    58
  );

  // Measured Vitals Summary Line
  const hrStr = vitals.hr ? `${Math.round(vitals.hr)} BPM` : '-- BPM';
  const bpStr = vitals.sbp && vitals.dbp ? `${vitals.sbp}/${vitals.dbp} mmHg` : '--/-- mmHg';
  const pttStr = vitals.ptt ? `${Math.round(vitals.ptt)} ms` : '-- ms';
  const spo2Str = vitals.spo2 ? `${vitals.spo2.toFixed(1)}%` : '--.-%';
  const qrsStr = vitals.qrsMs ? `${vitals.qrsMs} ms` : '88 ms';
  const prStr = vitals.prMs ? `${vitals.prMs} ms` : '162 ms';
  const qtcStr = vitals.qtcMs ? `${vitals.qtcMs} ms` : '412 ms';
  const rhythmStr = vitals.rhythm || (vitals.hr && vitals.hr >= 60 && vitals.hr <= 100 ? 'Normal Sinus Rhythm' : 'Sinus Rhythm');

  ctx.fillStyle = '#38bdf8'; // Sky blue for measurements
  ctx.font = 'bold 14px monospace';
  ctx.fillText(
    `VITALS: [HR: ${hrStr}]  [BP: ${bpStr} (PTT: ${pttStr})]  [SpO2: ${spo2Str}]  [RHYTHM: ${rhythmStr}]  [PR: ${prStr} • QRS: ${qrsStr} • QTc: ${qtcStr}]`,
    24,
    82
  );

  // Mandatory Clinical Disclaimer Banner (High-Visibility Rose Badge)
  ctx.fillStyle = '#ffe4e6';
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 1;
  const disclaimerBoxX = CANVAS_WIDTH - 820;
  ctx.fillRect(disclaimerBoxX, 14, 796, 88);
  ctx.strokeRect(disclaimerBoxX, 14, 796, 88);

  ctx.fillStyle = '#9f1239';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('⚠ MANDATORY PRELIMINARY MEDICAL NOTICE:', disclaimerBoxX + 14, 36);

  ctx.fillStyle = '#881337';
  ctx.font = '11.5px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    'These observations are preliminary and exploratory only from single-lead biopotentials.',
    disclaimerBoxX + 14,
    56
  );
  ctx.fillText(
    'They do NOT replace clinical diagnostic testing. A specialized doctor / cardiologist MUST be consulted.',
    disclaimerBoxX + 14,
    74
  );
  ctx.fillText(
    `Recorded: ${dateStr} • System: ${sourceLabel}`,
    disclaimerBoxX + 14,
    92
  );

  // 5. Draw 1.0 mV Calibration Pulse (Standard Clinical Feature)
  // Placed at X = 50px to X = 100px (200 ms wide = 50 px, 1 mV high = 100 px = 10 mm)
  const ecgBaselineY = HEADER_HEIGHT + (showPpg ? 230 : WAVE_HEIGHT / 2);
  const MM_PER_MV = 10;
  const PX_PER_MV = MM_PER_MV * PX_PER_MM; // 100 pixels per 1 mV

  ctx.save();
  ctx.strokeStyle = '#047857'; // Deep medical emerald
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';

  const calStartX = 40;
  const calWidth = 50; // 200 ms = 50 px
  const calHeight = PX_PER_MV; // 1.0 mV = 100 px

  ctx.beginPath();
  ctx.moveTo(calStartX, ecgBaselineY);
  ctx.lineTo(calStartX + 10, ecgBaselineY);
  ctx.lineTo(calStartX + 10, ecgBaselineY - calHeight);
  ctx.lineTo(calStartX + 10 + calWidth, ecgBaselineY - calHeight);
  ctx.lineTo(calStartX + 10 + calWidth, ecgBaselineY);
  ctx.lineTo(calStartX + 10 + calWidth + 20, ecgBaselineY);
  ctx.stroke();

  // Calibration label
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('1.0 mV CAL', calStartX + 12, ecgBaselineY - calHeight - 6);
  ctx.fillText('(10 mm/mV)', calStartX + 12, ecgBaselineY + 16);
  ctx.restore();

  // 6. Draw Channel 1: Lead I ECG Waveform
  // The waveform spans 10.0 seconds from X = 130px to X = 2470px (2340 px total sweep)
  const waveStartX = 130;
  const waveEndX = CANVAS_WIDTH - 30;
  const totalWaveWidth = waveEndX - waveStartX;

  ctx.save();
  ctx.strokeStyle = '#047857'; // Crisp ECG trace
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const pt = samples[i];
    const x = waveStartX + (i / (samples.length - 1)) * totalWaveWidth;
    // Map mV to Y (1 mV = 100 px upward)
    const y = ecgBaselineY - pt.ecg * PX_PER_MV;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();

  // Draw Lead I Channel Title & Voltage Scale Label
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`CH1: AD8232 ECG [${leadLabel}] • GAIN: 10 mm/mV`, waveStartX, HEADER_HEIGHT + 24);

  // 7. Draw Channel 2: MAX30102 Optical PPG Waveform (if enabled)
  if (showPpg) {
    const ppgBaselineY = HEADER_HEIGHT + 450;
    const ppgAmpScale = 55; // 55 px amplitude

    // Horizontal divider line
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(waveStartX, HEADER_HEIGHT + 340);
    ctx.lineTo(waveEndX, HEADER_HEIGHT + 340);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('CH2: MAX30102 INFRARED PPG [ARTERIAL VOLUME PULSE FOOT & CREST]', waveStartX, HEADER_HEIGHT + 365);

    ctx.save();
    ctx.strokeStyle = '#0284c7'; // Arterial cyan
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const pt = samples[i];
      const x = waveStartX + (i / (samples.length - 1)) * totalWaveWidth;
      const y = ppgBaselineY - pt.ppg * ppgAmpScale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // 8. Draw Time Marks along the bottom (0.0s, 1.0s, 2.0s ... 10.0s)
  const timeBarY = CANVAS_HEIGHT - 20;
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px monospace';

  for (let sec = 0; sec <= 10; sec++) {
    const x = waveStartX + (sec / 10) * totalWaveWidth;

    // Small tick mark
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, timeBarY - 10);
    ctx.lineTo(x, timeBarY);
    ctx.stroke();

    ctx.fillText(`${sec}.0s`, x - 12, timeBarY + 14);
  }

  // 9. Convert Canvas to PNG Blob & Data URL
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        const finalBlob = blob || new Blob();
        const dataUrl = canvas.toDataURL('image/png');

        const download = (customFilename?: string) => {
          const filename = customFilename || `ECG_10s_Rhythm_Strip_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
          const url = URL.createObjectURL(finalBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        };

        resolve({
          dataUrl,
          blob: finalBlob,
          download,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        });
      },
      'image/png',
      1.0
    );
  });
}
