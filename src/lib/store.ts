import { revalidateTag } from "next/cache";
import { createReadThroughCache } from "./read-through-cache";
import { randomUUID } from "crypto";
import { remoteRead, remoteWrite } from "./remote-storage";
import { parseLocalDate } from "./utils";

// Types
export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  endTime?: string;
  location?: string;
  category: string;
  featured: boolean;
  recurring?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "urgent";
  created_at: string;
  expiresAt?: string;
}

export interface BoardMember {
  id: string;
  name: string;
  role: string;
}

export interface HalalResourcesItem {
  id: "main";
  restaurants: string | null;
  meatSupply: string | null;
}

export interface ImpactItem {
  id: string;
  title: string;
  description: string;
  count?: string;
  image?: string;
}

export interface SiteSettings {
  id: "main";
  address: string;
  addressUrl: string;
  phone: string;
  email: string;
  missionText: string;
  jumuahLocation: string;
  oakGroveTitle: string;
  oakGroveDescription: string;
  oakGroveUrl: string;
  zeffyOneTimeId: string;
  zeffyMonthlyId: string;
  maghribDisplay: string;
  masjidShortName: string;
  footerDescription: string;
  facebookUrl: string;
  instagramUrl: string;
}

export interface Program {
  id: string;
  icon: string;
  title: string;
  schedule: string;
  note: string;
  description: string;
  active: boolean;
}

export interface ResourceLink {
  id: string;
  category: string;
  categoryIcon: string;
  label: string;
  url: string;
  order: number;
}


// Each editable content type (events, board, impact, …) is a JSON document in
// remote storage. This factory gives every one the same read-through cache and
// write-through save so the store below stays declarative. `seed` is the initial
// content used when nothing has been persisted yet.
function makeCollection<T extends { id: string }>(name: string, seed: T[]) {
  const cache = createReadThroughCache(() => remoteRead<T[]>(name, seed));
  const get = cache.get;

  async function save(items: T[]): Promise<void> {
    if (JSON.stringify(cache.peek()) === JSON.stringify(items)) return;
    await remoteWrite<T[]>(name, items);
    cache.set(items);
    revalidateTag(`content:${name}`, { expire: 0 });
  }

  return { get, save };
}

