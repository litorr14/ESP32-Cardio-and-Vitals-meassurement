# ==============================================================================
# Dual-Sensor PTT Blood Pressure Estimator for ESP32
# ==============================================================================
# Hardware:
# - AD8232 ECG Sensor -> ESP32 GPIO 33 (ADC1_CH5)
# - MAX30102 PPG Sensor -> I2C (SCL=GPIO 14, SDA=GPIO 13)
# ==============================================================================

import time
import math
from machine import Pin, ADC, SoftI2C

class VitalsAndBPAnalyzer:
    def __init__(self, ecg_adc_pin=33):
        # Configure ADC for AD8232 ECG
        self.ecg_adc = ADC(Pin(ecg_adc_pin))
        self.ecg_adc.atten(ADC.ATTN_11DB)  # Full range 0 - 3.3V
        self.ecg_adc.width(ADC.WIDTH_12BIT)
        
        # User Calibration Constants (calibrated against reference cuff)
        # SBP = a * ln(PTT_ms) + b
        # DBP = c * ln(PTT_ms) + d
        self.cal_a = -72.5
        self.cal_b = 520.0
        self.cal_c = -48.2
        self.cal_d = 345.0
        
        self.last_r_peak_time = None
        self.ptt_history = []

    def sample_ecg_r_peak(self, raw_ecg, timestamp):
        """Detects QRS complex R-peak (steep electrical spike)"""
        if raw_ecg > 2900:
            if self.last_r_peak_time is None or time.ticks_diff(timestamp, self.last_r_peak_time) > 400:
                self.last_r_peak_time = timestamp
                return True
        return False

    def on_ppg_systolic_arrival(self, timestamp):
        """Called when MAX30102 detects the arrival of the peripheral pulse wave"""
        if self.last_r_peak_time is not None:
            ptt_ms = time.ticks_diff(timestamp, self.last_r_peak_time)
            
            # Physiological PTT range between heart and finger is typically 180ms - 380ms
            if 160 < ptt_ms < 450:
                self.ptt_history.append(ptt_ms)
                if len(self.ptt_history) > 5:
                    self.ptt_history.pop(0)
                return self.calculate_blood_pressure()
        return None

    def calculate_blood_pressure(self):
        """Computes Systolic and Diastolic pressure from median PTT"""
        if not self.ptt_history:
            return None, None
            
        avg_ptt = sum(self.ptt_history) / len(self.ptt_history)
        
        log_ptt = math.log(avg_ptt)
        systolic_bp = (self.cal_a * log_ptt) + self.cal_b
        diastolic_bp = (self.cal_c * log_ptt) + self.cal_d
        
        sbp = max(85, min(190, round(systolic_bp)))
        dbp = max(50, min(120, round(diastolic_bp)))
        return sbp, dbp, round(avg_ptt, 1)

def main():
    analyzer = VitalsAndBPAnalyzer(ecg_adc_pin=33)
    print("=========================================================")
    print("Dual-Sensor PTT Blood Pressure Estimator Active")
    print("Requires AD8232 (ECG) and MAX30102 (PPG) synchronized")
    print("=========================================================")
    print("[INFO] Ready. Measuring arterial pulse transit time...")

if __name__ == "__main__":
    main()
