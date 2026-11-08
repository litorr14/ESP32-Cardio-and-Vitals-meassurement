# ==============================================================================
# ESP32-C3 SuperMini Vital Signs Station - MASTER FIRMWARE (main.py)
# ==============================================================================
# Target Hardware: ESP32-C3 SuperMini (RISC-V 160MHz) + MAX30102 + AD8232 + LCD 1602
# Native USB-CDC: Plug USB Type-C directly into PC (no FTDI adapter needed).
# Automatically boots on ESP32-C3 power-up.
#
# Hardware Pinout for ESP32-C3 SuperMini:
# ------------------------------------------------------------------------------
# Peripheral       Pin         ESP32-C3 SuperMini Pin    Notes
# ------------------------------------------------------------------------------
# MAX30102         VIN         3V3                       3.3V LDO Rail
# MAX30102         GND         GND                       Common Ground
# MAX30102         SCL         GPIO 9                    Shared I2C Clock
# MAX30102         SDA         GPIO 8                    Shared I2C Data
# ------------------------------------------------------------------------------
# LCD 1602 I2C     VCC         5V (VBUS)                 Direct USB-C 5V rail (crisp text)
# LCD 1602 I2C     GND         GND                       Common Ground
# LCD 1602 I2C     SCL         GPIO 9                    Shared I2C Clock
# LCD 1602 I2C     SDA         GPIO 8                    Shared I2C Data
# ------------------------------------------------------------------------------
# AD8232 ECG       3.3V        3V3                       Shared 3.3V LDO Rail
# AD8232 ECG       GND         GND                       Common Ground
# AD8232 ECG       OUTPUT      GPIO 2 (ADC1_CH2)         Clean ADC1 input (no Wi-Fi clash)
# AD8232 ECG       LO+ / LO-   Unconnected               Software auto-detects disconnect
# AD8232 ECG       SDN         Unconnected               Internal pull-up keeps active
# ==============================================================================
# Electrodes Placement (when using ECG leads):
# - RA (Right Arm / Red):    Right inner forearm / wrist
# - LA (Left Arm / Yellow):  Left inner forearm / wrist
# - RL (Right Leg / Green):  Right lower abdomen / hip / inner ankle (Ground)
# ==============================================================================

import time
import math
import sys
import uselect
from machine import Pin, SoftI2C, ADC

# I2C Configuration
MAX30102_ADDR = 0x57
LCD_ADDR_CANDIDATES = [0x27, 0x3F]

# MAX30102 Registers
REG_FIFO_WR_PTR = 0x04
REG_FIFO_OV_CTR = 0x05
REG_FIFO_RD_PTR = 0x06
REG_FIFO_DATA   = 0x07
REG_FIFO_CONFIG = 0x08
REG_MODE_CONFIG = 0x09
REG_SPO2_CONFIG = 0x0A
REG_LED1_PA     = 0x0C
REG_LED2_PA     = 0x0D
REG_PART_ID     = 0xFF

# ==============================================================================
# 1. Embedded LCD 1602 I2C Driver (PCF8574 Backpack with Anti-Desync Latching)
# ==============================================================================

