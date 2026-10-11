import { getCachedPrayerTimes, getCachedSettings } from "@/lib/cached-content";
import HomeClient from "@/components/home-client";

export const revalidate = 60;

export default async function HomePage() {
  const [{ prayerTimes, jamaatTimes }, settings] = await Promise.all([
    getCachedPrayerTimes(),
    getCachedSettings(),
  ]);
  return <HomeClient prayerTimes={prayerTimes} jamaatTimes={jamaatTimes} settings={settings} />;
}

