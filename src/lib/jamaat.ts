import { remoteRead, remoteWrite } from "./remote-storage";
import { createReadThroughCache } from "./read-through-cache";
import { revalidateTag } from "next/cache";
import { DEFAULT_JAMAAT, isValidJamaatTimes, type JamaatTimes } from "./jamaat-schema";
export { isValidJamaatTimes, type JamaatTimes, type JummahSlot } from "./jamaat-schema";

const cache = createReadThroughCache(async () => {
  const times = await remoteRead<JamaatTimes>("jamaat", DEFAULT_JAMAAT);
  return isValidJamaatTimes(times) ? times : DEFAULT_JAMAAT;
});

export async function getJamaatTimes(bypassCache = false): Promise<JamaatTimes> {
  return structuredClone(await cache.get(bypassCache));
}

export async function saveJamaatTimes(data: JamaatTimes): Promise<void> {
  if (!isValidJamaatTimes(data)) throw new Error("Invalid jamaat payload");
  const current = cache.peek();
  if (current && ["fajr", "dhuhr", "asr", "maghrib", "isha", "jummah"].every(
    (key) => JSON.stringify(current[key as keyof JamaatTimes]) === JSON.stringify(data[key as keyof JamaatTimes]),
  )) return;
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await remoteWrite("jamaat", payload);
  cache.set(payload);
  revalidateTag("content:jamaat", { expire: 0 });
}
