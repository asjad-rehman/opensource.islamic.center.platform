import { randomUUID } from "crypto";
import { remoteRead, remoteWrite } from "./remote-storage";
import { parseLocalDate } from "./utils";

// Types
export const EVENT_CATEGORIES = ["jumuah", "eid", "halaqa", "fundraiser", "construction", "community", "other"] as const;

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
  /** Last day (YYYY-MM-DD, masjid time) the announcement is shown. Empty = no end. */
  expiresOn?: string;
  /** Hidden announcements stay in the dashboard but are not shown on the site. */
  active?: boolean;
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
  /** @deprecated Maghrib iqama is now set on the Prayer Times tab (jamaat.maghribAfterAdhan). */
  maghribDisplay?: string;
  masjidShortName: string;
  footerDescription: string;
  facebookUrl: string;
  instagramUrl: string;
  heroText?: string;
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

export { DEFAULT_HERO_TEXT } from "./site-defaults";

// Each editable content type (events, board, impact, …) is a JSON document in
// remote storage. This factory gives every one the same read-through cache and
// write-through save so the store below stays declarative. `seed` is the initial
// content used when nothing has been persisted yet.
function makeCollection<T extends { id: string }>(name: string, seed: T[]) {
  let _mem: T[] | null = null;
  let _memExpiry = 0;

  async function get(bypassCache = false): Promise<T[]> {
    const now = Date.now();
    if (!bypassCache && _mem !== null && now < _memExpiry) return _mem;

    _mem = await remoteRead<T[]>(name, seed);
    _memExpiry = now + 10000; // 10s TTL
    return _mem;
  }

  async function save(items: T[]): Promise<void> {
    _mem = items;
    _memExpiry = Date.now() + 10000;
    await remoteWrite<T[]>(name, items);
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

// Generic list operations shared by every collection.
function crud<T extends { id: string }>(
  col: ReturnType<typeof makeCollection<T>>,
  opts: { prepend?: boolean; sort?: (a: T, b: T) => number } = {},
) {
  const finish = (items: T[]) => (opts.sort ? [...items].sort(opts.sort) : items);
  return {
    list: (bypassCache = false) => col.get(bypassCache),
    add: async (data: Omit<T, "id">) => {
      const current = await col.get(true);
      const item = { ...data, id: randomUUID() } as T;
      await col.save(finish(opts.prepend ? [item, ...current] : [...current, item]));
      return item;
    },
    update: async (id: string, data: Partial<T>) => {
      const current = await col.get(true);
      if (!current.some(x => x.id === id)) return null;
      const items = finish(current.map(x => (x.id === id ? { ...x, ...data, id } : x)));
      await col.save(items);
      return items.find(x => x.id === id) ?? null;
    },
    remove: async (id: string) => {
      const current = await col.get(true);
      await col.save(current.filter(x => x.id !== id));
    },
    /** Reorder to match `ids`; any ids not listed keep their relative order at the end. */
    reorder: async (ids: string[]) => {
      const current = await col.get(true);
      const pos = new Map(ids.map((id, i) => [id, i]));
      const items = [...current].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
      await col.save(items);
      return items;
    },
  };
}

const byDate = (a: EventItem, b: EventItem) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();

export const boardCrud         = crud(_board);
export const announcementsCrud = crud(_announcements, { prepend: true });
export const eventsCrud        = crud(_events, { sort: byDate });
export const impactCrud        = crud(_impact, { prepend: true });
export const programsCrud      = crud(_programs);
export const resourceLinksCrud = crud(_resourceLinks);

// Public store API
export const store = {
  getBoard: boardCrud.list,
  getAnnouncements: announcementsCrud.list,
  getEvents: eventsCrud.list,
  getImpact: impactCrud.list,
  getPrograms: programsCrud.list,
  getResourceLinks: resourceLinksCrud.list,

  // Halal Resources (singleton)
  getHalalResources: async (bypassCache = false) => (await _halal.get(bypassCache))[0],
  updateHalalResources: async (data: Partial<Omit<HalalResourcesItem, "id">>) => {
    const current = (await _halal.get(true))[0];
    const updated = { ...current, ...data, id: "main" as const };
    await _halal.save([updated]);
    return updated;
  },

  // Site Settings (singleton)
  getSettings: async (bypassCache = false): Promise<SiteSettings> => {
    const list = await _settings.get(bypassCache);
    return list[0];
  },
  updateSettings: async (data: Partial<Omit<SiteSettings, "id">>) => {
    const current = (await _settings.get(true))[0];
    const updated = { ...current, ...data, id: "main" as const };
    await _settings.save([updated]);
    return updated;
  },
};

export const memoryStore = {
  get board()          { return store.getBoard(); },
  get announcements()  { return store.getAnnouncements(); },
  get events()         { return store.getEvents(); },
  get halalResources() { return store.getHalalResources(); },
  get impact()         { return store.getImpact(); },
  get settings()       { return store.getSettings(); },
  get programs()       { return store.getPrograms(); },
  get resourceLinks()  { return store.getResourceLinks(); },
};

