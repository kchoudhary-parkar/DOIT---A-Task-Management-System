// Simple request cache and deduplication system
class RequestCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get cached data if available and not expired
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache] HIT for ${key}`);
    return cached.data;
  }

  // Set cache data
  set(key, data) {
    console.log(`[Cache] SET for ${key}`);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Check if request is in progress
  isPending(key) {
    return this.pendingRequests.has(key);
  }

  // Get pending request promise
  getPending(key) {
    return this.pendingRequests.get(key);
  }

  // Set pending request
  setPending(key, promise) {
    console.log(`[Cache] Request in progress for ${key}`);
    this.pendingRequests.set(key, promise);

    // Clean up when done
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  // Clear cache for a specific key
  invalidate(key) {
    console.log(`[Cache] INVALIDATE ${key}`);
    this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    console.log(`[Cache] CLEAR ALL`);
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Clear cache matching pattern
  invalidatePattern(pattern) {
    const keys = Array.from(this.cache.keys());
    const matchingKeys = keys.filter(key => key.includes(pattern));
    matchingKeys.forEach(key => this.invalidate(key));
  }
}

export const requestCache = new RequestCache();

// Helper to create cache key from URL and params
export const createCacheKey = (url, params = {}) => {
  const paramStr = JSON.stringify(params);
  return `${url}:${paramStr}`;
};

// Wrapper for fetch with caching and deduplication
export const cachedFetch = async (url, options = {}, cacheKey = url) => {
  // Check cache first
  const cached = requestCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Check if same request is in progress
  if (requestCache.isPending(cacheKey)) {
    console.log(`[Cache] Waiting for in-progress request: ${cacheKey}`);
    return requestCache.getPending(cacheKey);
  }

  // Make the request
  const requestPromise = fetch(url, options)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      requestCache.set(cacheKey, data);
      return data;
    });

  requestCache.setPending(cacheKey, requestPromise);

  return requestPromise;
};
