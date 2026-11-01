// Minimal schema validation for admin payloads. Every admin write goes through
// `parsePayload`, which drops unknown keys, checks types, trims strings and
// rejects unsafe URLs, so a bad request can't store data that breaks a page.

export type FieldSpec =
  | { type: "string"; required?: boolean; max?: number; label?: string }
  | { type: "text"; required?: boolean; max?: number; label?: string }
  | { type: "url"; required?: boolean; label?: string; allowRelative?: boolean }
  | { type: "email"; required?: boolean; label?: string }
  | { type: "date"; required?: boolean; label?: string }
  | { type: "time"; required?: boolean; label?: string }
  | { type: "boolean"; label?: string }
  | { type: "number"; min?: number; max?: number; label?: string }
  | { type: "enum"; values: readonly string[]; label?: string };

export type Schema = Record<string, FieldSpec>;

type Result = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only http(s), mailto, tel, or (optionally) same-site paths like /uploads/x.jpg. */
export function isSafeUrl(value: string, allowRelative = false): boolean {
  if (allowRelative && value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const u = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function labelOf(key: string, spec: FieldSpec) {
  return spec.label ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Validate `body` against `schema`.
 * `partial` (for updates) skips required checks for keys that weren't sent.
 */
export function parsePayload(schema: Schema, body: unknown, partial = false): Result {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request body." };
  const input = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, spec] of Object.entries(schema)) {
    const label = labelOf(key, spec);
    const present = key in input && input[key] !== undefined && input[key] !== null;
    const raw = present ? input[key] : undefined;

    if (spec.type === "boolean") {
      if (present) {
        if (typeof raw !== "boolean") return { ok: false, error: `${label} must be true or false.` };
        out[key] = raw;
      }
      continue;
    }

    if (spec.type === "number") {
      if (!present) continue;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return { ok: false, error: `${label} must be a number.` };
      if (spec.min !== undefined && n < spec.min) return { ok: false, error: `${label} must be at least ${spec.min}.` };
      if (spec.max !== undefined && n > spec.max) return { ok: false, error: `${label} must be at most ${spec.max}.` };
      out[key] = n;
      continue;
    }

    // All remaining types are strings.
    if (present && typeof raw !== "string") return { ok: false, error: `${label} must be text.` };
    const value = typeof raw === "string" ? raw.trim() : "";
    const required = "required" in spec && spec.required;

    if (!value) {
      if (required && (!partial || present)) return { ok: false, error: `${label} is required.` };
      if (present) out[key] = "";
      continue;
    }

    switch (spec.type) {
      case "string":
        if (value.length > (spec.max ?? 300)) return { ok: false, error: `${label} is too long (max ${spec.max ?? 300} characters).` };
        break;
      case "text":
        if (value.length > (spec.max ?? 10000)) return { ok: false, error: `${label} is too long (max ${spec.max ?? 10000} characters).` };
        break;
      case "url":
        if (value.length > 2000 || !isSafeUrl(value, spec.allowRelative)) {
          return { ok: false, error: `${label} must be a full web address starting with https://` };
        }
        break;
      case "email":
        if (!EMAIL_RE.test(value)) return { ok: false, error: `${label} must be a valid email address.` };
        break;
      case "date":
        if (!DATE_RE.test(value) || Number.isNaN(Date.parse(value))) return { ok: false, error: `${label} must be a valid date.` };
        break;
      case "time":
        if (!TIME_RE.test(value)) return { ok: false, error: `${label} must be a valid time.` };
        break;
      case "enum":
        if (!spec.values.includes(value)) return { ok: false, error: `${label} must be one of: ${spec.values.join(", ")}.` };
        break;
    }
    out[key] = value;
  }

  return { ok: true, data: out };
}
