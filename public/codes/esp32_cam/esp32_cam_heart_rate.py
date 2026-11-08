# ==============================================================================
# ESP32-CAM MicroPython Contact PPG Heart Rate Monitor (v2.5 Responsive)
# ==============================================================================
# Hardware: AI-Thinker ESP32-CAM (OV2640 camera & onboard Flash LED on GPIO 4)
# Runtime: MicroPython with camera driver (micropython_camera_feeeb5ea3_esp32_idf4_4.bin)
# ==============================================================================

import time
from machine import Pin, PWM
import camera

# AI-Thinker ESP32-CAM Pin Configuration
CAM_XCLK  = 0
CAM_SIOD  = 26
CAM_SIOC  = 27
CAM_Y9    = 35
CAM_Y8    = 34
CAM_Y7    = 39
CAM_Y6    = 36
CAM_Y5    = 21
CAM_Y4    = 19
CAM_Y3    = 18
CAM_Y2    = 5
CAM_VSYNC = 25
CAM_HREF  = 23
CAM_PCLK  = 22

# Flash LED on GPIO 4:
# Set duty to 25 (out of 1023, ~2.4% power).
# This keeps the LED completely cool to the touch while providing
# ideal transmission light for the camera sensor.
LED_BRIGHTNESS = 25
flash_led = PWM(Pin(4), freq=5000)
flash_led.duty(LED_BRIGHTNESS)

def init_camera():
    """Initializes OV2640 in 96x96 grayscale for fast sampling."""
    try:
        camera.deinit()
    except Exception:
        pass
    
    initialized = False
    for fmt in [camera.GRAYSCALE, camera.JPEG]:
        try:
            res = camera.init(
                0,
                format=fmt,
                framesize=camera.FRAME_96X96,
                xclk_freq=camera.XCLK_20MHz
            )
            if res:
                initialized = True
                format_name = "GRAYSCALE" if fmt == camera.GRAYSCALE else "JPEG"
                print("[OK] Camera initialized with format: " + format_name)
                break
        except Exception:
            continue
            
    if not initialized:
        print("[ERROR] Camera initialization failed!")
        return False
        
    try:
        camera.quality(10)
        camera.speffect(camera.EFFECT_NONE)
        camera.whitebal(False)
    except Exception:
        pass
        
    return True

def lock_camera_exposure():
    """Locks Auto-Gain and Auto-Exposure once finger is in position."""
    try:
        camera.gainctrl(False)
        camera.exposure_ctrl(False)
        print("[INFO] Camera AGC/AEC locked for pulse capture.")
    except Exception:
        pass

