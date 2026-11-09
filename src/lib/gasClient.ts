import { CONFIG } from './config';

// In-memory response cache for Google Sheets data (30-60 seconds TTL)
interface CacheEntry {
  data: any;
  timestamp: number;
  hash?: string;
}

const memoryCache = new Map<string, CacheEntry>();

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}

// Sanitize inputs to prevent formula injection when writing to Google Sheets
export function sanitizeForSheet(val: any): any {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (/^[=+@-]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return val;
}

let cachedAdminGasToken: string | null = null;
let adminGasTokenExpiry = 0;

export async function getAdminGasToken(): Promise<string> {
  const now = Date.now();
  if (cachedAdminGasToken && now < adminGasTokenExpiry) {
    return cachedAdminGasToken;
  }

  const res = await callAppsScript('login', {
    role: 'admin',
    username: CONFIG.adminUsername,
    password: CONFIG.adminPassword
  });

  if (res.success && res.data?.token) {
    cachedAdminGasToken = String(res.data.token);
    adminGasTokenExpiry = now + 2 * 60 * 60 * 1000; // Cache 2 hours
    return cachedAdminGasToken;
  }
  return '';
}

export async function callAppsScript(
  action: string,
  payload: Record<string, any> = {},
  options: { useCache?: boolean; cacheKey?: string; retries?: number } = {}
): Promise<{ success: boolean; data?: any; error?: string; cached?: boolean; lastSynced?: string }> {
  const { useCache = false, cacheKey, retries = 2 } = options;
  const now = Date.now();

  // 1. Check in-memory cache if applicable
  if (useCache && cacheKey) {
    const cached = memoryCache.get(cacheKey);
    if (cached && now - cached.timestamp < CONFIG.cacheTtlSeconds * 1000) {
      return {
        success: true,
        data: cached.data,
        cached: true,
        lastSynced: new Date(cached.timestamp).toISOString()
      };
    }
  }

  // 2. Prepare request payload with token
  const requestPayload: Record<string, any> = { ...payload };
  if (!requestPayload.token && action !== 'login') {
    requestPayload.token = await getAdminGasToken();
  }

  let lastError = '';

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

      const requestBody = {
        action,
        sharedSecret: CONFIG.appsScriptSecret,
        ...requestPayload
      };

      const response = await fetch(CONFIG.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // avoids CORS preflight
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('Apps Script returned non-JSON response');
      }

      // Live Apps Script uses both 'ok' and 'success' conventions
      const isSuccess = json.ok === true || json.success === true;

      if (!isSuccess) {
        // If session expired or AUTH error, refresh admin token and retry
        if (action !== 'login' && (json.error === 'AUTH' || json.message?.includes('Session expired'))) {
          cachedAdminGasToken = null;
          requestPayload.token = await getAdminGasToken();
          if (attempt <= retries) {
            continue;
          }
        }

        return {
          success: false,
          error: json.error || json.message || 'Request rejected by Google Apps Script'
        };
      }

      // Save to cache
      if (useCache && cacheKey) {
        memoryCache.set(cacheKey, {
          data: json,
          timestamp: now,
          hash: json.hash
        });
      }

      return {
        success: true,
        data: json,
        lastSynced: new Date(now).toISOString()
      };
    } catch (err: any) {
      lastError = err.name === 'AbortError' ? 'Apps Script cold start / timeout (18s)' : err.message;
      if (attempt <= retries) {
        // Exponential backoff
        await new Promise((res) => setTimeout(res, attempt * 1200));
      }
    }
  }

  return {
    success: false,
    error: `Google Sheets sync failed: ${lastError}`
  };
}
