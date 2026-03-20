import { investidor10Api } from './api.js';
import type { Investidor10ResolvedFii, Investidor10ResolvedStock } from './types.js';

const stockCache = new Map<string, Investidor10ResolvedStock>();
const fiiCache = new Map<string, Investidor10ResolvedFii>();

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function normalizeSlug(ticker: string): string {
  return normalizeTicker(ticker).toLowerCase();
}

function extractMatch(html: string, pattern: RegExp, label: string): string {
  const match = html.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Investidor10 could not resolve ${label} from asset page.`);
  }
  return match[1];
}

function extractOptionalMatch(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match?.[1]?.trim();
}

export async function resolveInvestidor10Stock(ticker: string): Promise<Investidor10ResolvedStock> {
  const normalizedTicker = normalizeTicker(ticker);
  const cached = stockCache.get(normalizedTicker);
  if (cached) {
    return cached;
  }

  const slug = normalizeSlug(normalizedTicker);
  const pagePath = `/acoes/${slug}/`;
  const { data: html, url } = await investidor10Api.getText(pagePath, {
    referer: `${urlOrBase()}/acoes/${slug}/`,
  });

  const resolved: Investidor10ResolvedStock = {
    assetType: 'stock',
    ticker: normalizedTicker,
    slug,
    tickerId: Number(extractMatch(html, /\/api\/historico-indicadores\/(\d+)\/10\?v=2/, 'stock ticker id')),
    companyId: Number(extractMatch(html, /\/api\/balancos\/receitaliquida\/chart\/(\d+)\//, 'stock company id')),
    pageUrl: url,
  };

  stockCache.set(normalizedTicker, resolved);
  return resolved;
}

export async function resolveInvestidor10Fii(ticker: string): Promise<Investidor10ResolvedFii> {
  const normalizedTicker = normalizeTicker(ticker);
  const cached = fiiCache.get(normalizedTicker);
  if (cached) {
    return cached;
  }

  const slug = normalizeSlug(normalizedTicker);
  const pagePath = `/fiis/${slug}/`;
  const { data: html, url } = await investidor10Api.getText(pagePath, {
    referer: `${urlOrBase()}/fiis/${slug}/`,
  });

  const description = extractOptionalMatch(html, /"articleBody":\s*"([^"]+)"/);
  const administrator = extractOptionalMatch(description ?? '', /administrado pelo ([^.]+?)(?:\.|,| e)/i);
  const manager = extractOptionalMatch(description ?? '', /gerid[oa] pela ([^.]+?)(?:\.|,| e)/i);

  const resolved: Investidor10ResolvedFii = {
    assetType: 'fii',
    ticker: normalizedTicker,
    slug,
    fiiId: Number(extractMatch(html, /\/api\/fii\/cotacoes\/chart\/(\d+)\//, 'FII id')),
    pageUrl: url,
    description,
    administrator,
    manager,
  };

  fiiCache.set(normalizedTicker, resolved);
  return resolved;
}

function urlOrBase(): string {
  return process.env.INVESTIDOR10_REFERER_BASE ?? 'https://investidor10.com.br';
}
