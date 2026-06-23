class AudioService {
  private sendSound: HTMLAudioElement | null = null;
  private receiveSound: HTMLAudioElement | null = null;
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.sendSound = new Audio('/sounds/send.wav');
        this.sendSound.volume = 0.3;
        this.receiveSound = new Audio('/sounds/receive.wav');
        this.receiveSound.volume = 0.4;
      } catch (err) {
        console.warn('Audio initialization failed', err);
      }
    }
  }

  playSend() {
    if (!this.isEnabled || !this.sendSound) return;
    try {
      this.sendSound.currentTime = 0;
      this.sendSound.play().catch(e => console.warn('Audio play prevented', e));
    } catch (err) {
      console.warn('Audio play failed', err);
    }
  }

  playReceive() {
    if (!this.isEnabled || !this.receiveSound) return;
    try {
      this.receiveSound.currentTime = 0;
      this.receiveSound.play().catch(e => console.warn('Audio play prevented', e));
    } catch (err) {
      console.warn('Audio play failed', err);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

export const audioService = new AudioService();
