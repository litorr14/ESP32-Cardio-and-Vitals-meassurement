# ==============================================================================
# Dual-Sensor PTT Blood Pressure Estimator for ESP32
# ==============================================================================
# Target Firmware: micropython_camera_feeeb5ea3_esp32_idf4_4.bin
# Target Hardware:
# - AD8232 ECG Sensor -> ESP32 GPIO 2 (ADC2_CH2 - Pin 7 on Left Header)
# - MAX30102 PPG Sensor -> I2C (SCL=GPIO 14, SDA=GPIO 13)
# - LCD 1602 I2C Display -> I2C (0x27 / 0x3F on GPIO 14/13)
# ==============================================================================

import time
import math
from machine import Pin, ADC, SoftI2C

# ------------------------------------------------------------------------------
# 1. ECG Signal Analyzer (AD8232 on GPIO 2 / ADC2_CH2 - Header Pin 7)
# ------------------------------------------------------------------------------
class EcgSensor:
    def __init__(self, adc_pin=2):
        self.adc = ADC(Pin(adc_pin))
        self.adc.atten(ADC.ATTN_11DB)   # Full scale range 0 - 3.3V
        self.adc.width(ADC.WIDTH_12BIT) # 0 - 4095 counts
        self.baseline = 1960.0
        self.ecg_ac_peak = 90.0
        self.prev_val = 1960
        self.prev_slope = 0
        self.last_r_peak_time = None
        self.last_lead_status = False
        self.valid_lead_samples = 0
        self.r_peak_history = []
        self.bpm = None

    def read_filtered(self):
        """Oversamples 3 times to eliminate transient ADC2 zeros and noise."""
        total = 0
        valid = 0
        for _ in range(3):
            v = self.adc.read()
            if v > 0:
                total += v
                valid += 1
        if valid > 0:
            return total // valid
        return 0

    def sample(self, timestamp_ms):
        raw = self.read_filtered()
        if raw == 0:
            return self.prev_val, False, False
        
        # Leads-off detection:
        if raw >= 4020 or raw <= 80:
            self.valid_lead_samples = 0
            self.last_lead_status = False
            self.bpm = None
            self.r_peak_history = []
            self.last_r_peak_time = None
            self.prev_val = raw
            return raw, False, False
        else:
            self.valid_lead_samples = min(50, self.valid_lead_samples + 1)
            if self.valid_lead_samples >= 20:
                self.last_lead_status = True

        # Heart rate timeout: if no beat detected for 2.5 seconds, clear BPM
        if self.last_r_peak_time is not None and time.ticks_diff(timestamp_ms, self.last_r_peak_time) > 2500:
            self.bpm = None
            self.r_peak_history = []

        if not self.last_lead_status:
            self.prev_val = raw
            return raw, False, False

        # Virtual ground baseline tracking (~1.65V)
        self.baseline = 0.95 * self.baseline + 0.05 * float(raw)
        ecg_ac = float(raw) - self.baseline
        
        if 0 < ecg_ac < 1200.0:
            self.ecg_ac_peak = max(35.0, max(self.ecg_ac_peak * 0.985, ecg_ac))

        slope = raw - self.prev_val
        self.prev_val = raw

        dynamic_thresh = max(35.0, self.ecg_ac_peak * 0.45)

        # QRS R-peak detection with 380ms refractory lockout
        is_r_peak = False
        refractory_ok = (self.last_r_peak_time is None) or (time.ticks_diff(timestamp_ms, self.last_r_peak_time) > 380)
        
        if refractory_ok and (dynamic_thresh < ecg_ac < 1200.0) and self.prev_slope > 0 and slope <= 0:
            is_r_peak = True
            if self.last_r_peak_time is not None:
                rr_interval = time.ticks_diff(timestamp_ms, self.last_r_peak_time)
                if 380 <= rr_interval <= 1600:
                    instant_bpm = 60000.0 / rr_interval
                    self.r_peak_history.append(instant_bpm)
                    if len(self.r_peak_history) > 5:
                        self.r_peak_history.pop(0)
                    self.bpm = sum(self.r_peak_history) / len(self.r_peak_history)
            self.last_r_peak_time = timestamp_ms

        self.prev_slope = slope
        return raw, is_r_peak, True

