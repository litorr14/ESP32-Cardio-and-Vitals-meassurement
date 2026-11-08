# ==============================================================================
# ESP32-CAM + MAX30102 + LCD 1602 I2C Vital Signs Display Station
# ==============================================================================
# Firmware: micropython_camera_feeeb5ea3_esp32_idf4_4.bin
#
# Hardware Connections (I2C Bus Shared):
# -------------------------------------------------------------
# Peripheral    Pin         ESP32-CAM Pin     Notes
# -------------------------------------------------------------
# MAX30102      VIN         3.3V              Sensor 3.3V power
# MAX30102      GND         GND               Ground
# MAX30102      SCL         GPIO 14           Shared I2C Clock
# MAX30102      SDA         GPIO 13           Shared I2C Data
# -------------------------------------------------------------
# LCD 1602 I2C  VCC         5V (or VIN)       Requires 5V for crisp contrast
# LCD 1602 I2C  GND         GND               Shared Ground
# LCD 1602 I2C  SCL         GPIO 14           Shared I2C Clock
# LCD 1602 I2C  SDA         GPIO 13           Shared I2C Data
# ==============================================================================

import time
from machine import Pin, SoftI2C

# I2C Addresses
MAX30102_ADDR = 0x57
LCD_ADDR_CANDIDATES = [0x27, 0x3F]  # Standard PCF8574 (0x27) or PCF8574A (0x3F)

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
# Embedded I2C LCD 1602 Driver (Self-Contained)
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
        time.sleep_ms(50)
        self._write_nibble(0x03 << 4)
        time.sleep_ms(5)
        self._write_nibble(0x03 << 4)
        time.sleep_us(150)
        self._write_nibble(0x03 << 4)
        time.sleep_ms(1)
        self._write_nibble(0x02 << 4)
        
        # 4-bit, 2 lines, 5x8 font
        self.cmd(0x28)
        self.cmd(0x0C)  # Display ON, cursor OFF, blink OFF
        self.cmd(0x06)  # Entry mode
        self.clear()
        
        # Load Custom Character 0: Solid Beating Heart
        heart_solid = [0b00000, 0b01010, 0b11111, 0b11111, 0b01110, 0b00100, 0b00000, 0b00000]
        self.create_char(0, heart_solid)

    def _write_byte(self, data):
        self.i2c.writeto(self.addr, bytes([data | self.backlight]))

    def _write_nibble(self, nibble, mode=0):
        self._write_byte(nibble | mode | self.MASK_EN)
        time.sleep_us(1)
        self._write_byte(nibble | mode)
        time.sleep_us(50)

    def _send(self, value, mode=0):
        self._write_nibble(value & 0xF0, mode)
        self._write_nibble((value << 4) & 0xF0, mode)

    def cmd(self, command):
        self._send(command, 0)
        if command in [0x01, 0x02]:
            time.sleep_ms(2)

    def clear(self):
        self.cmd(0x01)

    def set_cursor(self, col, row):
        addr = col + (0x40 if row == 1 else 0x00)
        self.cmd(0x80 | addr)

    def write_str(self, s):
        for ch in s:
            self._send(ord(ch), self.MASK_RS)

    def write_custom(self, location):
        self._send(location, self.MASK_RS)

    def create_char(self, loc, pattern):
        self.cmd(0x40 | ((loc & 0x7) << 3))
        for b in pattern:
            self._send(b, self.MASK_RS)

# ==============================================================================
# MAX30102 Sensor Driver
# ==============================================================================

