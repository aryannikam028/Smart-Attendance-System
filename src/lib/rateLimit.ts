interface RateLimitRecord {
  count: number;
  resetAt: number;
  lockoutUntil?: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.resetAt < now && (!record.lockoutUntil || record.lockoutUntil < now)) {
      store.delete(key);
    }
  }
}, 60000);

export interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
  lockoutMs?: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60000, maxAttempts: 10 }
): { allowed: boolean; remaining: number; retryAfterSeconds?: number; isLockedOut?: boolean } {
  const now = Date.now();
  let record = store.get(identifier);

  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + options.windowMs
    };
    store.set(identifier, record);
  }

  // Check lockout
  if (record.lockoutUntil && record.lockoutUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      isLockedOut: true
    };
  }

  record.count++;

  if (record.count > options.maxAttempts) {
    if (options.lockoutMs) {
      record.lockoutUntil = now + options.lockoutMs;
      const retryAfterSeconds = Math.ceil(options.lockoutMs / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        isLockedOut: true
      };
    }
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      isLockedOut: false
    };
  }

  return {
    allowed: true,
    remaining: options.maxAttempts - record.count
  };
}

export function resetRateLimit(identifier: string) {
  store.delete(identifier);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
