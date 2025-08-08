interface RateLimitEntry {
  count: number
  resetTime: number
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private windowMs = 60 * 1000 // 1 minute
  private maxRequests = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60')

  async checkRateLimit(identifier: string): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Clean up old entries
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }

    const entry = this.store.get(identifier)

    if (!entry) {
      // First request
      this.store.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return { success: true, remaining: this.maxRequests - 1 }
    }

    if (entry.resetTime < now) {
      // Window expired, reset
      this.store.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return { success: true, remaining: this.maxRequests - 1 }
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return { success: false, remaining: 0 }
    }

    // Increment counter
    entry.count++
    return { success: true, remaining: this.maxRequests - entry.count }
  }
}

export const rateLimiter = new InMemoryRateLimiter()

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIp = forwarded?.split(',')[0] || realIp || 'unknown'
  return clientIp
}