// Profanity word list (common slurs & inappropriate words)
const BLOCKED_WORDS = [
  "admin","moderator","support","helpdesk","system","root","superuser",
  "ass","asshole","bastard","bitch","bloody","bollocks","bugger","bullshit",
  "crap","cunt","damn","dick","douche","fag","faggot","fuck","goddamn",
  "hell","homo","jerk","kike","moron","motherfucker","nazi","negro",
  "nigga","nigger","piss","prick","pussy","retard","shit","slut",
  "spic","twat","wanker","whore","penis","vagina","boob","dildo",
  "porn","sex","anal","anus","rape","molest","pedophile","cocaine",
  "heroin","meth","kill","murder","terrorist","bomb","suicide",
];

/**
 * Check if a username contains any blocked/profane words.
 * Returns the matched word if found, or null if clean.
 */
export function containsProfanity(username: string): string | null {
  const lower = username.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) return word;
  }
  return null;
}

/**
 * Validate username format:
 * - 4–15 characters
 * - Only alphanumeric and underscores
 * Returns an error message or null if valid.
 */
export function validateUsername(username: string): string | null {
  if (username.length < 4) return "Username must be at least 4 characters.";
  if (username.length > 15) return "Username must be at most 15 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return "Only letters, numbers, and underscores allowed.";
  const profane = containsProfanity(username);
  if (profane) return "This username contains inappropriate language.";
  return null;
}

/**
 * Password strength analysis matching the strong policy:
 * - min 8 chars, uppercase, lowercase, number, special char
 */
export function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (pw.length >= 8) score++;
  else errors.push("At least 8 characters");

  if (/[A-Z]/.test(pw)) score++;
  else errors.push("One uppercase letter");

  if (/[a-z]/.test(pw)) score++;
  else errors.push("One lowercase letter");

  if (/[0-9]/.test(pw)) score++;
  else errors.push("One number");

  if (/[^A-Za-z0-9]/.test(pw)) score++;
  else errors.push("One special character (@, #, $, %, etc.)");

  if (score <= 2) return { score, label: "Weak", color: "bg-destructive", errors };
  if (score <= 3) return { score, label: "Medium", color: "bg-warning", errors };
  if (score <= 4) return { score, label: "Strong", color: "bg-primary", errors };
  return { score, label: "Very Strong", color: "bg-success", errors };
}

/**
 * Validate password meets strong policy.
 * Returns error message or null.
 */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password needs at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password needs at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password needs at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password needs at least one special character.";
  return null;
}

/**
 * Generate a math captcha challenge.
 */
export function generateCaptcha(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const ops = [
    { symbol: "+", fn: (x: number, y: number) => x + y },
    { symbol: "−", fn: (x: number, y: number) => x - y },
    { symbol: "×", fn: (x: number, y: number) => x * y },
  ];
  const op = ops[Math.floor(Math.random() * ops.length)];
  return { question: `${a} ${op.symbol} ${b}`, answer: op.fn(a, b) };
}
