export type Time12 = { hour: number; minute: number; ampm: "AM" | "PM" };

export function to12(time24?: string): Time12 {
  if (!time24 || !time24.includes(":")) return { hour: 12, minute: 0, ampm: "PM" };
  const parts = time24.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (isNaN(h)) return { hour: 12, minute: 0, ampm: "PM" };
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return { hour, minute: m, ampm };
}

export function to24(t: Time12) {
  let hour = t.hour % 12;
  if (t.ampm === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

export function fmt12From24(time24?: string) {
  if (!time24 || !time24.includes(":")) return "--:--";
  const t = to12(time24);
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")} ${t.ampm}`;
}

export function fmtDateTime12(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).formatToParts(d);

  const hh = (parts.find((p) => p.type === "hour")?.value ?? "12").padStart(2, "0");
  const mm = (parts.find((p) => p.type === "minute")?.value ?? "00").padStart(2, "0");
  const dpRaw = parts.find((p) => p.type === "dayPeriod")?.value ?? "PM";
  const dp = dpRaw.toUpperCase().includes("A") ? "AM" : "PM";

  return `${hh}:${mm} ${dp}`;
}

export function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function todayInMasjidTZ(now: Date, timeZone: string) {
  const p = zonedParts(now, timeZone);
  return new Date(p.year, p.month - 1, p.day);
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function msToHMS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Today's date as YYYY-MM-DD in the given time zone. */
export function todayISOInTZ(timeZone: string, now = new Date()) {
  const p = zonedParts(now, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** HH:MM (24h) of a Date in the given time zone. */
export function hhmmInTZ(d: Date, timeZone: string) {
  const p = zonedParts(d, timeZone);
  return `${String(p.hour % 24).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Display text for Maghrib iqama — the single source of truth for every page. */
export function maghribIqamaLabel(j: { maghrib: string; maghribAfterAdhan?: boolean }, fmt: (t: string) => string = fmt12From24) {
  return j.maghribAfterAdhan ? "After Adhan" : fmt(j.maghrib);
}
