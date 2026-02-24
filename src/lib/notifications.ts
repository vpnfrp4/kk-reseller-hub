const PREFS_KEY = "notification-preferences";

export interface NotificationPrefs {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  // Granular alert type controls
  topupApproved: boolean;
  purchaseComplete: boolean;
  lowBalance: boolean;
  orderUpdates: boolean;
}

const defaultPrefs: NotificationPrefs = {
  soundEnabled: true,
  browserNotificationsEnabled: true,
  topupApproved: true,
  purchaseComplete: true,
  lowBalance: true,
  orderUpdates: true,
};

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...defaultPrefs, ...JSON.parse(stored) };
  } catch {}
  return defaultPrefs;
}

export function setNotificationPrefs(prefs: Partial<NotificationPrefs>) {
  const current = getNotificationPrefs();
  const updated = { ...current, ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("notification-prefs-changed", { detail: updated }));
}

// Sound via Web Audio API
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playSound(type: "success" | "info" | "error" = "info") {
  if (!getNotificationPrefs().soundEnabled) return;
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
  } catch {}
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (!getNotificationPrefs().browserNotificationsEnabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.hasFocus()) return;

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
  } catch {}
}

export type AlertCategory = "topupApproved" | "purchaseComplete" | "lowBalance" | "orderUpdates";

export function notifyEvent(
  title: string,
  body: string,
  sound: "success" | "info" | "error" = "info",
  category?: AlertCategory
) {
  // If a category is specified, check if it's enabled
  if (category) {
    const prefs = getNotificationPrefs();
    if (!prefs[category]) return;
  }
  playSound(sound);
  sendBrowserNotification(title, body);
}
