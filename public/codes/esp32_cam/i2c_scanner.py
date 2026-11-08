# ==============================================================================
# ESP32-CAM I2C Bus Diagnostic Scanner
# ==============================================================================
# Verifies wiring for MAX30102 (and other I2C sensors like OLED, AD8232)
#
# Default ESP32-CAM Connections:
# SCL -> GPIO 14
# SDA -> GPIO 13
# VIN -> 3.3V (or 5V if board has onboard 3.3V regulator)
# GND -> GND
# ==============================================================================

import time
from machine import Pin, SoftI2C

print("=" * 60)
print("  ESP32-CAM I2C Diagnostic Scanner")
print("=" * 60)
print("Scanning pins: SCL=GPIO 14, SDA=GPIO 13 ...\n")

try:
    i2c = SoftI2C(scl=Pin(14), sda=Pin(13), freq=100000)
    devices = i2c.scan()
    
    if not devices:
        print("[!] No I2C devices found.")
        print("    Troubleshooting steps:")
        print("    1. Verify SCL is connected to GPIO 14, SDA to GPIO 13.")
        print("    2. Verify VIN has 3.3V (or 5V if module requires 5V).")
        print("    3. Check GND connection is secure.")
        print("    4. If your MAX30102 board has INT pin, leave it disconnected for now.")
    else:
        print("[OK] Found %d device(s) on the I2C bus:" % len(devices))
        for dev in devices:
            hex_addr = hex(dev)
            info = ""
            if dev == 0x57:
                info = "--> MAX30102 / MAX30100 Pulse Oximeter & Heart Rate Sensor"
                # Try reading Part ID
                try:
                    part_id = i2c.readfrom_mem(0x57, 0xFF, 1)[0]
                    rev_id = i2c.readfrom_mem(0x57, 0xFE, 1)[0]
                    info += " (Part ID: 0x%02X, Rev: 0x%02X)" % (part_id, rev_id)
                except Exception as e:
                    info += " (Error reading Part ID: %s)" % e
            elif dev in [0x27, 0x3F]:
                info = "--> LCD 1602 / 2004 I2C Character Display (PCF8574 Backpack)"
            elif dev in [0x3C, 0x3D]:
                info = "--> SSD1306 0.96 inch OLED Display"
            elif dev == 0x68:
                info = "--> MPU6050 / RTC"
            print("     Address: %s (decimal %d) %s" % (hex_addr, dev, info))
            
        if 0x57 in devices:
            print("\n[SUCCESS] MAX30102 is successfully detected and communicating!")
            print("You can now run 'max30102_hr_spo2.py'.")
except Exception as err:
    print("[ERROR] Failed to initialize I2C bus:", err)

print("=" * 60)
