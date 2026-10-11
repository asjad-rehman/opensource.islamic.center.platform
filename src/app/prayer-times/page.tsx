import { getCachedPrayerTimes } from "@/lib/cached-content";
import PrayerTimesClient from "@/components/prayer-times-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prayer Times",
  description: "Daily prayer times and Jumuah schedule for the Islamic Center of Hattiesburg.",
};

export const revalidate = 60;

export default async function PrayerTimesPage() {
  const { prayerTimes, jamaatTimes, jumuah } = await getCachedPrayerTimes();
  return <PrayerTimesClient prayerTimes={prayerTimes} jamaatTimes={jamaatTimes} jumuah={jumuah} />;
}
