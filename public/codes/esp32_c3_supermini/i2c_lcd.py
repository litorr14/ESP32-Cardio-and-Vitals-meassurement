# ==============================================================================
# MicroPython I2C LCD 1602 Driver (PCF8574 Backpack)
# ==============================================================================
# Supports 16x2 and 20x4 character LCDs over I2C.
# ==============================================================================

import time

# PCF8574 Pin mapping to HD44780 LCD
# P0: RS, P1: RW, P2: EN, P3: Backlight, P4: D4, P5: D5, P6: D6, P7: D7
MASK_RS = 0x01
MASK_RW = 0x02
MASK_EN = 0x04
MASK_BL = 0x08

# HD44780 Commands
LCD_CLEARDISPLAY   = 0x01
LCD_RETURNHOME     = 0x02
LCD_ENTRYMODESET   = 0x04
LCD_DISPLAYCONTROL = 0x08
LCD_FUNCTIONSET    = 0x20
LCD_SETCGRAMADDR   = 0x40
LCD_SETDDRAMADDR   = 0x80

# Flags for display entry mode
LCD_ENTRYLEFT           = 0x02
LCD_ENTRYSHIFTDECREMENT = 0x00

# Flags for display on/off control
LCD_DISPLAYON  = 0x04
LCD_DISPLAYOFF = 0x00
LCD_CURSOROFF  = 0x00
LCD_BLINKOFF   = 0x00

# Flags for function set
LCD_4BITMODE = 0x00
LCD_2LINE    = 0x08
LCD_5x8DOTS  = 0x00

class I2cLcd:
    def __init__(self, i2c, i2c_addr=0x27, num_lines=2, num_columns=16):
        self.i2c = i2c
        self.i2c_addr = i2c_addr
        self.num_lines = num_lines
        self.num_columns = num_columns
        self.backlight = MASK_BL
        
        # 4-bit initialization sequence
        time.sleep_ms(50)
        self._write_nibble(0x03 << 4)
        time.sleep_ms(5)
        self._write_nibble(0x03 << 4)
        time.sleep_us(150)
        self._write_nibble(0x03 << 4)
        time.sleep_ms(1)
        self._write_nibble(0x02 << 4)  # 4-bit mode
        
        # Configure display
        self.command(LCD_FUNCTIONSET | LCD_4BITMODE | LCD_2LINE | LCD_5x8DOTS)
        self.command(LCD_DISPLAYCONTROL | LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF)
        self.command(LCD_ENTRYMODESET | LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT)
        self.clear()

    def _write_byte(self, data):
        self.i2c.writeto(self.i2c_addr, bytes([data | self.backlight]))

    def _write_nibble(self, nibble, mode=0):
        # Pulse EN pin high then low
        self._write_byte(nibble | mode | MASK_EN)
        time.sleep_us(1)
        self._write_byte(nibble | mode)
        time.sleep_us(50)

    def _send(self, value, mode=0):
        # Send upper 4 bits, then lower 4 bits
        high_nibble = value & 0xF0
        low_nibble = (value << 4) & 0xF0
        self._write_nibble(high_nibble, mode)
        self._write_nibble(low_nibble, mode)

    def command(self, cmd):
        self._send(cmd, 0)
        if cmd in [LCD_CLEARDISPLAY, LCD_RETURNHOME]:
            time.sleep_ms(2)

    def write_char(self, char_val):
        self._send(char_val, MASK_RS)

    def clear(self):
        self.command(LCD_CLEARDISPLAY)

    def home(self):
        self.command(LCD_RETURNHOME)

    def move_to(self, col, row):
        row_offsets = [0x00, 0x40, 0x14, 0x54]
        if row >= self.num_lines:
            row = self.num_lines - 1
        self.command(LCD_SETDDRAMADDR | (col + row_offsets[row]))

    def putstr(self, string):
        for char in string:
            self.write_char(ord(char))

    def create_char(self, location, pattern):
        """Creates custom character at location 0-7 (5x8 pixel pattern)"""
        location &= 0x7
        self.command(LCD_SETCGRAMADDR | (location << 3))
        for byte in pattern:
            self._send(byte, MASK_RS)

    def backlight_on(self):
        self.backlight = MASK_BL
        self._write_byte(0)

    def backlight_off(self):
        self.backlight = 0
        self._write_byte(0)
