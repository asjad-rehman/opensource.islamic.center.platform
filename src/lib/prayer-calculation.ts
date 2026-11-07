import { fmtDateTime12, todayInMasjidTZ } from "@/lib/time";
import type { PrayerTimes } from "@/lib/prayer-times";
import { CalculationMethod, Coordinates, Madhab, PrayerTimes as AdhanPrayerTimes } from "adhan";
import { masjid } from "@/config/masjid";

export function getPrayerCalculationParameters() {
  const params = (() => {
    switch (masjid.calc.method) {
      case "MUSLIM_WORLD_LEAGUE": return CalculationMethod.MuslimWorldLeague();
      case "EGYPTIAN": return CalculationMethod.Egyptian();
      case "KARACHI": return CalculationMethod.Karachi();
      case "UMM_AL_QURA": return CalculationMethod.UmmAlQura();
      default: return CalculationMethod.NorthAmerica();
    }
  })();

  // Darul Qasim's position: true dawn and Isha begin at 18 degrees.
  // These explicit values override the selected method's preset angles.
  params.fajrAngle = masjid.calc.fajrAngle ?? 18;
  params.ishaAngle = masjid.calc.ishaAngle ?? 18;
  params.madhab = masjid.calc.madhab === "HANAFI" ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function calculatePrayerTimes(now: Date): PrayerTimes {
  const coordinates = new Coordinates(masjid.coordinates.lat, masjid.coordinates.lon);
  const params = getPrayerCalculationParameters();

  const adhan = new AdhanPrayerTimes(
    coordinates,
    todayInMasjidTZ(now, masjid.timezone),
    params,
  );

  return {
    fajr:    fmtDateTime12(adhan.fajr, masjid.timezone),
    sunrise: fmtDateTime12(adhan.sunrise, masjid.timezone),
    dhuhr:   fmtDateTime12(adhan.dhuhr, masjid.timezone),
    asr:     fmtDateTime12(adhan.asr, masjid.timezone),
    maghrib: fmtDateTime12(adhan.maghrib, masjid.timezone),
    isha:    fmtDateTime12(adhan.isha, masjid.timezone),
  };
}
