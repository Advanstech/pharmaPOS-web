import Redis from 'ioredis';

const inMemoryStore = new Map<string, { count: number; resetAt: number }>();
let redisClient: Redis | null = null;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  return redisClient;
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

  const redis = getRedisClient();
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
