import { unstable_cache } from "next/cache";
import { fetchPrayerTimes } from "@/lib/prayer-times";
import { store } from "@/lib/store";

// Public pages can tolerate a minute of staleness; admin writes still use the
// uncached store. This keeps GitHub reads and page rendering off hot requests.
export const getCachedPrayerTimes = unstable_cache(fetchPrayerTimes, ["prayer-times"], {
  revalidate: 60,
});

export const getCachedSettings = unstable_cache(() => store.getSettings(), ["site-settings"], {
  revalidate: 60,
});

export const getCachedBoard = unstable_cache(() => store.getBoard(), ["board"], { revalidate: 60 });
export const getCachedPrograms = unstable_cache(() => store.getPrograms(), ["programs"], { revalidate: 60 });
export const getCachedImpact = unstable_cache(() => store.getImpact(), ["impact"], { revalidate: 60 });
export const getCachedEvents = unstable_cache(() => store.getEvents(), ["events"], { revalidate: 60 });
