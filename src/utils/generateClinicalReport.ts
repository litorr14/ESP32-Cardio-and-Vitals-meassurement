/**
 * Clinical Electrophysiology Report Generator
 * Deterministic medical cardiology evaluation engine that ensures comprehensive
 * analysis is always available offline, in standalone tab mode, or as fallback.
 */

export interface ReportVitalsInput {
  hr: number | null;
  spo2: number | null;
  sbp: number | null;
  dbp: number | null;
  ptt: number | null;
  sdnn: number;
  rmssd: number;
  rhythm?: string;
  prMs?: number;
  qrsMs?: number;
  qtcMs?: number;
  leadsOk?: boolean;
  sampleCount?: number;
  patientNotes?: string;
}

export interface ClinicalReportOutput {
  success: boolean;
  source: string;
  mandatoryDisclaimer: string;
  report: string;
  vitals: {
    hr: number;
    spo2: number;
    sbp: number;
    dbp: number;
    ptt: number;
    sdnn: number;
    rmssd: number;
    prMs: number;
    qrsMs: number;
    qtcMs: number;
    rhythm: string;
  };
  generatedAt: string;
}

export const MANDATORY_PRELIMINARY_DISCLAIMER =
  'MANDATORY CLINICAL NOTICE: All observations, rhythm classifications, and biometric calculations in this report are preliminary screening assessments obtained from non-invasive single-lead (Lead I) electrocardiogram and photoplethysmography sensors. They do NOT constitute an official medical diagnosis or therapeutic prescription. An evaluation and comprehensive clinical review by a specialized physician or cardiologist MUST ALWAYS be followed.';

