const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;
const LIKE_WILDCARD_REGEX = /[%_]/g;
const SAFE_TXID_REGEX = /[^A-Za-z0-9_.:-]/g;
const SAFE_FILENAME_REGEX = /[^A-Za-z0-9._-]/g;
const SAFE_ORDER_REF_REGEX = /[^A-Za-z0-9_-]/g;

export function sanitizeText(value: unknown, maxLength = 160): string {
  return String(value || "")
    .replace(CONTROL_CHAR_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, Math.max(1, maxLength));
}

export function sanitizeMultilineText(value: unknown, maxLength = 600): string {
  return String(value || "")
    .replace(CONTROL_CHAR_REGEX, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, Math.max(1, maxLength));
}

export function sanitizeSearchKeyword(value: unknown, maxLength = 80): string {
  return sanitizeText(value, maxLength)
    .replace(LIKE_WILDCARD_REGEX, "")
    .replace(/[(),]/g, "");
}

export function sanitizeTxid(value: unknown): string {
  return String(value || "")
    .replace(CONTROL_CHAR_REGEX, "")
    .replace(/\s+/g, "")
    .replace(SAFE_TXID_REGEX, "")
    .slice(0, 64);
}

export function sanitizeOrderRef(value: unknown): string {
  return String(value || "")
    .replace(CONTROL_CHAR_REGEX, "")
    .trim()
    .replace(SAFE_ORDER_REF_REGEX, "")
    .slice(0, 80);
}

export function normalizeDigits(value: unknown, maxLength = 32): string {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, Math.max(1, maxLength));
}

export function normalizeImei(value: unknown): string {
  return normalizeDigits(value, 15);
}

export function isValidImei(value: unknown): boolean {
  return /^\d{15}$/.test(normalizeImei(value));
}

export function clampNumber(value: unknown, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

export function validateImageFile(file: File | null, options: { maxMb?: number } = {}): { ok: boolean; error?: string } {
  if (!file) return { ok: true };
  const maxMb = Number(options.maxMb || 4);
  const maxBytes = maxMb * 1024 * 1024;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) return { ok: false, error: "Only JPG, PNG, WEBP files are allowed." };
  if (file.size > maxBytes) return { ok: false, error: `Image size must be under ${maxMb}MB.` };
  return { ok: true };
}

export function safeFileName(baseName: string, fallbackExt = "jpg"): string {
  const raw = String(baseName || "");
  const pieces = raw.split(".");
  const extRaw = pieces.length > 1 ? pieces.pop() : fallbackExt;
  const ext = String(extRaw || fallbackExt).toLowerCase().replace(/[^a-z0-9]/g, "") || fallbackExt;
  const stem = pieces.join(".").replace(SAFE_FILENAME_REGEX, "").slice(0, 36) || "proof";
  return `${stem}.${ext}`;
}