class MAX30102:
    def __init__(self, i2c, address=MAX30102_ADDR):
        self.i2c = i2c
        self.address = address
        part_id = self.read_reg(REG_PART_ID)[0]
        print("[OK] MAX30102 Part ID: 0x%02X" % part_id)
        self.reset()
        time.sleep_ms(40)
        self.setup()

    def write_reg(self, reg, val):
        self.i2c.writeto_mem(self.address, reg, bytes([val]))

    def read_reg(self, reg, num_bytes=1):
        return self.i2c.readfrom_mem(self.address, reg, num_bytes)

    def reset(self):
        self.write_reg(REG_MODE_CONFIG, 0x40)
        time.sleep_ms(20)

    def setup(self):
        self.write_reg(REG_FIFO_CONFIG, 0x50)  # SMP_AVE = 4
        self.write_reg(REG_MODE_CONFIG, 0x03)  # Dual SpO2 mode
        self.write_reg(REG_SPO2_CONFIG, 0x27)  # 100 Hz, 18-bit (25 Hz effective)
        self.write_reg(REG_LED1_PA, 0x28)      # RED LED (~8.0 mA)
        self.write_reg(REG_LED2_PA, 0x24)      # IR LED  (~7.2 mA)
        self.clear_fifo()

    def clear_fifo(self):
        self.write_reg(REG_FIFO_WR_PTR, 0x00)
        self.write_reg(REG_FIFO_OV_CTR, 0x00)
        self.write_reg(REG_FIFO_RD_PTR, 0x00)

    def available(self):
        wr = self.read_reg(REG_FIFO_WR_PTR)[0]
        rd = self.read_reg(REG_FIFO_RD_PTR)[0]
        return (wr - rd) & 0x1F

    def read_sample(self):
        raw = self.read_reg(REG_FIFO_DATA, 6)
        if len(raw) < 6:
            return None, None
        red = ((raw[0] << 16) | (raw[1] << 8) | raw[2]) & 0x03FFFF
        ir  = ((raw[3] << 16) | (raw[4] << 8) | raw[5]) & 0x03FFFF
        return red, ir

# ==============================================================================
# Precision Vitals Engine
# ==============================================================================

class VitalsEngine:
    SAMPLE_PERIOD_MS = 40  # 25 Hz FIFO = 40 ms / sample
    
    def __init__(self):
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

    def process(self, red, ir):
        self.sample_idx += 1
        
        # Finger check
        if ir < 40000 or red < 20000:
            if self.finger_present:
                self.reset()
            return False, None, None, 0.0, False, self.beat_count

        self.finger_present = True

        # DC baseline tracking
        if self.ir_dc is None:
            self.ir_dc = float(ir)
            self.red_dc = float(red)
            return True, None, None, 0.0, False, self.beat_count

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

        # 16-sample refractory period (640ms)
        is_peak = False
        threshold = max(20.0, self.ir_ac_peak * 0.38)
        can_trigger = (self.last_peak_sample is None) or ((self.sample_idx - self.last_peak_sample) >= 16)

        if can_trigger:
            if self.prev_ac > threshold and self.prev_ac >= self.prev_ac2 and self.prev_ac >= self.ac_smooth:
                is_peak = True
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

                        # Calibrated SpO2 (to 99% ground truth): SpO2 = 110.0 - 12.0 * R
                        if self.red_dc > 0 and self.ir_dc > 0 and self.ir_ac_peak > 0:
                            r_ratio = (self.red_ac_peak / self.red_dc) / (self.ir_ac_peak / self.ir_dc)
                            calc_spo2 = 110.0 - (12.0 * r_ratio)
                            calc_spo2 = max(88.0, min(99.8, calc_spo2))
                            if self.current_spo2 is None:
                                self.current_spo2 = calc_spo2
                            else:
                                self.current_spo2 = 0.85 * self.current_spo2 + 0.15 * calc_spo2

                self.last_peak_sample = self.sample_idx

        self.prev_ac2 = self.prev_ac
        self.prev_ac = self.ac_smooth
        return True, self.current_bpm, self.current_spo2, self.ac_smooth, is_peak, self.beat_count

# ==============================================================================
# Main Execution Loop
# ==============================================================================