def compute_mean_luminance(frame_buffer):
    """Subsamples central tissue transmission bytes."""
    if not frame_buffer or len(frame_buffer) < 100:
        return 0
        
    length = len(frame_buffer)
    start = int(length * 0.1)
    end = int(length * 0.9)
    step = max(1, (end - start) // 120)
    
    total = 0
    count = 0
    for i in range(start, end, step):
        total += frame_buffer[i]
        count += 1
        
    return (total / count) if count > 0 else 0

class RealtimePPGFilter:
    """
    Lightweight, constant-time O(1) single-pole IIR filter with Dicrotic Wave Rejection
    and Live Contact Expiration (resets immediately when finger is removed).
    """
    def __init__(self):
        self.dc = None
        self.ac_smooth = 0.0
        self.prev_ac = 0.0
        self.prev_ac2 = 0.0
        
        self.max_ac = 0.5
        self.min_ac = -0.5
        
        self.last_peak_time = None
        self.bpm_history = []
        self.current_bpm = None
        self.beat_count = 0
        
    def reset_baseline(self, raw_val):
        self.dc = float(raw_val)
        self.max_ac = 0.5
        self.min_ac = -0.5
        self.ac_smooth = 0.0
        self.prev_ac = 0.0
        self.prev_ac2 = 0.0

    def update(self, raw_val, now_ms):
        if self.dc is None:
            self.reset_baseline(raw_val)
            return None, 0.0, False, self.beat_count

        # 1. Check if finger was removed (saturation or total darkness)
        if raw_val < 15 or raw_val > 220:
            # Finger retired: expire reading immediately
            self.current_bpm = None
            self.bpm_history = []
            self.last_peak_time = None
            self.reset_baseline(raw_val)
            return None, 0.0, False, self.beat_count

        # 2. Heartbeat timeout: if no pulse detected for > 2.2s, reset BPM to "--"
        if self.last_peak_time is not None and time.ticks_diff(now_ms, self.last_peak_time) > 2200:
            self.current_bpm = None
            self.bpm_history = []
            self.last_peak_time = None

        # 3. Detect sudden large motion / finger readjustment
        if abs(raw_val - self.dc) > 12.0:
            self.reset_baseline(raw_val)
            return self.current_bpm, 0.0, False, self.beat_count
            
        # 4. Update DC baseline tracker (alpha = 0.07)
        self.dc = 0.93 * self.dc + 0.07 * raw_val
        
        # 5. Extract AC pulsatile component clamped to realistic human pulse range
        ac_raw = raw_val - self.dc
        ac_raw = max(-5.0, min(5.0, ac_raw))
        
        # 6. Two-stage low-pass filter to smooth high-frequency sensor grain
        self.ac_smooth = 0.70 * self.ac_smooth + 0.30 * ac_raw
        
        # 7. Fast-decay peak-to-peak tracker (adapts within 1 second)
        self.max_ac = max(self.max_ac * 0.96, self.ac_smooth)
        self.min_ac = min(self.min_ac * 0.96, self.ac_smooth)
        amp = self.max_ac - self.min_ac
        
        # Check minimum pulsatile amplitude
        if amp < 0.20:
            self.prev_ac2 = self.prev_ac
            self.prev_ac = self.ac_smooth
            return self.current_bpm, self.ac_smooth, False, self.beat_count
            
        # Balanced 50% midpoint threshold
        threshold = self.min_ac + (amp * 0.50)
        
        is_peak = False
        # Peak detection: local crest turning point above threshold
        if (self.prev_ac > threshold and 
            self.prev_ac > self.ac_smooth and 
            self.prev_ac >= self.prev_ac2):
            
            if self.last_peak_time is None:
                # First peak detected: anchor timestamp
                self.last_peak_time = now_ms
                self.beat_count += 1
                is_peak = True
            else:
                dt = time.ticks_diff(now_ms, self.last_peak_time)
                
                # Fixed 460ms physiological refractory period:
                # Cleanly rejects dicrotic reflections (<420ms) without trapping true beats.
                # Valid pulse interval: 460ms (130 BPM) to 1500ms (40 BPM)
                if 460 <= dt <= 1500:
                    self.last_peak_time = now_ms
                    self.beat_count += 1
                    is_peak = True
                    
                    instant_bpm = 60000.0 / dt
                    self.bpm_history.append(instant_bpm)
                    # Window of 5 for responsive real-time updates as HR naturally changes
                    if len(self.bpm_history) > 5:
                        self.bpm_history.pop(0)
                        
                    sorted_bpm = sorted(self.bpm_history)
                    self.current_bpm = round(sorted_bpm[len(sorted_bpm) // 2], 1)
                elif dt > 1500:
                    # Timeout / pause: reset anchor
                    self.last_peak_time = now_ms
                    
        self.prev_ac2 = self.prev_ac
        self.prev_ac = self.ac_smooth
        return self.current_bpm, self.ac_smooth, is_peak, self.beat_count

def draw_ascii_oscilloscope(bpm, ac_amp, raw_level, is_beat, beat_num):
    """Draws a real-time ASCII waveform with a visual heartbeat flash indicator."""
    pos = int(12 + ac_amp * 4.0)
    pos = max(0, min(24, pos))
    
    bar = [' '] * 25
    bar[pos] = '#'
    trace = "".join(bar)
    
    if bpm is not None:
        bpm_str = "%5.1f BPM" % bpm
    else:
        bpm_str = "   -- BPM "
        
    if is_beat:
        beat_str = "<3 BEAT #%d!" % beat_num
    else:
        beat_str = "            "
        
    level_str = "%5.1f" % raw_level
    print("|" + trace + "| " + bpm_str + " " + beat_str + " (Level: " + level_str + ")")

def main():
    print("=========================================================")
    print("  ESP32-CAM PPG Heart Rate Monitor [v2.5 COOL LED]")
    print("=========================================================")
    print("Instructions:")
    print("1. Place index finger pad gently covering BOTH the camera lens & flash LED.")
    print("2. Rest lightly (do NOT push hard or blood will stop pulsing).")
    print("3. Hold steady for 5 seconds to lock exposure and baseline.")
    print("Press Ctrl+C in Thonny to stop.")
    print("=========================================================\n")
    
    if not init_camera():
        return
        
    ppg_filter = RealtimePPGFilter()
    frame_count = 0
    exposure_locked = False
    
    try:
        while True:
            t0 = time.ticks_ms()
            frame = camera.capture()
            if not frame:
                time.sleep_ms(10)
                continue
                
            intensity = compute_mean_luminance(frame)
            now = time.ticks_ms()
            frame_count += 1
            
            # After 25 frames (~1 second of settling), lock exposure
            if frame_count > 25 and not exposure_locked and intensity > 30:
                lock_camera_exposure()
                exposure_locked = True
                
            bpm, ac_val, is_beat, beat_num = ppg_filter.update(intensity, now)
            
            if intensity < 15 or intensity > 220:
                print("[!] Finger removed: place gently on lens (Level: " + ("%.1f" % intensity) + ")")
            else:
                draw_ascii_oscilloscope(bpm, ac_val, intensity, is_beat, beat_num)
                
            # Maintain stable ~22 FPS loop pace while yielding CPU for camera DMA
            elapsed = time.ticks_diff(time.ticks_ms(), t0)
            if elapsed < 45:
                time.sleep_ms(45 - elapsed)
            else:
                time.sleep_ms(4)
                
    except KeyboardInterrupt:
        print("\n[INFO] Stopping Heart Rate monitor...")
    finally:
        flash_led.duty(0)
        camera.deinit()
        print("[INFO] Camera released and Flash LED switched off.")

if __name__ == "__main__":
    main()