// Collections
const _board         = makeCollection<BoardMember>("board", []);
const _announcements = makeCollection<Announcement>("announcements", []);
const _events        = makeCollection<EventItem>("events", []);
const _halal         = makeCollection<HalalResourcesItem>("halal_resources", [{ id: "main", restaurants: null, meatSupply: null }]);
const _impact        = makeCollection<ImpactItem>("impact", []);
const _settings      = makeCollection<SiteSettings>("settings", [{
  id: "main",
  address: "211 N 25th Avenue, Hattiesburg, MS 39401",
  addressUrl: "https://www.google.com/maps/search/?api=1&query=211+N+25th+Avenue,+Hattiesburg,+MS+39401",
  phone: "",
  email: "ichattiesburg@gmail.com",
  missionText: "The Islamic Center of Hattiesburg stands as a beacon of faith and community. Our mission is to foster a vibrant and inclusive environment where Muslims of all backgrounds can come together to worship, learn, and serve. We strive to promote the principles of Islam, advance education, and provide essential services that enhance the quality of life for our community members.",
  jumuahLocation: "211 N 25th Ave",
  oakGroveTitle: "New Masjid Project",
  oakGroveDescription: "As a growing community our current facility continues to be a challenge. We are planning to address this concern by building a new masjid that will offer a large prayer hall, an Islamic school, and a community center, insha'Allah. Please spread the word and donate wholeheartedly.",
  oakGroveUrl: "https://www.launchgood.com/v4/campaign/help_build_the_islamic_center_of_oak_grove",
  zeffyOneTimeId: "ba0c6cb0-70a2-41db-95c6-9ff75a30b42c",
  zeffyMonthlyId: "e4338258-eef5-489e-ae60-75017200e9bc",
  maghribDisplay: "After Adhan",
  masjidShortName: "ICH",
  footerDescription: "Serving the Muslim community of Hattiesburg, Mississippi with prayer, education, and community programs.",
  facebookUrl: "https://www.facebook.com/share/1EJ8ZYq7nT/?mibextid=wwXIfr",
  instagramUrl: "https://www.instagram.com/ichattiesburg",
}]);
const _programs      = makeCollection<Program>("programs", [
  { id: "p1", icon: "🕌", title: "Jumuah Prayers",  schedule: "Fridays (Recurring every week)",            note: "",                                        description: "Weekly Friday congregational prayer and khutbah.", active: true },
  { id: "p2", icon: "📖", title: "Friday Halaqah",  schedule: "Fridays Maghrib to Isha",                  note: "Recurring every week",                     description: "Weekly gathering and discussion.", active: true },
  { id: "p3", icon: "📚", title: "Sunday School",   schedule: "Sundays 10 AM – 1 PM",                     note: "Recurring every week (Currently off for summer)", description: "Islamic education for the youth.", active: true },
]);
const _resourceLinks = makeCollection<ResourceLink>("resource_links", [
  { id: "r1",  category: "Quran & Hadith",             categoryIcon: "📖", label: "Quran.com — Quran with Translation",       url: "https://quran.com",                                               order: 1 },
  { id: "r2",  category: "Quran & Hadith",             categoryIcon: "📖", label: "Sunnah.com — Hadith Collections",           url: "https://sunnah.com",                                              order: 2 },
  { id: "r3",  category: "Quran & Hadith",             categoryIcon: "📖", label: "IslamQA.org — Islamic Q&A",                url: "https://islamqa.org",                                             order: 3 },
  { id: "r4",  category: "Islamic Media",              categoryIcon: "🎙️", label: "SeekersGuidance — Free Islamic Courses",  url: "https://seekersguidance.org",                                     order: 1 },
  { id: "r5",  category: "Islamic Media",              categoryIcon: "🎙️", label: "Yaqeen Institute — Islamic Research",      url: "https://yaqeeninstitute.org",                                     order: 2 },
  { id: "r6",  category: "Islamic Media",              categoryIcon: "🎙️", label: "MuslimMatters.org — Articles & Essays",    url: "https://muslimmatters.org",                                       order: 3 },
  { id: "r7",  category: "Prayer & Zakat Tools",       categoryIcon: "🤲", label: "ISNA — Islamic Society of North America",   url: "https://isna.net",                                               order: 1 },
  { id: "r8",  category: "Prayer & Zakat Tools",       categoryIcon: "🤲", label: "National Zakat Foundation",                url: "https://nzf.org.uk",                                              order: 2 },
  { id: "r9",  category: "Prayer & Zakat Tools",       categoryIcon: "🤲", label: "Islamic Relief — Zakat Calculator",        url: "https://www.islamicrelief.org/zakat/calculator/",                 order: 3 },
  { id: "r10", category: "Community & Organizations",  categoryIcon: "🌐", label: "Islamic Society of North America (ISNA)",  url: "https://isna.net",                                               order: 1 },
  { id: "r11", category: "Community & Organizations",  categoryIcon: "🌐", label: "Muslim American Society (MAS)",            url: "https://mas-icna.org",                                            order: 2 },
  { id: "r12", category: "Community & Organizations",  categoryIcon: "🌐", label: "CAIR — Council on American-Islamic Relations", url: "https://www.cair.com",                                        order: 3 },
]);

