import { logger } from '../../../utils/logger.js';

const BASE_URL = 'https://investidor10.com.br';
const DEFAULT_TIMEOUT_MS = 15_000;

const SECRET_ENV_VARS = [
  'INVESTIDOR10_COOKIE',
  'INVESTIDOR10_CSRF_TOKEN',
] as const;

export interface Investidor10RequestOptions {
  body?: string;
  method?: 'GET' | 'POST';
  referer?: string;
  requireAuth?: boolean;
  timeoutMs?: number;
}

function redactValue(text: string, value: string | undefined): string {
  if (!value) {
    return text;
  }
  return text.split(value).join('[REDACTED]');
}

export function sanitizeInvestidor10ErrorMessage(message: string): string {
  let sanitized = message;

  for (const envVar of SECRET_ENV_VARS) {
    sanitized = redactValue(sanitized, process.env[envVar]);
  }

  sanitized = sanitized.replace(/(cookie=)[^;]+/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/(x-csrf-token[:=]\s*)[^\s]+/gi, '$1[REDACTED]');

  return sanitized;
}

export function hasInvestidor10Auth(): boolean {
  return Boolean(process.env.INVESTIDOR10_COOKIE && process.env.INVESTIDOR10_CSRF_TOKEN);
}

export function requireInvestidor10Auth(): void {
  if (hasInvestidor10Auth()) {
    return;
  }

  throw new Error(
    'Investidor10 authentication is not configured. Set INVESTIDOR10_COOKIE and INVESTIDOR10_CSRF_TOKEN.'
  );
}

export function buildInvestidor10Headers(
  options: Pick<Investidor10RequestOptions, 'referer' | 'requireAuth'> = {},
): HeadersInit {
  const headers: Record<string, string> = {
    accept: 'application/json, text/javascript, */*; q=0.01',
    'x-requested-with': 'XMLHttpRequest',
    referer: options.referer ?? process.env.INVESTIDOR10_REFERER_BASE ?? BASE_URL,
  };

  if (process.env.INVESTIDOR10_USER_AGENT) {
    headers['user-agent'] = process.env.INVESTIDOR10_USER_AGENT;
  }

  if (options.requireAuth) {
    requireInvestidor10Auth();
  }

  if (process.env.INVESTIDOR10_COOKIE) {
    headers.cookie = process.env.INVESTIDOR10_COOKIE;
  }

  if (process.env.INVESTIDOR10_CSRF_TOKEN) {
    headers['x-csrf-token'] = process.env.INVESTIDOR10_CSRF_TOKEN;
  }

  return headers;
}

async function parseResponse(response: Response, path: string): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (!response.ok) {
    const detail = sanitizeInvestidor10ErrorMessage(text.slice(0, 200).trim());
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Investidor10 authentication failed (${response.status}).`);
    }
    throw new Error(
      `[Investidor10] request failed for ${path}: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`
    );
  }

  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`[Investidor10] invalid JSON response for ${path}`);
    }
  }

  if (text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html')) {
    throw new Error(`[Investidor10] expected JSON but received HTML for ${path}`);
  }

  return text;
}

async function request(path: string, options: Investidor10RequestOptions = {}): Promise<{ data: unknown; url: string }> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      body: options.body,
      headers: buildInvestidor10Headers({
        referer: options.referer,
        requireAuth: options.requireAuth,
      }),
      signal: controller.signal,
    });

    const data = await parseResponse(response, path);
    return { data, url };
  } catch (error) {
    const message = sanitizeInvestidor10ErrorMessage(
      error instanceof Error ? error.message : String(error),
    );
    logger.error(`[Investidor10] request error: ${path} — ${message}`);
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }
}

export const investidor10Api = {
  getJson: async (
    path: string,
    options?: Investidor10RequestOptions,
  ): Promise<{ data: unknown; url: string }> => {
    const result = await request(path, options);
    if (typeof result.data === 'string') {
      throw new Error(`[Investidor10] expected JSON but received text for ${path}`);
    }
    return result;
  },

  getText: async (
    path: string,
    options?: Investidor10RequestOptions,
  ): Promise<{ data: string; url: string }> => {
    const result = await request(path, options);
    if (typeof result.data !== 'string') {
      throw new Error(`[Investidor10] expected text but received JSON for ${path}`);
    }
    return { data: result.data, url: result.url };
  },
};