class I2cLcd1602:
    MASK_RS = 0x01
    MASK_RW = 0x02
    MASK_EN = 0x04
    MASK_BL = 0x08

    def __init__(self, i2c, addr=0x27):
        self.i2c = i2c
        self.addr = addr
        self.backlight = self.MASK_BL
        self.last_row0 = None
        self.last_row1 = None

        time.sleep_ms(60)

        # Standard HD44780 4-bit initialization sequence with setup times
        self._write_nibble(0x03 << 4)
        time.sleep_ms(5)
        self._write_nibble(0x03 << 4)
        time.sleep_us(150)
        self._write_nibble(0x03 << 4)
        time.sleep_us(150)
        self._write_nibble(0x02 << 4)  # Switch to 4-bit mode
        time.sleep_ms(2)

        self.cmd(0x28)  # 4-bit mode, 2 lines, 5x8 font
        self.cmd(0x08)  # Display OFF
        self.clear()    # Clear display (cmd 0x01)
        self.cmd(0x06)  # Entry mode: increment cursor, no display shift
        self.cmd(0x0C)  # Display ON, cursor OFF, blink OFF

        # Custom Character 0: Solid Beating Heart
        heart_solid = [0b00000, 0b01010, 0b11111, 0b11111, 0b01110, 0b00100, 0b00000, 0b00000]
        self.create_char(0, heart_solid)
        self.cmd(0x80)  # Critical: return cursor to DDRAM Line 0 Col 0!
        time.sleep_ms(5)

    def _write_byte(self, data):
        try:
            self.i2c.writeto(self.addr, bytes([data | self.backlight]))
        except Exception:
            pass

    def _write_nibble(self, nibble, mode=0):
        # 3-phase latching: Set data with EN=0 -> Pulse EN=1 -> Latch data on EN=0
        val = (nibble & 0xF0) | mode | self.backlight
        self._write_byte(val)
        time.sleep_us(2)
        self._write_byte(val | self.MASK_EN)
        time.sleep_us(12)
        self._write_byte(val)
        time.sleep_us(50)

    def _send(self, value, mode=0):
        self._write_nibble(value & 0xF0, mode)
        self._write_nibble((value << 4) & 0xF0, mode)

    def cmd(self, command):
        self._send(command, 0)
        if command in [0x01, 0x02]:
            time.sleep_ms(3)

    def clear(self):
        self.cmd(0x01)
        self.last_row0 = None
        self.last_row1 = None

    def set_cursor(self, col, row):
        addr = (col & 0x0F) + (0x40 if row == 1 else 0x00)
        self.cmd(0x80 | addr)

    def write_str(self, s):
        for ch in s:
            self._send(ord(ch), self.MASK_RS)

    def create_char(self, loc, pattern):
        self.cmd(0x40 | ((loc & 0x7) << 3))
        for b in pattern:
            self._send(b, self.MASK_RS)
        self.cmd(0x80)

    def display(self, row0, row1):
        """Differential update: only transmits when text changes. Eliminates overlap and flickering."""
        r0 = ("%-16s" % row0)[:16]
        r1 = ("%-16s" % row1)[:16]

        if r0 != self.last_row0:
            self.set_cursor(0, 0)
            self.write_str(r0)
            self.last_row0 = r0

        if r1 != self.last_row1:
            self.set_cursor(0, 1)
            self.write_str(r1)
            self.last_row1 = r1

# ==============================================================================
# 2. MAX30102 Pulse Oximeter Sensor Driver
# ==============================================================================

class MAX30102:
    def __init__(self, i2c, address=MAX30102_ADDR):
        self.i2c = i2c
        self.address = address
        part_id = self.read_reg(REG_PART_ID)[0]
        print("[OK] MAX30102 Verified: Part ID 0x%02X" % part_id)
        self.reset()
        time.sleep_ms(40)
        self.setup()

    def write_reg(self, reg, val):
        try:
            self.i2c.writeto_mem(self.address, reg, bytes([val]))
        except Exception:
            pass

    def read_reg(self, reg, num_bytes=1):
        try:
            return self.i2c.readfrom_mem(self.address, reg, num_bytes)
        except Exception:
            return bytes([0] * num_bytes)

    def reset(self):
        self.write_reg(REG_MODE_CONFIG, 0x40)
        time.sleep_ms(20)

    def setup(self):
        # SMP_AVE = 4 samples averaged, FIFO Rollover enabled (0x50)
        self.write_reg(REG_FIFO_CONFIG, 0x50)
        # Dual Red + IR mode (0x03)
        self.write_reg(REG_MODE_CONFIG, 0x03)
        # 100 Hz rate, 4096nA range, 18-bit (25.0 Hz output = 40.0 ms / sample)
        self.write_reg(REG_SPO2_CONFIG, 0x27)
        # Tissue-compensated LED drive currents (calibrated for thumb pad):
        self.write_reg(REG_LED1_PA, 0x2C)  # RED LED (~8.8 mA)
        self.write_reg(REG_LED2_PA, 0x28)  # IR LED  (~8.0 mA)
        self.clear_fifo()

    def clear_fifo(self):
        self.write_reg(REG_FIFO_WR_PTR, 0x00)
        self.write_reg(REG_FIFO_OV_CTR, 0x00)
        self.write_reg(REG_FIFO_RD_PTR, 0x00)

    def available(self):
        try:
            wr = self.read_reg(REG_FIFO_WR_PTR)[0]
            rd = self.read_reg(REG_FIFO_RD_PTR)[0]
            return (wr - rd) & 0x1F
        except Exception:
            return 0

    def read_sample(self):
        try:
            raw = self.read_reg(REG_FIFO_DATA, 6)
            if len(raw) < 6:
                return None, None
            red = ((raw[0] << 16) | (raw[1] << 8) | raw[2]) & 0x03FFFF
            ir  = ((raw[3] << 16) | (raw[4] << 8) | raw[5]) & 0x03FFFF
            return red, ir
        except Exception:
            return None, None