// Public store API
export const store = {
  // Board
  getBoard: async (bypassCache = false) => _board.get(bypassCache),
  addBoardMember: async (data: Omit<BoardMember, "id">) => {
    const current = await _board.get(true);
    const newItem = { ...data, id: randomUUID() };
    const items = [...current, newItem];
    await _board.save(items);
    return newItem;
  },
  updateBoardMember: async (id: string, data: Partial<BoardMember>) => {
    const current = await _board.get(true);
    const items = current.map(b => b.id === id ? { ...b, ...data } : b);
    await _board.save(items);
    return items.find(b => b.id === id) ?? null;
  },
  deleteBoardMember: async (id: string) => {
    const current = await _board.get(true);
    await _board.save(current.filter(b => b.id !== id));
  },

  // Announcements
  getAnnouncements: async (bypassCache = false) => _announcements.get(bypassCache),
  addAnnouncement: async (data: Omit<Announcement, "id" | "created_at">) => {
    const current = await _announcements.get(true);
    const item: Announcement = { ...data, id: randomUUID(), created_at: new Date().toISOString() };
    await _announcements.save([item, ...current]);
    return item;
  },
  updateAnnouncement: async (id: string, data: Partial<Announcement>) => {
    const current = await _announcements.get(true);
    const items = current.map(a => a.id === id ? { ...a, ...data } : a);
    await _announcements.save(items);
    return items.find(a => a.id === id) ?? null;
  },
  deleteAnnouncement: async (id: string) => {
    const current = await _announcements.get(true);
    await _announcements.save(current.filter(a => a.id !== id));
  },

  // Events
  getEvents: async (bypassCache = false) => _events.get(bypassCache),
  addEvent: async (data: Omit<EventItem, "id">) => {
    const current = await _events.get(true);
    const item: EventItem = { ...data, id: randomUUID() };
    const items = [...current, item].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );
    await _events.save(items);
    return item;
  },
  updateEvent: async (id: string, data: Partial<EventItem>) => {
    const current = await _events.get(true);
    const items = current
      .map(e => e.id === id ? { ...e, ...data } : e)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    await _events.save(items);
    return items.find(e => e.id === id) ?? null;
  },
  deleteEvent: async (id: string) => {
    const current = await _events.get(true);
    await _events.save(current.filter(e => e.id !== id));
  },
  // Halal Resources
  getHalalResources: async (bypassCache = false) => (await _halal.get(bypassCache))[0],
  updateHalalResources: async (data: Partial<Omit<HalalResourcesItem, "id">>) => {
    const current = (await _halal.get(true))[0];
    const updated = { ...current, ...data };
    await _halal.save([updated]);
    return updated;
  },

  // Impact Stories / Stats
  getImpact: async (bypassCache = false) => _impact.get(bypassCache),
  addImpactItem: async (data: Omit<ImpactItem, "id">) => {
    const current = await _impact.get(true);
    const item = { ...data, id: randomUUID() };
    const items = [item, ...current];
    await _impact.save(items);
    return item;
  },
  updateImpactItem: async (id: string, data: Partial<ImpactItem>) => {
    const current = await _impact.get(true);
    const items = current.map(x => x.id === id ? { ...x, ...data } : x);
    await _impact.save(items);
    return items.find(x => x.id === id) ?? null;
  },
  deleteImpactItem: async (id: string) => {
    const current = await _impact.get(true);
    await _impact.save(current.filter(x => x.id !== id));
  },

  // Site Settings (singleton)
  getSettings: async (bypassCache = false): Promise<SiteSettings> => {
    const list = await _settings.get(bypassCache);
    return list[0];
  },
  updateSettings: async (data: Partial<Omit<SiteSettings, "id">>) => {
    const current = (await _settings.get(true))[0];
    const updated = { ...current, ...data };
    await _settings.save([updated]);
    return updated;
  },

  // Programs / Initiatives
  getPrograms: async (bypassCache = false) => _programs.get(bypassCache),
  addProgram: async (data: Omit<Program, "id">) => {
    const current = await _programs.get(true);
    const item = { ...data, id: randomUUID() };
    await _programs.save([...current, item]);
    return item;
  },
  updateProgram: async (id: string, data: Partial<Program>) => {
    const current = await _programs.get(true);
    const items = current.map(x => x.id === id ? { ...x, ...data } : x);
    await _programs.save(items);
    return items.find(x => x.id === id) ?? null;
  },
  deleteProgram: async (id: string) => {
    const current = await _programs.get(true);
    await _programs.save(current.filter(x => x.id !== id));
  },

  // Resource Links
  getResourceLinks: async (bypassCache = false) => _resourceLinks.get(bypassCache),
  addResourceLink: async (data: Omit<ResourceLink, "id">) => {
    const current = await _resourceLinks.get(true);
    const item = { ...data, id: randomUUID() };
    await _resourceLinks.save([...current, item]);
    return item;
  },
  updateResourceLink: async (id: string, data: Partial<ResourceLink>) => {
    const current = await _resourceLinks.get(true);
    const items = current.map(x => x.id === id ? { ...x, ...data } : x);
    await _resourceLinks.save(items);
    return items.find(x => x.id === id) ?? null;
  },
  deleteResourceLink: async (id: string) => {
    const current = await _resourceLinks.get(true);
    await _resourceLinks.save(current.filter(x => x.id !== id));
  },
};

