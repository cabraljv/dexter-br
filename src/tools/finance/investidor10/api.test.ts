import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  buildInvestidor10Headers,
  hasInvestidor10Auth,
  investidor10Api,
  requireInvestidor10Auth,
  sanitizeInvestidor10ErrorMessage,
} from './api.js';

const originalEnv = {
  cookie: process.env.INVESTIDOR10_COOKIE,
  csrf: process.env.INVESTIDOR10_CSRF_TOKEN,
  userAgent: process.env.INVESTIDOR10_USER_AGENT,
  refererBase: process.env.INVESTIDOR10_REFERER_BASE,
};

function restoreEnv(name: keyof typeof originalEnv, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name === 'cookie'
      ? 'INVESTIDOR10_COOKIE'
      : name === 'csrf'
        ? 'INVESTIDOR10_CSRF_TOKEN'
        : name === 'userAgent'
          ? 'INVESTIDOR10_USER_AGENT'
          : 'INVESTIDOR10_REFERER_BASE'];
    return;
  }

  process.env[name === 'cookie'
    ? 'INVESTIDOR10_COOKIE'
    : name === 'csrf'
      ? 'INVESTIDOR10_CSRF_TOKEN'
      : name === 'userAgent'
        ? 'INVESTIDOR10_USER_AGENT'
        : 'INVESTIDOR10_REFERER_BASE'] = value;
}

describe('investidor10 api client', () => {
  beforeEach(() => {
    delete process.env.INVESTIDOR10_COOKIE;
    delete process.env.INVESTIDOR10_CSRF_TOKEN;
    delete process.env.INVESTIDOR10_USER_AGENT;
    delete process.env.INVESTIDOR10_REFERER_BASE;
  });

  afterEach(() => {
    restoreEnv('cookie', originalEnv.cookie);
    restoreEnv('csrf', originalEnv.csrf);
    restoreEnv('userAgent', originalEnv.userAgent);
    restoreEnv('refererBase', originalEnv.refererBase);
    mock.restore();
  });

  it('detects missing auth and throws a clear error when auth is required', () => {
    expect(hasInvestidor10Auth()).toBe(false);
    expect(() => requireInvestidor10Auth()).toThrow(
      'Investidor10 authentication is not configured. Set INVESTIDOR10_COOKIE and INVESTIDOR10_CSRF_TOKEN.'
    );
  });

  it('builds structured headers and preserves optional user-agent', () => {
    process.env.INVESTIDOR10_COOKIE = 'session-cookie';
    process.env.INVESTIDOR10_CSRF_TOKEN = 'csrf-token';
    process.env.INVESTIDOR10_USER_AGENT = 'dexter-test';
    process.env.INVESTIDOR10_REFERER_BASE = 'https://investidor10.com.br';

    const headers = buildInvestidor10Headers({ requireAuth: true }) as Record<string, string>;

    expect(headers.cookie).toBe('session-cookie');
    expect(headers['x-csrf-token']).toBe('csrf-token');
    expect(headers['user-agent']).toBe('dexter-test');
    expect(headers.referer).toBe('https://investidor10.com.br');
    expect(headers['x-requested-with']).toBe('XMLHttpRequest');
  });

  it('redacts secrets from error messages', () => {
    process.env.INVESTIDOR10_COOKIE = 'secret-cookie';
    process.env.INVESTIDOR10_CSRF_TOKEN = 'secret-csrf';

    const sanitized = sanitizeInvestidor10ErrorMessage(
      'cookie=secret-cookie x-csrf-token: secret-csrf'
    );

    expect(sanitized).not.toContain('secret-cookie');
    expect(sanitized).not.toContain('secret-csrf');
    expect(sanitized).toContain('[REDACTED]');
  });

  it('converts 401 responses into a provider-specific auth error', async () => {
    process.env.INVESTIDOR10_COOKIE = 'session-cookie';
    process.env.INVESTIDOR10_CSRF_TOKEN = 'csrf-token';

    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ message: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    await expect(investidor10Api.getJson('/api/user/', { requireAuth: true })).rejects.toThrow(
      'Investidor10 authentication failed (401).'
    );
  });
});
