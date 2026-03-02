const STORAGE_KEY = "order-sound-enabled";

let audioCtx: AudioContext | null = null;

export function isSoundEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

/** Play a short, pleasant notification chime using the Web Audio API */
export function playNotificationSound() {
  if (!isSoundEnabled()) return;

  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;

    // Two-tone chime: C5 → E5
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.2);

    const gain2 = ctx.createGain();
    gain2.connect(ctx.destination);
    gain2.gain.setValueAtTime(0.12, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
    osc2.connect(gain2);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  } catch {
    // Silently fail if audio not supported
  }
}
