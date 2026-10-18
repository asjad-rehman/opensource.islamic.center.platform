// Coalesce simultaneous reads without letting an old read replace a later save.
export function createReadThroughCache<T>(read: () => Promise<T>, ttl = 10_000) {
  let value: T;
  let expires = 0;
  let generation = 0;
  let pending: Promise<T> | null = null;

  function set(next: T) {
    generation++;
    value = next;
    expires = Date.now() + ttl;
    pending = null;
  }

  async function get(bypassCache = false): Promise<T> {
    if (!bypassCache && Date.now() < expires) return value;
    if (!bypassCache && pending) return pending;
    if (bypassCache) generation++;
    const version = generation;
    const request = read().then((next) => {
      if (version === generation) {
        value = next;
        expires = Date.now() + ttl;
      }
      return next;
    });
    pending = request;
    try {
      return await request;
    } finally {
      if (pending === request) pending = null;
    }
  }

  const peek = (): T | undefined => Date.now() < expires ? value : undefined;
  return { get, set, peek };
}
