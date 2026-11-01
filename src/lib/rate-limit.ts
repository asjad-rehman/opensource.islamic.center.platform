import { Redis } from "@upstash/redis";

// Fixed-window rate limiter. Uses Redis/KV when configured so the limit holds
// across serverless instances; otherwise falls back to per-instance memory.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  const fullKey = `ichattiesburg:ratelimit:${key}`;
  if (redis) {
    try {
      const count = await redis.incr(fullKey);
      if (count === 1) await redis.expire(fullKey, windowSec);
      if (count > limit) {
        const ttl = await redis.ttl(fullKey);
        return { ok: false, retryAfter: ttl > 0 ? ttl : windowSec };
      }
      return { ok: true, retryAfter: 0 };
    } catch (e) {
      console.warn("[rate-limit] Redis unavailable, using memory:", e);
    }
  }
  const now = Date.now();
  const entry = memory.get(fullKey);
  if (!entry || entry.resetAt <= now) {
    memory.set(fullKey, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export async function resetRateLimit(key: string) {
  const fullKey = `ichattiesburg:ratelimit:${key}`;
  memory.delete(fullKey);
  if (redis) await redis.del(fullKey).catch(() => {});
}
