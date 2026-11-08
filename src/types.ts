export interface FeasibilityMetric {
  id: 'hr' | 'spo2' | 'bp';
  name: string;
  verdict: 'possible' | 'unreliable' | 'impossible';
  summary: string;
  scientificReason: string;
  esp32CamLimitation: string;
  recommendedSolution: string;
  requiredSensors: string[];
  complexity: 'Low' | 'Medium' | 'High' | 'Extreme';
  clinicalViability: string;
}

export interface WavelengthPoint {
  wavelength: number; // nm
  hb: number; // extinction coefficient deoxygenated
  hbo2: number; // extinction coefficient oxygenated
  whiteLedEmission: number; // normalized emission of typical white flash LED
}

export interface SensorOption {
  id: string;
  name: string;
  cost: string;
  interfaceType: string;
  sampleRate: string;
  accuracy: string;
  pros: string[];
  cons: string[];
  supportedVitals: string[];
}

export interface PinDefinition {
  pin: string;
  esp32Gpio: number;
  camFunction: string;
  conflictStatus: 'safe' | 'conflict' | 'input_only' | 'flash_led';
  note: string;
}
