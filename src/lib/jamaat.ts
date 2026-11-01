import { remoteRead, remoteWrite } from "./remote-storage";

// Congregation (iqama) and Jumuah times. These are set by the masjid admin and
// stored as a single JSON document, separate from the calculated adhan times.
export type JummahSlot = { khutbah: string; salah: string };

export type JamaatTimes = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: JummahSlot[];
  /** When true, Maghrib iqama is "After Adhan" and `maghrib` is ignored. */
  maghribAfterAdhan?: boolean;
  updatedAt?: string;
};


// Guards against a malformed stored document (or a bad admin payload) before we
// trust it — the five daily times must be strings and jummah must be an array.
export function isValidJamaatTimes(x: unknown): x is JamaatTimes {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.fajr    === "string" &&
    typeof v.dhuhr   === "string" &&
    typeof v.asr     === "string" &&
    typeof v.maghrib === "string" &&
    typeof v.isha    === "string" &&
    Array.isArray(v.jummah) &&
    (v.maghribAfterAdhan === undefined || typeof v.maghribAfterAdhan === "boolean")
  );
}

// Used when nothing has been saved yet (fresh install / empty storage).
const DEFAULTS: JamaatTimes = {
  fajr:    "05:30",
  dhuhr:   "13:15",
  asr:     "16:45",
  maghrib: "20:00",
  isha:    "21:30",
  jummah: [
    { khutbah: "12:45", salah: "13:15" },
    { khutbah: "13:30", salah: "14:00" },
  ],
};

// Short-lived cache so repeated reads within a request don't all hit storage.
let _mem: JamaatTimes | null = null;
let _memExpiry = 0;

export async function getJamaatTimes(bypassCache = false): Promise<JamaatTimes> {
  const now = Date.now();

  if (!bypassCache && _mem && isValidJamaatTimes(_mem) && now < _memExpiry) {
    return { ..._mem };
  }

  const times = await remoteRead<JamaatTimes>("jamaat", DEFAULTS);
  _mem = times;
  _memExpiry = now + 10000; // 10s TTL
  return { ..._mem };
}

export async function saveJamaatTimes(data: JamaatTimes): Promise<void> {
  if (!isValidJamaatTimes(data)) throw new Error("Invalid jamaat payload");
  const payload: JamaatTimes = { ...data, updatedAt: new Date().toISOString() };

  // Update the cache optimistically, then persist.
  _mem = payload;
  _memExpiry = Date.now() + 10000;
  await remoteWrite<JamaatTimes>("jamaat", payload);
}
