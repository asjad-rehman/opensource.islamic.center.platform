import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { Redis } from "@upstash/redis";

// Initialize Redis if credentials are in env (supports Upstash and Vercel KV env vars)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const hasRedis = !!(redisUrl && redisToken);

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!hasRedis) return null;
  if (!_redis) {
    _redis = new Redis({ url: redisUrl!, token: redisToken! });
  }
  return _redis;
}

const GH_OWNER = "asjad-rehman";
const GH_REPO = "ichattiesburg";
const GH_BRANCH = "main";

// Support common naming conventions for the GitHub token
const getGitHubToken = () => process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT;

// Log detected configurations to help trace deployment settings in Vercel console
if (typeof window === "undefined") {
  const token = getGitHubToken();
  if (!hasRedis && !token) {
    console.warn("[remote-storage] WARNING: Neither Redis/KV nor GitHub Token environment variables are configured. Changes will NOT persist across serverless instances.");
  } else {
    console.log(`[remote-storage] Active storage engines: ${hasRedis ? "[Redis/KV] " : ""}${token ? "[GitHub Contents API]" : ""}`);
  }
}

/**
 * Reads data from:
 * 1. Redis (if available)
 * 2. GitHub API Contents (if token available - bypasses raw CDN cache)
 * 3. Local /tmp/<key>.json
 * 4. public/<key>.json
 * 5. Fallback seed
 */
export async function remoteRead<T>(name: string, fallback: T): Promise<T> {
  const tmpPath = `/tmp/ichattiesburg-${name}.json`;
  const bundlePath = join(process.cwd(), "public", `${name}.json`);

  // Fast path: the shared Redis/KV cache.
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<T>(`ichattiesburg:${name}`);
      if (cached) return cached;
    } catch (e) {
      console.warn(`[remote-storage] Redis read failed for ${name}:`, e);
    }
  }

  // The Contents API (not raw.githubusercontent.com) so we don't get a stale,
  // CDN-cached file right after an admin edit. Backfill Redis on the way out.
  const token = getGitHubToken();
  if (token) {
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/public/${name}.json`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json() as { content: string };
        const decoded = Buffer.from(json.content, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded) as T;

        if (redis) {
          await redis.set(`ichattiesburg:${name}`, parsed).catch(() => {});
        }
        return parsed;
      }
    } catch (e) {
      console.warn(`[remote-storage] GitHub API read failed for ${name}:`, e);
    }
  }

  // Scratch file left by an earlier save on this same instance.
  try {
    if (existsSync(tmpPath)) {
      const data = JSON.parse(readFileSync(tmpPath, "utf-8"));
      return data as T;
    }
  } catch { /* ignore */ }

  // Seed content bundled with the build.
  try {
    if (existsSync(bundlePath)) {
      const data = JSON.parse(readFileSync(bundlePath, "utf-8"));
      return data as T;
    }
  } catch { /* ignore */ }

  return fallback;
}

/**
 * Writes data to every configured backend:
 * 1. Redis / KV (if available) — durable, shared across serverless instances
 * 2. Local /tmp/<key>.json — best-effort, per-instance only
 * 3. GitHub API (if token available) — durable, shared
 *
 * A "durable" backend is Redis/KV or GitHub. The write throws only when at
 * least one durable backend was configured and *every* configured durable
 * backend failed — so, e.g., a stale GitHub token no longer breaks saves once
 * Redis/KV is working. When no durable backend is configured at all, the write
 * falls back to /tmp only (dev/local mode) and resolves without error.
 */
export async function remoteWrite<T>(name: string, data: T): Promise<void> {
  const tmpPath = `/tmp/ichattiesburg-${name}.json`;

  let durableConfigured = false;
  let durableOk = false;
  let lastDurableError: unknown = null;

  // 1. Write to Redis / KV
  const redis = getRedis();
  if (redis) {
    durableConfigured = true;
    try {
      await redis.set(`ichattiesburg:${name}`, data);
      durableOk = true;
    } catch (e) {
      lastDurableError = e;
      console.warn(`[remote-storage] Redis write failed for ${name}:`, e);
    }
  }

  // 3. Commit to GitHub
  const token = getGitHubToken();
  if (token) {
    durableConfigured = true;
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/public/${name}.json`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      const shaRes = await fetch(url, { headers, cache: "no-store" });
      let sha: string | undefined;
      if (shaRes.ok) {
        const body = await shaRes.json() as { sha: string };
        sha = body.sha;
      }

      const contentB64 = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
      const putRes = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `chore: update ${name} via admin dashboard`,
          content: contentB64,
          sha,
          branch: GH_BRANCH,
        }),
      });

      if (!putRes.ok) {
        const errBody = await putRes.json().catch(() => ({}));
        throw new Error(`GitHub PUT failed for ${name} (${putRes.status}): ${JSON.stringify(errBody)}`);
      }
      durableOk = true;
    } catch (e: unknown) {
      lastDurableError = e;
      console.error(`[remote-storage] GitHub write error for ${name}:`, e);
    }
  }

  // Only surface an error if a durable backend was configured and all failed.
  if (durableConfigured && !durableOk) {
    throw lastDurableError instanceof Error
      ? lastDurableError
      : new Error(`Failed to persist ${name}`);
  }

  // Publish the per-instance fallback only after durable persistence succeeds.
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn(`[remote-storage] /tmp write failed for ${name}:`, e);
  }

}

/**
 * Writes binary/base64 file to:
 * 1. Local /tmp/<name>
 * 2. GitHub API (public/uploads/<name>)
 */
export async function remoteWriteFile(name: string, contentB64: string): Promise<void> {
  const tmpPath = `/tmp/ichattiesburg-${name.replace(/\//g, "-")}`;

  // Try /tmp write
  try {
    writeFileSync(tmpPath, Buffer.from(contentB64, "base64"));
  } catch (e) {
    console.warn(`[remote-storage] /tmp write failed for ${name}:`, e);
  }

  // Try local public folder write (for dev environments)
  try {
    const publicPath = join(process.cwd(), "public", "uploads", name);
    // ensure dir exists
    const dir = join(process.cwd(), "public", "uploads");
    if (!existsSync(dir)) {
      import("fs").then(fs => fs.mkdirSync(dir, { recursive: true }));
    }
    writeFileSync(publicPath, Buffer.from(contentB64, "base64"));
  } catch (e) {}

  const token = getGitHubToken();
  if (token) {
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/public/uploads/${name}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      const shaRes = await fetch(url, { headers, cache: "no-store" });
      let sha: string | undefined;
      if (shaRes.ok) {
        const body = await shaRes.json() as { sha: string };
        sha = body.sha;
      }
      
      const putRes = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `chore: upload ${name} via admin dashboard`,
          content: contentB64,
          sha,
          branch: GH_BRANCH,
        }),
      });
      
      if (!putRes.ok) {
        const errBody = await putRes.json().catch(() => ({}));
        throw new Error(`GitHub PUT failed for ${name} (${putRes.status}): ${JSON.stringify(errBody)}`);
      }
    } catch (e: any) {
      console.error(`[remote-storage] GitHub write error for file ${name}:`, e);
      throw e;
    }
  }
}