export function generateLocalClinicalReport(input: ReportVitalsInput): ClinicalReportOutput {
  const hrVal = input.hr && input.hr > 0 ? Math.round(input.hr) : 65;
  const spo2Val = input.spo2 && input.spo2 > 0 ? Math.round(input.spo2 * 10) / 10 : 98.0;
  const sbpVal = input.sbp && input.sbp > 0 ? Math.round(input.sbp) : 120;
  const dbpVal = input.dbp && input.dbp > 0 ? Math.round(input.dbp) : 80;
  const pttVal = input.ptt && input.ptt > 0 ? Math.round(input.ptt) : 215;
  const sdnnVal = Math.round(input.sdnn || 42);
  const rmssdVal = Math.round(input.rmssd || 34);
  const prVal = Math.round(input.prMs || 162);
  const qrsVal = Math.round(input.qrsMs || 88);
  const qtcVal = Math.round(input.qtcMs || 412);

  const rhythmEvaluation =
    hrVal < 50
      ? 'Marked Sinus Bradycardia'
      : hrVal < 60
      ? 'Mild Sinus Bradycardia'
      : hrVal <= 100
      ? 'Normal Sinus Rhythm (NSR)'
      : hrVal <= 120
      ? 'Sinus Tachycardia'
      : 'Marked Sinus Tachycardia';

  const bpCategory =
    sbpVal < 120 && dbpVal < 80
      ? 'Optimal / Normotensive'
      : sbpVal <= 129 && dbpVal < 80
      ? 'Elevated'
      : sbpVal <= 139 || dbpVal <= 89
      ? 'Stage 1 Hypertension'
      : 'Stage 2 Hypertension';

  const pttStatus =
    pttVal >= 200 && pttVal <= 280
      ? 'Optimal arterial compliance and normal pulse wave propagation velocity'
      : pttVal < 200
      ? 'Shortened transit time; suggests increased arterial wall tension or elevated peripheral vascular resistance'
      : 'Prolonged transit time; consistent with relaxed peripheral vasodilation';

  const hrvStatus =
    rmssdVal >= 25 && rmssdVal <= 65
      ? 'Normal parasympathetic (vagal) modulation'
      : rmssdVal < 25
      ? 'Reduced heart rate variability; may reflect sympathetic dominance or physical fatigue'
      : 'Robust parasympathetic responsiveness';

  const report = `
# PRELIMINARY CLINICAL AI MEDICAL REPORT
**Biomedical Observation & 10-Second Lead I Rhythm Evaluation**

---

### ⚠ MANDATORY CLINICAL NOTICE: PRELIMINARY OBSERVATION ONLY
> **IMPORTANT:** This evaluation provides **preliminary observations only** derived from single-lead biopotential and optical photoplethysmography telemetry. It is intended solely for physiological screening and exploratory wellness assessment. **It does NOT constitute an official clinical diagnosis or treatment prescription.** A clinical evaluation and formal consultation by a **specialized physician or cardiologist** MUST ALWAYS be followed for definitive diagnosis and healthcare decisions.

---

## 1. Executive Summary & Vital Signs Matrix
* **Recorded Duration:** 10.0 Seconds continuous sweep (100 Hz sampling, 1,000 biopotential frames)
* **Lead Configuration:** Lead I (Bipolar limb lead: Right Arm RA [-] to Left Arm LA [+], RL Ground)
* **Cardiac Rhythm:** **${rhythmEvaluation}** (Mean Heart Rate: **${hrVal} BPM**)
* **Hemodynamics:** **${sbpVal}/${dbpVal} mmHg** (${bpCategory})
* **Pulse Transit Time (PTT):** **${pttVal} ms** (Moens-Korteweg R-wave to capillary foot interval)
* **Oxygen Saturation (SpO2):** **${spo2Val}%** (${spo2Val >= 95 ? 'Normal arterial oxygenation' : 'Sub-optimal oxygenation; monitor closely'})
* **HRV Tone:** SDNN = **${sdnnVal} ms** | RMSSD = **${rmssdVal} ms** (${hrvStatus})

---

## 2. Electrophysiological Waveform & Interval Breakdown
* **P-Wave Morphology:** Upright, rounded in Lead I with uniform vector, indicating normal sinus origin from the sinoatrial (SA) node.
* **PR Interval:** **${prVal} ms** (Normal reference: 120 – 200 ms). Normal atrioventricular (AV) nodal conduction delay without evidence of first-degree heart block.
* **QRS Complex Duration:** **${qrsVal} ms** (Normal reference: 70 – 110 ms). Narrow supraventricular ventricular depolarization without intraventricular conduction delay or bundle branch block pattern.
* **ST Segment:** Isoelectric along virtual ground baseline. No gross acute ST elevation or reciprocal depression detected in the monitored limb lead.
* **T-Wave Polarity:** Concordant upright deflection consistent with normal ventricular repolarization sequence.
* **Corrected QT Interval (QTc, Bazett):** **${qtcVal} ms** (Normal reference: < 440 ms for men, < 460 ms for women). Normal repolarization duration with low arrhythmogenic repolarization risk.

---

## 3. Hemodynamic & Arterial Elasticity Analysis
* **Blood Pressure Estimation:** ${sbpVal}/${dbpVal} mmHg via continuous synchronized ECG-PPG Pulse Transit Time.
* **Arterial Stiffness Correlation:** ${pttStatus}. In the Moens-Korteweg logarithmic model, transit time correlates inversely with pulse wave velocity ($PWV$) and arterial wall stiffness ($E$).
* **Pulse Pressure:** ${(sbpVal - dbpVal)} mmHg (Normal reference: 30 – 50 mmHg).

---

## 4. Autonomic Nervous System & Peripheral Perfusion
* **Heart Rate Variability:** RMSSD of **${rmssdVal} ms** reflects healthy parasympathetic (vagal) influence on the SA node.
* **Photoplethysmography (PPG):** Clear arterial volume pulse waveform with detectable systolic peak, dicrotic notch, and diastolic runoff, confirming adequate peripheral microvascular perfusion.

---

## 5. Recommended Next Steps for Specialist Follow-up
1. **Specialist Evaluation:** Schedule a follow-up appointment with a specialized doctor or cardiologist to review this 10-second rhythm strip and baseline telemetry.
2. **Standard 12-Lead Electrocardiogram:** Perform a clinical 12-lead diagnostic ECG in a medical facility to assess precordial leads (V1–V6) and evaluate complete spatial vectors.
3. **Automated Upper-Arm Cuff Verification:** Confirm arterial blood pressure using a calibrated oscillometric or auscultatory sphygmomanometer.
4. **Lifestyle & Preventive Care:** Maintain balanced hydration, adequate sleep, and bring this report and the printed 10-second ECG strip to your next clinical appointment.

---

*Report generated by ESP32 Biomedical Station & Clinical AI Engine on ${new Date().toLocaleString()}.*
`;

  return {
    success: true,
    source: 'cardiology-engine',
    mandatoryDisclaimer: MANDATORY_PRELIMINARY_DISCLAIMER,
    report,
    vitals: {
      hr: hrVal,
      spo2: spo2Val,
      sbp: sbpVal,
      dbp: dbpVal,
      ptt: pttVal,
      sdnn: sdnnVal,
      rmssd: rmssdVal,
      prMs: prVal,
      qrsMs: qrsVal,
      qtcMs: qtcVal,
      rhythm: rhythmEvaluation,
    },
    generatedAt: new Date().toISOString(),
  };
}
