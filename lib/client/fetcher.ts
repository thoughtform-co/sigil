type CacheEntry<T> = {
  data: T;
  timestamp: number;
  promise?: never;
};

type InFlightEntry<T> = {
  promise: Promise<T>;
  data?: never;
  timestamp?: never;
};

const cache = new Map<string, CacheEntry<unknown> | InFlightEntry<unknown>>();
const DEFAULT_TTL = 5_000;

export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

async function rawFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new FetchError(body?.error ?? res.statusText, res.status, body);
  }
  return res.json() as Promise<T>;
}

/**
 * Deduplicated fetch with short-lived in-memory cache.
 * Identical concurrent calls share one in-flight promise.
 * Results are cached for `ttl` ms to prevent rapid re-fetches on re-renders.
 */
export function cachedFetch<T>(url: string, opts?: { ttl?: number; init?: RequestInit }): Promise<T> {
  const ttl = opts?.ttl ?? DEFAULT_TTL;
  const entry = cache.get(url);

  if (entry && "promise" in entry && entry.promise) {
    return entry.promise as Promise<T>;
  }

  if (entry && "data" in entry && entry.data !== undefined) {
    if (Date.now() - entry.timestamp < ttl) {
      return Promise.resolve(entry.data as T);
    }
    cache.delete(url);
  }

  const promise = rawFetch<T>(url, opts?.init).then(
    (data) => {
      cache.set(url, { data, timestamp: Date.now() });
      return data;
    },
    (err) => {
      cache.delete(url);
      throw err;
    },
  );

  cache.set(url, { promise } as InFlightEntry<unknown>);
  return promise;
}

export function invalidateCache(urlPrefix?: string) {
  if (!urlPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
}
