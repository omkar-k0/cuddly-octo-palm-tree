import { cn } from "@/lib/utils";

export const MIN_PASSWORD_LENGTH = 12;

export type Strength = { level: 0 | 1 | 2 | 3; label: string; hints: string[] };

/**
 * Advice only. The one hard rule is the minimum length; the server enforces
 * it too. The score rewards length and variety and flags obvious patterns.
 */
export function assessPassword(password: string, personal: string[] = []): Strength {
  const hints: string[] = [];
  if (!password) return { level: 0, label: "Enter a password", hints: [`Use at least ${MIN_PASSWORD_LENGTH} characters.`] };

  const lower = password.toLowerCase();
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  const distinct = new Set(password).size;
  const sequential = /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|asdf|zxcv)/.test(lower);
  const containsPersonal = personal.some((p) => p.length >= 4 && lower.includes(p.toLowerCase()));

  if (password.length < MIN_PASSWORD_LENGTH) hints.push(`Use at least ${MIN_PASSWORD_LENGTH} characters (${MIN_PASSWORD_LENGTH - password.length} more).`);
  if (distinct < 6) hints.push("Avoid repeating the same few characters.");
  if (sequential) hints.push("Avoid keyboard or number sequences such as 1234 or qwerty.");
  if (containsPersonal) hints.push("Do not include your name or email.");
  if (password.length >= MIN_PASSWORD_LENGTH && classes < 2) hints.push("Mix in capitals, numbers or symbols, or make it longer.");
  if (password.length >= MIN_PASSWORD_LENGTH && password.length < 16 && hints.length === 0) {
    hints.push("Longer is stronger: a passphrase of four or more words works well.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) return { level: 0, label: "Too short", hints };
  const weak = distinct < 6 || sequential || containsPersonal || classes < 2;
  if (weak) return { level: 1, label: "Weak", hints };
  if (password.length >= 16 || classes >= 3) return { level: 3, label: "Strong", hints };
  return { level: 2, label: "Fair", hints };
}

const barColour = ["bg-danger", "bg-danger", "bg-accent", "bg-verified"] as const;

/** Strength meter plus hints. Announced politely so it does not interrupt typing. */
export function PasswordStrength({ password, personal, id }: { password: string; personal?: string[]; id: string }) {
  const s = assessPassword(password, personal);
  return (
    <div id={id} className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex h-1 flex-1 gap-1" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("h-full flex-1 rounded-full bg-foreground/10", s.level >= i && barColour[s.level])} />
          ))}
        </div>
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">{s.label}</span>
      </div>
      {s.hints.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {s.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
