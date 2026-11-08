# ==============================================================================
# MAX30102 MicroPython Driver & Vitals Monitor (HR + SpO2)
# ==============================================================================
# Wire to ESP32-CAM:
# SCL -> GPIO 14
# SDA -> GPIO 13
# VIN -> 3.3V
# GND -> GND
# ==============================================================================

import time
import math
from machine import Pin, SoftI2C

# MAX30102 I2C address
MAX30102_ADDR = 0x57

# Register Addresses
REG_INTR_STATUS_1 = 0x00
REG_INTR_ENABLE_1 = 0x02
REG_FIFO_WR_PTR   = 0x04
REG_FIFO_OV_CTR   = 0x05
REG_FIFO_RD_PTR   = 0x06
REG_FIFO_DATA     = 0x07
REG_FIFO_CONFIG   = 0x08
REG_MODE_CONFIG   = 0x09
REG_SPO2_CONFIG   = 0x0A
REG_LED1_PA       = 0x0C  # Red LED amplitude
REG_LED2_PA       = 0x0D  # IR LED amplitude

class MAX30102:
    def __init__(self, i2c, address=MAX30102_ADDR):
        self.i2c = i2c
        self.address = address
        self.reset()
        time.sleep_ms(50)
        self.setup()

    def write_reg(self, reg, val):
        self.i2c.writeto_mem(self.address, reg, bytes([val]))

    def read_reg(self, reg, num_bytes=1):
        return self.i2c.readfrom_mem(self.address, reg, num_bytes)

    def reset(self):
        self.write_reg(REG_MODE_CONFIG, 0x40)

    def setup(self):
        # FIFO Configuration: Sample averaging = 4, FIFO rollover enabled
        self.write_reg(REG_FIFO_CONFIG, 0x50)
        
        # Mode: SpO2 mode (both Red and IR LEDs enabled) -> 0x03
        self.write_reg(REG_MODE_CONFIG, 0x03)
        
        # SpO2 config: ADC range = 4096nA, Sample Rate = 100 Hz, Pulse Width = 411us (18-bit)
        self.write_reg(REG_SPO2_CONFIG, 0x27)
        
        # LED Current (0x24 = ~7.2mA)
        self.write_reg(REG_LED1_PA, 0x24)  # Red LED
        self.write_reg(REG_LED2_PA, 0x24)  # IR LED
        
        # Clear FIFO pointers
        self.write_reg(REG_FIFO_WR_PTR, 0x00)
        self.write_reg(REG_FIFO_OV_CTR, 0x00)
        self.write_reg(REG_FIFO_RD_PTR, 0x00)

    def read_sensor_data(self):
        """Reads one Red and IR sample from FIFO"""
        raw = self.read_reg(REG_FIFO_DATA, 6)
        if len(raw) < 6:
            return None, None
            
        red = ((raw[0] << 16) | (raw[1] << 8) | raw[2]) & 0x03FFFF
        ir  = ((raw[3] << 16) | (raw[4] << 8) | raw[5]) & 0x03FFFF
        return red, ir

def calculate_vitals(red_buffer, ir_buffer, timestamps):
    """
    Computes Heart Rate and SpO2 via Beer-Lambert ratio of ratios:
    R = (AC_red / DC_red) / (AC_ir / DC_ir)
    SpO2 = 110 - 25 * R
    """
    if len(ir_buffer) < 50:
        return None, None
        
    dc_red = sum(red_buffer) / len(red_buffer)
    dc_ir  = sum(ir_buffer)  / len(ir_buffer)
    
    # Check if finger is present
    if dc_ir < 20000:
        return 0, 0  # No finger placed on sensor
        
    ac_red = max(red_buffer) - min(red_buffer)
    ac_ir  = max(ir_buffer)  - min(ir_buffer)
    
    if dc_red == 0 or dc_ir == 0 or ac_ir == 0:
        return None, None
        
    # Ratio of ratios
    r_ratio = (ac_red / dc_red) / (ac_ir / dc_ir)
    spo2 = 110.0 - (25.0 * r_ratio)
    spo2 = max(70.0, min(100.0, spo2))  # Clamp physiological bounds
    
    # Peak detection for Heart Rate on IR channel
    mean_ir = dc_ir
    ir_detrend = [x - mean_ir for x in ir_buffer]
    peaks = []
    thresh = (max(ir_detrend) - min(ir_detrend)) * 0.5
    for i in range(1, len(ir_detrend) - 1):
        if ir_detrend[i] > thresh and ir_detrend[i] > ir_detrend[i-1] and ir_detrend[i] > ir_detrend[i+1]:
            peaks.append(timestamps[i])
            
    bpm = None
    if len(peaks) >= 2:
        intervals = [peaks[k] - peaks[k-1] for k in range(1, len(peaks))]
        avg_interval = sum(intervals) / len(intervals)
        if 350 < avg_interval < 1500:
            bpm = 60000.0 / avg_interval
            
    return round(bpm, 1) if bpm else None, round(spo2, 1)

def main():
    # ESP32-CAM I2C Pins: SCL=GPIO 14, SDA=GPIO 13
    i2c = SoftI2C(scl=Pin(14), sda=Pin(13), freq=400000)
    
    devices = i2c.scan()
    print("[INFO] I2C Scan found devices:", [hex(d) for d in devices])
    if MAX30102_ADDR not in devices:
        print("[ERROR] MAX30102 not found on I2C bus! Check wiring.")
        return
        
    sensor = MAX30102(i2c)
    print("[INFO] MAX30102 ready. Place finger on sensor.")
    
    red_buf, ir_buf, time_buf = [], [], []
    
    while True:
        red, ir = sensor.read_sensor_data()
        now = time.ticks_ms()
        
        if red is not None and ir is not None:
            red_buf.append(red)
            ir_buf.append(ir)
            time_buf.append(now)
            
            if len(red_buf) > 100:  # ~1 second buffer at 100Hz
                red_buf.pop(0)
                ir_buf.pop(0)
                time_buf.pop(0)
                
            bpm, spo2 = calculate_vitals(red_buf, ir_buf, time_buf)
            
            if bpm is None and spo2 == 0:
                print(">> [NO FINGER] Place finger firmly on MAX30102 sensor...")
            elif bpm:
                print(f">> [HEALTH STATUS] Heart Rate: {bpm} BPM | SpO2: {spo2}% | IR: {ir}")
            else:
                print(f">> [ACQUIRING] Calculating pulse wave... SpO2 Est: {spo2}%")
                
        time.sleep_ms(10)

if __name__ == "__main__":
    main()
