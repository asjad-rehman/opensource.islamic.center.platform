import { masjid } from "@/config/masjid";
import { fmtDateTime12, todayInMasjidTZ } from "@/lib/time";
import { getJamaatTimes, type JamaatTimes } from "@/lib/jamaat";
import { Coordinates, PrayerTimes as AdhanPrayerTimes } from "adhan";
import { getPrayerCalculationParameters } from "@/lib/prayer-calculation";

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface JumuahSchedule {
  khutbah: string;
  salah: string;
  speaker?: string;
  topic?: string;
}

export interface MasjidTimes {
  prayerTimes: PrayerTimes;
  jamaatTimes: JamaatTimes;
  jumuah: JumuahSchedule;
  lastUpdated: string;
}

export async function fetchPrayerTimes(): Promise<MasjidTimes> {
  const now = new Date();

  const coordinates = new Coordinates(masjid.coordinates.lat, masjid.coordinates.lon);
  const params = getPrayerCalculationParameters();

  const adhan = new AdhanPrayerTimes(
    coordinates,
    todayInMasjidTZ(now, masjid.timezone),
    params,
  );

  const prayerTimes: PrayerTimes = {
    fajr:    fmtDateTime12(adhan.fajr, masjid.timezone),
    sunrise: fmtDateTime12(adhan.sunrise, masjid.timezone),
    dhuhr:   fmtDateTime12(adhan.dhuhr, masjid.timezone),
    asr:     fmtDateTime12(adhan.asr, masjid.timezone),
    maghrib: fmtDateTime12(adhan.maghrib, masjid.timezone),
    isha:    fmtDateTime12(adhan.isha, masjid.timezone),
  };

  const jamaat = await getJamaatTimes(true);

  const j1 = jamaat.jummah[0] ?? { khutbah: "12:45", salah: "13:15" };
  const j2 = jamaat.jummah[1];
  const jumuah: JumuahSchedule = {
    khutbah: j1.khutbah,
    salah:   j2 ? j2.salah : j1.salah,
    speaker: "Imam",
    topic:   "TBA",
  };

  return { prayerTimes, jamaatTimes: jamaat, jumuah, lastUpdated: now.toISOString() };
}
