// Notification sound using Web Audio API (no external files needed)
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playSound(type: "success" | "info" | "error" = "info") {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    if (type === "success") {
      oscillator.frequency.setValueAtTime(587, ctx.currentTime);
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.1);
    } else if (type === "error") {
      oscillator.frequency.setValueAtTime(330, ctx.currentTime);
      oscillator.frequency.setValueAtTime(262, ctx.currentTime + 0.15);
    } else {
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
    }

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not supported or blocked
  }
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.hasFocus()) return; // Only show when tab is not focused

  try {
    const notification = new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    setTimeout(() => notification.close(), 5000);
  } catch {
    // Notifications not supported
  }
}

export function notifyEvent(
  title: string,
  body: string,
  sound: "success" | "info" | "error" = "info"
) {
  playSound(sound);
  sendBrowserNotification(title, body);
}
