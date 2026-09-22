const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

// Lazy Redis import — only used if REDIS_URL is set and ioredis is available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;
let redisAttempted = false;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

async function getRedisClient(): Promise<any> {
  if (redisAttempted) return redisClient;
  redisAttempted = true;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  try {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    return redisClient;
  } catch {
    // ioredis not available in this environment
    return null;
  }
}

export async function enforceRateLimit(
  request: Request,
  routeKey: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `rl:${routeKey}:${ip}`;

  const redis = await getRedisClient();
  if (redis) {
    try {
      if (redis.status === 'wait') {
        await redis.connect();
      }
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      if (count > maxRequests) {
        const ttlMs = await redis.pttl(key);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000)),
        };
      }
      return { allowed: true };
    } catch {
      // Fall back to in-memory limiter if Redis is unavailable.
    }
  }

  const current = inMemoryStore.get(key);
  if (!current || now >= current.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true };
}
