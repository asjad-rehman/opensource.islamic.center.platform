import { unstable_cache } from "next/cache";
import { fetchPrayerTimes } from "@/lib/prayer-times";
import { store } from "@/lib/store";

// Time-dependent prayer calculations retain their minute refresh. Editable
// content is invalidated after a successful save, with an hourly safety refresh.
export const getCachedPrayerTimes = unstable_cache(fetchPrayerTimes, ["prayer-times"], {
  revalidate: 60,
  tags: ["ich:jamaat"],
});

export const getCachedSettings = unstable_cache(() => store.getSettings(true), ["site-settings"], {
  revalidate: 3600, tags: ["ich:settings"],
});

export const getCachedBoard = unstable_cache(() => store.getBoard(true), ["board"], { revalidate: 3600, tags: ["ich:board"] });
export const getCachedPrograms = unstable_cache(() => store.getPrograms(true), ["programs"], { revalidate: 3600, tags: ["ich:programs"] });
export const getCachedImpact = unstable_cache(() => store.getImpact(true), ["impact"], { revalidate: 3600, tags: ["ich:impact"] });
export const getCachedEvents = unstable_cache(() => store.getEvents(), ["events"], { revalidate: 60 });