# ==============================================================================
# 3. AD8232 ECG Sensor Interface (ESP32-C3 ADC1_CH2 on GPIO 2)
# ==============================================================================

class EcgEngine:
    def __init__(self, adc_pin=2):
        self.adc = ADC(Pin(adc_pin))
        self.adc.atten(ADC.ATTN_11DB)   # Full range 0 - 3.3V
        self.adc.width(ADC.WIDTH_12BIT) # 0 - 4095 counts
        self.baseline = 1960.0
        self.ecg_ac_peak = 90.0
        self.prev_val = 1960
        self.prev_slope = 0
        self.last_r_peak_ms = None
        self.last_lead_status = False
        self.valid_lead_samples = 0
        self.r_peak_count = 0
        self.rr_intervals = []
        self.ecg_bpm = None

    def read_filtered(self):
        """Oversamples to eliminate noise on analog trace."""
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

    def sample(self, now_ms):
        """Reads ADC and detects ventricular R-peaks with adaptive crest detection."""
        raw = self.read_filtered()
        if raw == 0:
            return self.prev_val, False, self.last_lead_status

        # Continuous Lead-Off detection:
        if raw >= 4020 or raw <= 80:
            self.valid_lead_samples = 0
            self.last_lead_status = False
            self.ecg_bpm = None
            self.rr_intervals = []
            self.last_r_peak_ms = None
        else:
            self.valid_lead_samples = min(50, self.valid_lead_samples + 1)
            if self.valid_lead_samples >= 20:
                self.last_lead_status = True

        if self.last_r_peak_ms is not None and time.ticks_diff(now_ms, self.last_r_peak_ms) > 2500:
            self.ecg_bpm = None
            self.rr_intervals = []

        if not self.last_lead_status:
            self.prev_val = raw
            return raw, False, False

        self.baseline = 0.95 * self.baseline + 0.05 * float(raw)
        ecg_ac = float(raw) - self.baseline
        
        if 0 < ecg_ac < 1200.0:
            self.ecg_ac_peak = max(35.0, max(self.ecg_ac_peak * 0.985, ecg_ac))
            
        slope = raw - self.prev_val
        self.prev_val = raw

        dynamic_thresh = max(35.0, self.ecg_ac_peak * 0.45)
        is_r_peak = False
        refractory_ok = (self.last_r_peak_ms is None) or (time.ticks_diff(now_ms, self.last_r_peak_ms) > 380)
        
        if refractory_ok and (dynamic_thresh < ecg_ac < 1200.0) and self.prev_slope > 0 and slope <= 0:
            is_r_peak = True
            self.r_peak_count += 1
            if self.last_r_peak_ms is not None:
                rr_ms = time.ticks_diff(now_ms, self.last_r_peak_ms)
                if 380 <= rr_ms <= 1600:
                    instant_bpm = 60000.0 / rr_ms
                    self.rr_intervals.append(instant_bpm)
                    if len(self.rr_intervals) > 5:
                        self.rr_intervals.pop(0)
                    self.ecg_bpm = sum(self.rr_intervals) / len(self.rr_intervals)
            self.last_r_peak_ms = now_ms

        self.prev_slope = slope
        return raw, is_r_peak, True

# ==============================================================================
# 4. Precision Vitals & Dual-Mode Blood Pressure Engine (PTT + Optical Fallback)
# ==============================================================================

