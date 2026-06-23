import wave
import struct
import math

def generate_tone(filename, freq_start, freq_end, duration_ms, volume=0.5, sample_rate=44100):
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = float(i) / sample_rate
            # Frequency sweep
            freq = freq_start + (freq_end - freq_start) * (i / num_samples)
            # Envelope (quick attack, smooth decay)
            envelope = math.exp(-5.0 * i / num_samples)
            
            value = int(volume * envelope * math.sin(2 * math.pi * freq * t) * 32767.0)
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

# Send sound: subtle swoop up
generate_tone('c:\\Users\\Pranav\\Desktop\\real time chat application\\frontend\\public\\sounds\\send.wav', 400, 600, 150)

# Receive sound: pleasant double beep or swoop down
# For simplicity, we'll just do a higher pitched pop
generate_tone('c:\\Users\\Pranav\\Desktop\\real time chat application\\frontend\\public\\sounds\\receive.wav', 800, 400, 200)

print("Sounds generated.")