# ------------------------------------------------------------------------------
# 2. PTT Blood Pressure Engine (Moens-Korteweg Model)
# ------------------------------------------------------------------------------
class PttBloodPressureEngine:
    def __init__(self):
        # Calibration Model:
        # SBP = a * ln(PTT_ms) + b
        # DBP = c * ln(PTT_ms) + d
        # Baseline Calibrated to: PTT=250ms -> 118/78 mmHg
        self.cal_a = -72.5
        self.cal_b = 518.0
        self.cal_c = -48.0
        self.cal_d = 343.0
        self.ptt_history = []

    def register_pulse_transit(self, r_peak_time_ms, ppg_time_ms):
        """Calculates PTT and returns (SBP, DBP, avg_ptt_ms)"""
        if r_peak_time_ms is None or ppg_time_ms is None:
            return None, None, None

        ptt = time.ticks_diff(ppg_time_ms, r_peak_time_ms)
        
        # Physiological arterial transit time from heart to hand is 160ms - 420ms
        if 160 <= ptt <= 420:
            self.ptt_history.append(ptt)
            if len(self.ptt_history) > 5:
                self.ptt_history.pop(0)

            avg_ptt = sum(self.ptt_history) / len(self.ptt_history)
            log_ptt = math.log(avg_ptt)
            
            sbp = (self.cal_a * log_ptt) + self.cal_b
            dbp = (self.cal_c * log_ptt) + self.cal_d
            
            sbp_clamped = max(85, min(190, int(round(sbp))))
            dbp_clamped = max(50, min(120, int(round(dbp))))
            return sbp_clamped, dbp_clamped, round(avg_ptt, 1)

        return None, None, None

    def calibrate_cuff(self, cuff_sbp, cuff_dbp, measured_ptt_ms):
        """Calculates custom offsets b and d from an external cuff reading."""
        log_ptt = math.log(measured_ptt_ms)
        self.cal_b = cuff_sbp - (self.cal_a * log_ptt)
        self.cal_d = cuff_dbp - (self.cal_c * log_ptt)
        print("[CALIBRATED] Custom offsets: cal_b=%.1f, cal_d=%.1f" % (self.cal_b, self.cal_d))

# ------------------------------------------------------------------------------
# 3. Main Routine
# ------------------------------------------------------------------------------
def main():
    print("=" * 65)
    print("  ESP32-C3 SuperMini PTT Blood Pressure & ECG Diagnostic Tool")
    print("  AD8232 ECG: GPIO 2 (ADC1_CH2) | MAX30102: GPIO 9 (SCL) / GPIO 8 (SDA)")
    print("=" * 65)
    
    ecg = EcgSensor(adc_pin=2)
    bp_engine = PttBloodPressureEngine()

    print("[INFO] Sampling ECG on GPIO 2 (ADC1_CH2 - clean ADC1 without Wi-Fi clash)...")
    print("[INFO] Attach electrodes: RA (Red/Right), LA (Yellow/Left), RL (Green/Ground)")

    count = 0
    while True:
        now = time.ticks_ms()
        raw, is_peak, leads_ok = ecg.sample(now)
        count += 1
        
        if count % 10 == 0 or is_peak:
            lead_str = "LEADS OK" if leads_ok else "LEADS OFF!"
            bpm_str = ("%5.1f BPM" % ecg.bpm) if (leads_ok and ecg.bpm) else "--.- BPM"
            peak_str = " <3 R-PEAK!" if is_peak else ""
            print("ECG ADC: %4d | %s | %s%s" % (raw, lead_str, bpm_str, peak_str))
            
        time.sleep_ms(8)

if __name__ == "__main__":
    main()
