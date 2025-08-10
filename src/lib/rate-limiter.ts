type RateLimitEntry = {
  count: number;
  resetTime: number; // ms epoch
};

export class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private maxPerMinute: number;
  private windowMs: number;

  constructor(maxPerMinute = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60')) {
    this.store = new Map();
    this.maxPerMinute = maxPerMinute;
    this.windowMs = 60_000;
  }

  allow(key: string) {
    const now = Date.now();

    // --- cleanup without for..of (avoids downlevelIteration) ---
    // collect keys to delete first to avoid mutating during iteration
    const toDelete: string[] = [];
    this.store.forEach((entry, k) => {
      if (entry.resetTime < now) toDelete.push(k);
    });
    for (let i = 0; i < toDelete.length; i++) {
      this.store.delete(toDelete[i]);
    }

    // --- get or init entry ---
    const current = this.store.get(key);
    if (!current) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: this.maxPerMinute - 1, resetMs: this.windowMs };
    }

    if (current.resetTime < now) {
      // window reset
      current.count = 1;
      current.resetTime = now + this.windowMs;
      this.store.set(key, current);
      return { allowed: true, remaining: this.maxPerMinute - 1, resetMs: this.windowMs };
    }

    if (current.count >= this.maxPerMinute) {
      return { allowed: false, remaining: 0, resetMs: current.resetTime - now };
    }

    current.count += 1;
    this.store.set(key, current);
    return { allowed: true, remaining: this.maxPerMinute - current.count, resetMs: current.resetTime - now };
  }

  // Optional helper to manually clear a key
  reset(key: string) {
    this.store.delete(key);
  }
}

export const rateLimiter = new RateLimiter()

export function getClientIdentifier(request: Request): string {
  // Skip headers during build/static generation
  if (typeof window === 'undefined' && !process.env.VERCEL) {
    return 'build-time'
  }
  
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIp = forwarded?.split(',')[0] || realIp || 'unknown'
  return clientIp
}