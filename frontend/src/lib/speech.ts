class VoiceCoach {
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private isMuted: boolean = false;
  private minIntervalMs: number = 3500; // at least 3.5s between voice cues

  constructor() {
    // Warm up speech synthesis if available
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // triggers voice loading in Chrome
      };
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public speak(text: string, force: boolean = false) {
    if (this.isMuted || !text) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    // Prevent repeating identical feedback or speaking too fast
    if (!force) {
      if (text === this.lastSpokenText && now - this.lastSpokenTime < 6000) {
        return;
      }
      if (now - this.lastSpokenTime < this.minIntervalMs) {
        return;
      }
    }

    try {
      window.speechSynthesis.cancel(); // stop current utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // slightly slower for therapeutic clarity
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      // Try to find Hindi or Indian English voice
      const indianVoice = voices.find(
        (v) => v.lang === 'hi-IN' || v.lang === 'en-IN' || v.name.toLowerCase().includes('india')
      );
      if (indianVoice) {
        utterance.voice = indianVoice;
      }

      this.lastSpokenText = text;
      this.lastSpokenTime = now;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceCoach = new VoiceCoach();
