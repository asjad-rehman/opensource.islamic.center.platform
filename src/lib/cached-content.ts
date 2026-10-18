import { unstable_cache } from "next/cache";
import { fetchPrayerTimes } from "@/lib/prayer-times";
import { store } from "@/lib/store";

// Public pages can tolerate a minute of staleness; admin writes still use the
// uncached store. This keeps GitHub reads and page rendering off hot requests.
export const getCachedPrayerTimes = unstable_cache(fetchPrayerTimes, ["prayer-times"], {
  revalidate: 60,
  tags: ["content:jamaat"],
});

export const getCachedSettings = unstable_cache(() => store.getSettings(true), ["site-settings"], {
  revalidate: 60,
  tags: ["content:settings"],
});

export const getCachedBoard = unstable_cache(() => store.getBoard(true), ["board"], { revalidate: 60, tags: ["content:board"] });
export const getCachedPrograms = unstable_cache(() => store.getPrograms(true), ["programs"], { revalidate: 60, tags: ["content:programs"] });
export const getCachedImpact = unstable_cache(() => store.getImpact(true), ["impact"], { revalidate: 60, tags: ["content:impact"] });
export const getCachedEvents = unstable_cache(() => store.getEvents(true), ["events"], { revalidate: 60, tags: ["content:events"] });

export const getCachedHalalResources = unstable_cache(() => store.getHalalResources(true), ["halal-resources"], {
  revalidate: 60, tags: ["content:halal_resources"],
});
export const getCachedResourceLinks = unstable_cache(() => store.getResourceLinks(true), ["resource-links"], {
  revalidate: 60, tags: ["content:resource_links"],
});