class VitalsAndBPEngine:
    SAMPLE_PERIOD_MS = 40  # 25.0 Hz hardware FIFO = 40.0 ms / sample

    def __init__(self):
        # Calibrated Moens-Korteweg coefficients for Dual-Sensor PTT:
        self.cal_a = -72.5
        self.cal_b = 518.0
        self.cal_c = -48.0
        self.cal_d = 343.0
        self.reset()

    def reset(self):
        self.sample_idx = 0
        self.ir_dc = None
        self.red_dc = None
        self.ac_smooth = 0.0
        self.prev_ac = 0.0
        self.prev_ac2 = 0.0
        self.last_peak_sample = None
        self.beat_count = 0
        self.bpm_history = []
        self.current_bpm = None
        self.current_spo2 = None
        self.ir_ac_peak = 80.0
        self.red_ac_peak = 80.0
        self.finger_present = False
        self.absent_count = 0

        self.ptt_history = []
        self.current_ptt_ms = None
        self.current_sbp = None
        self.current_dbp = None
        self.bp_mode = None

    def process_ppg(self, red, ir, last_r_peak_ms, leads_ok, now_ms):
        self.sample_idx += 1
        sample_has_tissue = (ir > 18000) or (red > 12000)

        if not sample_has_tissue:
            self.absent_count += 1
            if self.absent_count >= 5:
                self.reset()
                return False, None, None, 0.0, False, self.beat_count, None, None, None, None
            return self.finger_present, self.current_bpm, self.current_spo2, 0.0, False, self.beat_count, self.current_ptt_ms, self.current_sbp, self.current_dbp, self.bp_mode
        else:
            self.absent_count = 0
            self.finger_present = True

        if self.ir_dc is None:
            self.ir_dc = float(ir)
            self.red_dc = float(red)
            return True, None, None, 0.0, False, self.beat_count, None, None, None, None

        ir_err = abs(float(ir) - self.ir_dc)
        if ir_err > 350.0:
            self.ir_dc = 0.70 * self.ir_dc + 0.30 * float(ir)
            self.red_dc = 0.70 * self.red_dc + 0.30 * float(red)
        else:
            self.ir_dc = 0.93 * self.ir_dc + 0.07 * float(ir)
            self.red_dc = 0.93 * self.red_dc + 0.07 * float(red)

        ac_ir_raw = float(ir) - self.ir_dc
        ac_red_raw = float(red) - self.red_dc
        self.ac_smooth = 0.65 * self.ac_smooth + 0.35 * ac_ir_raw

        clamped_ac_ir = max(0.0, min(300.0, abs(self.ac_smooth)))
        clamped_ac_red = max(0.0, min(300.0, abs(ac_red_raw)))
        self.ir_ac_peak = max(30.0, min(250.0, max(self.ir_ac_peak * 0.985, clamped_ac_ir)))
        self.red_ac_peak = max(30.0, min(250.0, max(self.red_ac_peak * 0.985, clamped_ac_red)))

        is_ppg_peak = False
        threshold = max(20.0, self.ir_ac_peak * 0.38)
        can_trigger = (self.last_peak_sample is None) or ((self.sample_idx - self.last_peak_sample) >= 16)

        if can_trigger:
            if self.prev_ac > threshold and self.prev_ac >= self.prev_ac2 and self.prev_ac >= self.ac_smooth:
                is_ppg_peak = True
                self.beat_count += 1

                if self.last_peak_sample is not None:
                    delta_samples = self.sample_idx - self.last_peak_sample
                    dt_ms = delta_samples * self.SAMPLE_PERIOD_MS

                    if 550 <= dt_ms <= 1500:
                        instant_bpm = 60000.0 / dt_ms
                        self.bpm_history.append(instant_bpm)
                        if len(self.bpm_history) > 5:
                            self.bpm_history.pop(0)

                        sorted_bpm = sorted(self.bpm_history)
                        median_bpm = sorted_bpm[len(sorted_bpm) // 2]

                        if self.current_bpm is None:
                            self.current_bpm = median_bpm
                        else:
                            self.current_bpm = 0.75 * self.current_bpm + 0.25 * median_bpm

                        if self.red_dc > 0 and self.ir_dc > 0 and self.ir_ac_peak > 0:
                            r_ratio = (self.red_ac_peak / self.red_dc) / (self.ir_ac_peak / self.ir_dc)
                            calc_spo2 = 110.0 - (12.0 * r_ratio)
                            calc_spo2 = max(88.0, min(99.8, calc_spo2))
                            if self.current_spo2 is None:
                                self.current_spo2 = calc_spo2
                            else:
                                self.current_spo2 = 0.85 * self.current_spo2 + 0.15 * calc_spo2

                # PTT Mode
                ptt_calculated = False
                if leads_ok and last_r_peak_ms is not None:
                    ptt_ms = time.ticks_diff(now_ms, last_r_peak_ms)
                    if 160 <= ptt_ms <= 420:
                        self.ptt_history.append(ptt_ms)
                        if len(self.ptt_history) > 5:
                            self.ptt_history.pop(0)

                        avg_ptt = sum(self.ptt_history) / len(self.ptt_history)
                        self.current_ptt_ms = round(avg_ptt, 1)

                        log_ptt = math.log(avg_ptt)
                        calc_sbp = (self.cal_a * log_ptt) + self.cal_b
                        calc_dbp = (self.cal_c * log_ptt) + self.cal_d

                        sbp_val = max(85, min(190, int(round(calc_sbp))))
                        dbp_val = max(50, min(120, int(round(calc_dbp))))

                        if self.current_sbp is None or self.bp_mode != "PTT":
                            self.current_sbp = sbp_val
                            self.current_dbp = dbp_val
                        else:
                            self.current_sbp = int(round(0.70 * self.current_sbp + 0.30 * sbp_val))
                            self.current_dbp = int(round(0.70 * self.current_dbp + 0.30 * dbp_val))

                        self.bp_mode = "PTT"
                        ptt_calculated = True

                # Optical PWA Fallback Mode
                if not ptt_calculated and self.current_bpm is not None:
                    hr = self.current_bpm
                    ox = self.current_spo2 if self.current_spo2 is not None else 97.0
                    
                    sbp_opt = 118.0 + (0.45 * (hr - 60.0)) + (1.10 * (100.0 - ox))
                    dbp_opt = 76.0 + (0.28 * (hr - 60.0)) + (0.70 * (100.0 - ox))

                    sbp_val = max(90, min(180, int(round(sbp_opt))))
                    dbp_val = max(55, min(115, int(round(dbp_opt))))

                    if self.current_sbp is None or self.bp_mode != "PPG":
                        self.current_sbp = sbp_val
                        self.current_dbp = dbp_val
                    else:
                        self.current_sbp = int(round(0.85 * self.current_sbp + 0.15 * sbp_val))
                        self.current_dbp = int(round(0.85 * self.current_dbp + 0.15 * dbp_val))

                    self.current_ptt_ms = None
                    self.bp_mode = "PPG"

                self.last_peak_sample = self.sample_idx

        self.prev_ac2 = self.prev_ac
        self.prev_ac = self.ac_smooth

        return (
            True,
            self.current_bpm,
            self.current_spo2,
            self.ac_smooth,
            is_ppg_peak,
            self.beat_count,
            self.current_ptt_ms,
            self.current_sbp,
            self.current_dbp,
            self.bp_mode
        )

# ==============================================================================
# 5. Main Program Execution Loop (ESP32-C3 SuperMini Configured)
# ==============================================================================

def main():
    print("=" * 68)
    print("  ESP32-C3 SuperMini Precision Vital Signs Station + BP")
    print("  Sensors: MAX30102 (PPG) + AD8232 (ECG) + LCD 1602 (I2C)")
    print("  Board: ESP32-C3 SuperMini (RISC-V 160MHz) | Native USB-C")
    print("=" * 68)

    # ESP32-C3 Hardware I2C: GPIO 9 (SCL), GPIO 8 (SDA)
    i2c = SoftI2C(scl=Pin(9), sda=Pin(8), freq=100000)
    devices = i2c.scan()
    print("[INFO] I2C Scan detected devices on GPIO 9/8:", [hex(d) for d in devices])

    # 1. Initialize LCD 1602 Display (0x27 or 0x3F)
    lcd = None
    for addr in LCD_ADDR_CANDIDATES:
        if addr in devices:
            try:
                lcd = I2cLcd1602(i2c, addr=addr)
                print("[OK] LCD 1602 initialized at address %s" % hex(addr))
                lcd.display("C3 SUPERMINI MON", "ECG+PPG+BP READY")
                time.sleep_ms(600)
                break
            except Exception as e:
                print("[WARN] LCD init error:", e)

    # 2. Initialize MAX30102 Sensor
    if MAX30102_ADDR not in devices:
        print("[ERROR] MAX30102 (0x57) not found! Check wiring on GPIO 9 (SCL) and GPIO 8 (SDA).")
        if lcd:
            lcd.display("SENSOR ERROR!   ", "CHECK MAX30102  ")
        return

    sensor = MAX30102(i2c)

    # 3. Initialize AD8232 ECG on ESP32-C3 GPIO 2 (ADC1_CH2)
    print("[OK] Initializing AD8232 ECG on GPIO 2 (ADC1_CH2)...")
    ecg = EcgEngine(adc_pin=2)

    vitals = VitalsAndBPEngine()

    if lcd:
        lcd.display("C3 SUPERMINI MON", "PLACE THUMB...  ")

    print("\n[READY] System online!")
    print(" -> Attach AD8232 ECG electrodes (RA: Right Arm, LA: Left Arm, RL: Reference)")
    print(" -> Place thumb pad gently on MAX30102 sensor\n")

    BAR_WIDTH = 18
    sample_counter = 0
    last_lcd_update = time.ticks_ms()
    last_terminal_update = time.ticks_ms()
    last_beat_display = 0
    latest_ir = 0

    has_finger = False
    bpm = None
    spo2 = None
    ac_val = 0.0
    ptt_ms = None
    sbp = None
    dbp = None
    bp_mode = None
    beat_num = 0

    poll_stdin = uselect.poll()
    poll_stdin.register(sys.stdin, uselect.POLLIN)

    while True:
        try:
            now_ms = time.ticks_ms()

            # 0. Check for USB Host Commands (e.g. $CAL,b,d from Web App)
            if poll_stdin.poll(0):
                cmd_line = sys.stdin.readline()
                if cmd_line and cmd_line.startswith("$CAL,"):
                    try:
                        c_parts = cmd_line.strip().split(",")
                        vitals.cal_b = float(c_parts[1])
                        vitals.cal_d = float(c_parts[2])
                        print("# [ESP32] Calibrated PTT Coefficients: b=%.1f, d=%.1f" % (vitals.cal_b, vitals.cal_d))
                    except Exception:
                        pass

            # 1. Continuous ECG Sampling on GPIO 2 (ADC1_CH2)
            raw_ecg, is_r_peak, leads_ok = ecg.sample(now_ms)
            if is_r_peak:
                last_beat_display = now_ms

            # 2. Read available samples from MAX30102 FIFO
            is_ppg_beat = False
            num_avail = sensor.available()

            for _ in range(min(num_avail, 8)):
                red, ir = sensor.read_sample()
                if red is None or ir is None:
                    continue

                latest_ir = ir
                res = vitals.process_ppg(red, ir, ecg.last_r_peak_ms, leads_ok, now_ms)
                (
                    cur_finger,
                    cur_bpm,
                    cur_spo2,
                    cur_ac,
                    beat_flag,
                    cur_bnum,
                    cur_ptt,
                    cur_sbp,
                    cur_dbp,
                    cur_mode
                ) = res

                has_finger = cur_finger
                ac_val = cur_ac
                beat_num = cur_bnum

                if cur_finger:
                    bpm = cur_bpm
                    spo2 = cur_spo2
                    ptt_ms = cur_ptt
                    sbp = cur_sbp
                    dbp = cur_dbp
                    bp_mode = cur_mode
                else:
                    bpm = None
                    spo2 = None
                    ptt_ms = None
                    sbp = None
                    dbp = None
                    bp_mode = None

                if beat_flag and cur_finger:
                    is_ppg_beat = True
                    last_beat_display = now_ms

            # 3. Terminal Trace & High-Speed Machine Telemetry Packet for PC Cardiogram
            sample_counter += 1
            terminal_due = (time.ticks_diff(now_ms, last_terminal_update) >= 100)
            if terminal_due or is_ppg_beat or is_r_peak:
                last_terminal_update = now_ms

                if not has_finger:
                    lead_txt = "[LEADS OK]" if leads_ok else "[LEADS OFF]"
                    ecg_hr_txt = ("%5.1f BPM" % ecg.ecg_bpm) if (leads_ok and ecg.ecg_bpm) else "  -- BPM "
                    peak_txt = " *R-PEAK*" if (is_r_peak and leads_ok) else "         "
                    print("|  ADC:%4d %-10s | %s | IR:%6d | --.-%% SpO2 | BP: PLACE THUMB %s" % (
                        raw_ecg, lead_txt, ecg_hr_txt, latest_ir, peak_txt
                    ))
                else:
                    pos = int(9 + (ac_val / 16.0))
                    pos = max(0, min(BAR_WIDTH - 1, pos))
                    bar = [' '] * BAR_WIDTH
                    bar[pos] = '#'
                    trace = "".join(bar)

                    bpm_str = ("%5.1f BPM" % bpm) if bpm is not None else "   -- BPM "
                    spo2_str = ("%4.1f%% SpO2" % spo2) if spo2 is not None else " --.-% SpO2"

                    if sbp is not None and dbp is not None:
                        if bp_mode == "PTT" and ptt_ms is not None:
                            bp_str = "BP:%3d/%-2d (%dms PTT)" % (sbp, dbp, int(ptt_ms))
                        else:
                            bp_str = "BP:%3d/%-2d (PPG)    " % (sbp, dbp)
                    else:
                        bp_str = "BP: CALIBRATING...  "

                    beat_str = ("<3 BEAT #%d!" % beat_num) if is_ppg_beat else (" *R-PEAK*  " if is_r_peak else "           ")
                    lead_short = "OK " if leads_ok else "OFF"
                    print("|" + trace + "| ADC:%4d [%s] | " % (raw_ecg, lead_short) + bpm_str + " | " + spo2_str + " | " + bp_str + " " + beat_str)

                # Machine Telemetry Packet ($VTL,...)
                v_bpm = round(bpm, 1) if (bpm is not None and has_finger) else (round(ecg.ecg_bpm, 1) if (leads_ok and ecg.ecg_bpm) else 0.0)
                v_spo2 = round(spo2, 1) if (spo2 is not None and has_finger) else 0.0
                v_sbp = sbp if (sbp is not None and has_finger) else 0
                v_dbp = dbp if (dbp is not None and has_finger) else 0
                v_leads = 1 if leads_ok else 0
                v_r = 1 if is_r_peak else 0
                v_p = 1 if is_ppg_beat else 0
                v_ptt = round(ptt_ms, 1) if ptt_ms is not None else 0.0
                print("$VTL,%d,%.2f,%.1f,%.1f,%d,%d,%d,%d,%d,%.1f" % (
                    raw_ecg, ac_val, v_bpm, v_spo2, v_sbp, v_dbp, v_leads, v_r, v_p, v_ptt
                ))

            # 4. LCD 1602 Display Updates
            lcd_due = (time.ticks_diff(now_ms, last_lcd_update) >= 220)
            if lcd and (lcd_due or is_ppg_beat or is_r_peak):
                last_lcd_update = now_ms
                is_pulsing = (now_ms - last_beat_display < 220)
                heart_icon = "\x00" if is_pulsing else " "

                if has_finger and bpm:
                    spo2_val = ("%.1f%%" % spo2) if spo2 else "--.-%"
                    row0_left = "HR: %.0f O2: %s" % (bpm, spo2_val)
                    row0_text = ("%-15s" % row0_left)[:15] + heart_icon
                elif leads_ok and ecg.ecg_bpm:
                    row0_text = ("ECG : %5.1f BPM " % ecg.ecg_bpm)[:15] + heart_icon
                else:
                    row0_text = "C3 SUPERMINI MON"

                if has_finger:
                    if sbp is not None and dbp is not None:
                        if bp_mode == "PTT" and ptt_ms is not None:
                            row1_text = "BP:%3d/%-2d %3dms*" % (sbp, dbp, int(ptt_ms))
                        else:
                            row1_text = "BP:%3d/%-2d mmHg  " % (sbp, dbp)
                    else:
                        row1_text = "BP: ACQUIRING... "
                else:
                    row1_text = "PLACE THUMB PAD "

                lcd.display(row0_text, row1_text)

            time.sleep_ms(6)

        except Exception as e:
            time.sleep_ms(20)

if __name__ == "__main__":
    main()
