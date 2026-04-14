import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@buildwrk:cache:';
const DEFAULT_TTL = 1000 * 60 * 15; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Get cached data. Returns null if expired or missing.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;

    if (age > entry.ttl) {
      // Expired — remove it
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store data in cache with optional TTL.
 */
export async function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
}

/**
 * Remove a specific cache entry.
 */
export async function removeCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/**
 * Clear all cached data.
 */
export async function clearAllCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }
}
