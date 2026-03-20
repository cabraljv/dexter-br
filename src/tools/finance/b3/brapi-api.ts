import { logger } from '../../../utils/logger.js';

const BASE_URL = 'https://brapi.dev/api';

function getToken(): string {
  return process.env.BRAPI_TOKEN ?? '';
}

export const brapiApi = {
  async get(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<{ data: Record<string, unknown>; url: string }> {
    const token = getToken();
    const url = new URL(`${BASE_URL}${endpoint}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const urlStr = url.toString();
    const label = endpoint;

    let response: Response;
    try {
      response = await fetch(urlStr, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[brapi.dev] network error: ${label} — ${message}`);
      throw new Error(`[brapi.dev] request failed for ${label}: ${message}`);
    }

    if (!response.ok) {
      const detail = `${response.status} ${response.statusText}`;
      logger.error(`[brapi.dev] error: ${label} — ${detail}`);
      throw new Error(`[brapi.dev] request failed: ${detail}`);
    }

    const data = await response.json().catch(() => {
      throw new Error(`[brapi.dev] invalid JSON response for ${label}`);
    });

    return { data: data as Record<string, unknown>, url: urlStr };
  },
};
