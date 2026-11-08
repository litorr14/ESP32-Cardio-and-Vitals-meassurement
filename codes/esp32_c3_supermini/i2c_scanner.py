# ==============================================================================
# ESP32-C3 SuperMini I2C Diagnostic Bus Scanner
# ==============================================================================
# Target Hardware: ESP32-C3 SuperMini (RISC-V 160MHz)
#
# Default I2C Connections:
# SCL -> GPIO 9 (or GPIO 6)
# SDA -> GPIO 8 (or GPIO 7)
# 3V3 -> 3.3V
# GND -> Common Ground
# ==============================================================================

import time
from machine import Pin, SoftI2C

print("=" * 64)
print("  ESP32-C3 SuperMini I2C Diagnostic Scanner")
print("=" * 64)

# Test primary C3 I2C pins: SCL=GPIO 9, SDA=GPIO 8 (fallback 6/7)
test_pairs = [(9, 8), (6, 7)]

found_any = False
for scl_p, sda_p in test_pairs:
    print("\nScanning bus on SCL=GPIO %d, SDA=GPIO %d ..." % (scl_p, sda_p))
    try:
        i2c = SoftI2C(scl=Pin(scl_p), sda=Pin(sda_p), freq=100000)
        devices = i2c.scan()
        if devices:
            found_any = True
            print("[OK] Found %d device(s) on GPIO %d/%d:" % (len(devices), scl_p, sda_p))
            for dev in devices:
                hex_addr = hex(dev)
                info = ""
                if dev == 0x57:
                    info = "--> MAX30102 Pulse Oximeter & PPG Heart Rate Sensor"
                    try:
                        part_id = i2c.readfrom_mem(0x57, 0xFF, 1)[0]
                        info += " (Part ID: 0x%02X)" % part_id
                    except Exception:
                        pass
                elif dev in [0x27, 0x3F]:
                    info = "--> LCD 1602 / 2004 I2C Character Display (PCF8574)"
                elif dev in [0x3C, 0x3D]:
                    info = "--> SSD1306 OLED Display"
                print("     Address: %s (decimal %d) %s" % (hex_addr, dev, info))
        else:
            print("  No devices responded on GPIO %d/%d." % (scl_p, sda_p))
    except Exception as e:
        print("  Error scanning GPIO %d/%d: %s" % (scl_p, sda_p, e))

print("\n" + "=" * 64)
if found_any:
    print("[SUCCESS] I2C communication verified on ESP32-C3 SuperMini!")
else:
    print("[!] Troubleshooting:")
    print(" 1. Check MAX30102 wiring (SCL to GPIO 9, SDA to GPIO 8, VIN to 3V3, GND to GND).")
    print(" 2. Check LCD 1602 wiring (VCC to 5V/VBUS, GND to GND).")
print("=" * 64)
