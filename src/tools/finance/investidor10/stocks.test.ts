import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { getBrStockQuote } from './stocks.js';

const originalFetch = globalThis.fetch;
const originalBrapiToken = process.env.BRAPI_TOKEN;

describe('investidor10 stock tools', () => {
  beforeEach(() => {
    process.env.BRAPI_TOKEN = 'test-brapi-token';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.BRAPI_TOKEN = originalBrapiToken;
    mock.restore();
  });

  it('falls back to BRAPI when Investidor10 quote fetching fails', async () => {
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('investidor10.com.br/api/quotations/one-day/PETR4/')) {
        return new Response('<html>500</html>', {
          status: 500,
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url.includes('brapi.dev/api/quote/PETR4')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: 'PETR4',
                regularMarketPrice: 47.05,
                regularMarketChangePercent: 1.23,
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      throw new Error(`Unexpected URL in test: ${url}`);
    }) as unknown as typeof fetch;

    const raw = await getBrStockQuote.invoke({ ticker: 'PETR4' });
    const result = JSON.parse(String(raw));

    expect(result.data.provider).toBe('brapi');
    expect(result.data.snapshot.symbol).toBe('PETR4');
    expect(result.sourceUrls[0]).toContain('brapi.dev/api/quote/PETR4');
  });
});