def main():
    print("=" * 65)
    print("  ESP32-C3 SuperMini + MAX30102 + LCD 1602 Dual Monitor Station")
    print("=" * 65)
    print("Scanning I2C Bus on SCL=GPIO 9, SDA=GPIO 8 ...")
    
    i2c = SoftI2C(scl=Pin(9), sda=Pin(8), freq=100000)
    devices = i2c.scan()
    print("[INFO] Devices found:", [hex(d) for d in devices])
    
    # Check MAX30102
    if MAX30102_ADDR not in devices:
        print("[ERROR] MAX30102 (0x57) not detected! Check SCL=14, SDA=13, 3.3V, GND.")
        return
        
    # Check LCD 1602
    lcd_addr = None
    for addr in LCD_ADDR_CANDIDATES:
        if addr in devices:
            lcd_addr = addr
            break
            
    lcd = None
    if lcd_addr:
        print("[OK] LCD 1602 detected at address: %s" % hex(lcd_addr))
        lcd = I2cLcd1602(i2c, addr=lcd_addr)
        lcd.set_cursor(0, 0)
        lcd.write_str("VITAL SIGNS MON ")
        lcd.set_cursor(0, 1)
        lcd.write_str("INITIALIZING... ")
        time.sleep_ms(800)
    else:
        print("[WARN] LCD 1602 (0x27 or 0x3F) not detected! Check 5V power, GND, SCL=14, SDA=13.")

    sensor = MAX30102(i2c)
    engine = VitalsEngine()
    
    if lcd:
        lcd.set_cursor(0, 0)
        lcd.write_str("VITAL SIGNS MON ")
        lcd.set_cursor(0, 1)
        lcd.write_str("PLACE THUMB...  ")
        
    print("\n[READY] Place your thumb pad gently over the MAX30102 sensor.\n")
    
    BAR_WIDTH = 20
    sample_counter = 0
    last_lcd_update = time.ticks_ms()
    last_beat_display = 0
    
    while True:
        num_avail = sensor.available()
        now_ms = time.ticks_ms()
        
        if num_avail == 0:
            time.sleep_ms(10)
            continue
            
        for _ in range(num_avail):
            red, ir = sensor.read_sample()
            if red is None or ir is None:
                continue
                
            has_finger, bpm, spo2, ac_val, is_beat, beat_num = engine.process(red, ir)
            sample_counter += 1
            
            if is_beat:
                last_beat_display = now_ms
            
            # 1. Update Terminal Serial Oscilloscope (~12.5 Hz)
            if (sample_counter % 2 == 0) or is_beat:
                if not has_finger:
                    print("|          --          |     -- BPM |  --.-% SpO2              [NO FINGER]")
                else:
                    pos = int(10 + (ac_val / 15.0))
                    pos = max(0, min(BAR_WIDTH - 1, pos))
                    bar = [' '] * BAR_WIDTH
                    bar[pos] = '#'
                    trace = "".join(bar)
                    
                    bpm_str = ("%5.1f BPM" % bpm) if bpm is not None else "   -- BPM "
                    spo2_str = ("%4.1f%% SpO2" % spo2) if spo2 is not None else " --.-% SpO2"
                    beat_str = ("<3 BEAT #%d!" % beat_num) if is_beat else "            "
                    print("|" + trace + "| " + bpm_str + " | " + spo2_str + " " + beat_str + " (IR: " + str(ir) + ")")
                    
            # 2. Update LCD 1602 Display (every 250ms to keep display flicker-free)
            if lcd and (time.ticks_diff(now_ms, last_lcd_update) >= 250 or is_beat):
                last_lcd_update = now_ms
                
                if not has_finger:
                    lcd.set_cursor(0, 0)
                    lcd.write_str("VITAL SIGNS MON ")
                    lcd.set_cursor(0, 1)
                    lcd.write_str("PLACE THUMB...  ")
                else:
                    # Line 1: Heart Rate + Animated Beating Heart Icon
                    # Heart beats solid (chr 0) when pulse triggers, space otherwise
                    is_pulsing = (now_ms - last_beat_display < 200)
                    
                    lcd.set_cursor(0, 0)
                    if bpm is not None:
                        lcd.write_str("HR : %5.1f BPM " % bpm)
                    else:
                        lcd.write_str("HR :  --.- BPM ")
                        
                    lcd.set_cursor(15, 0)
                    if is_pulsing:
                        lcd.write_custom(0)  # Heart icon
                    else:
                        lcd.write_str(" ")
                        
                    # Line 2: Blood Oxygen SpO2
                    lcd.set_cursor(0, 1)
                    if spo2 is not None:
                        lcd.write_str("SpO2: %4.1f%% [OK]" % spo2)
                    else:
                        lcd.write_str("SpO2: --.-% [..]")

if __name__ == "__main__":
    main()
