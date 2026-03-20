# Investidor10 API Endpoint Discovery Report

**Date:** 2026-03-19
**Target:** investidor10.com.br
**Stack:** Laravel (PHP 8.2.30), Livewire, Cloudflare

---

## Infrastructure Findings

| Endpoint | Status | Notes |
|---|---|---|
| `/horizon/` | **403** | Laravel Horizon (Redis queue dashboard) is exposed but access-restricted |
| `/sanctum/csrf-cookie/` | **204** | Laravel Sanctum active — SPA-style auth |
| `/api/admin/login/` | **302** → `/api/mafmi10/login` | Admin panel exists (obfuscated path) |
| `/api/admin/dashboard/` | **302** | Admin dashboard behind auth |
| `/api/admin/users/` | **302** | Admin users management |
| `/api/admin/settings/` | **302** | Admin settings |
| `/livewire/message/` | exists | Livewire component messaging |
| `robots.txt` | Disallows `/admin/`, `/api/`, `/google/`, `/click/`, `/carteira/`, `/carteiras/`, `*/aggregate*` |

---

## Public Data Endpoints (no auth required)

### Stocks (Ações) — ID-based (e.g., 32 = BBDC3)
| Endpoint | Method | Response |
|---|---|---|
| `/api/cotacoes/acao/chart/{TICKER}/{days}/{adjustPayments}` | GET | Price chart data |
| `/api/quotations/one-day/{TICKER}/` | GET | Intraday quotes |
| `/api/quotations/seven-days/{TICKER}/` | GET | 7-day quotes |
| `/api/cotacao-lucro/{ticker}/` | GET | Price vs earnings by year (JSON) |
| `/api/balancos/receitaliquida/chart/{id}/{days}/{param}/` | GET | Net revenue chart |
| `/api/balancos/ativospassivos/chart/{id}/{days}/` | GET | Assets vs liabilities |
| `/api/balancos/balancopatrimonial/chart/{id}/{bool}/` | GET | Balance sheet |
| `/api/balancos/balancoresultados/chart/{id}/{count}/{period}/` | GET | Income statement (yearly/quarterly) |
| `/api/balancos/indice-basileia-chart/{id}/{days}/?v=4` | GET | Basel index chart |
| `/api/balancos/historico/` | GET | Balance history modal data |
| `/api/acoes/dividends-map` | GET | Full dividends map (all stocks with upcoming dividends!) |
| `/api/acoes/payout-chart/{id}/` | GET | Payout ratio chart |
| `/api/dividend-yield/chart/{id}/{days}/` | GET | DY chart |
| `/api/dividendos/chart/{id}/{days}/` | GET | Dividends chart |
| `/api/historico-indicadores/{id}/` | GET | Historical indicators |
| `/api/historico-indicadores/{id}/{years}/` | GET | Historical indicators (limited) |

### FIIs (Fundos Imobiliários) — ID-based (e.g., 24 = HGLG11)
| Endpoint | Method | Response |
|---|---|---|
| `/api/fii/cotacoes/chart/{id}/{days}/` | GET | FII price chart |
| `/api/fii/dividend-yield/chart/{id}/{days}/` | GET | FII DY chart |
| `/api/fii/dividendos/chart/{id}/{days}/` | GET | FII dividends chart |
| `/api/fii/valor-patrimonial/chart/{id}/` | GET | FII book value chart |
| `/api/fii/historico-taxa-vacancia/{id}/` | GET | FII vacancy rate |
| `/api/fii/comparador/table/{id}/all/` | GET | **FII comparator (returns ALL FIIs data!)** |
| `/api/fii/comparador/table/{id}/segment_type/` | GET | FII comparator by segment type |
| `/api/fii/comparador/table/{id}/segment/` | GET | FII comparator by segment |
| `/api/fii/comparador/table/{id}/type/` | GET | FII comparator by type |
| `/api/avaliar-fii/` | POST? | Rate a FII |
| `/api/seguir-fii/` | POST? | Follow a FII |

### BDRs — ID-based (e.g., 2 = AAPL34)
| Endpoint | Method | Response |
|---|---|---|
| `/api/bdr/cotacoes/chart/{id}/{days}/` | GET | BDR price chart |
| `/api/bdr/dividend-yield/chart/{id}/{days}/` | GET | BDR DY chart |
| `/api/bdr/dividendos/chart/{id}/{days}/` | GET | BDR dividends chart |
| `/api/bdr/historico-indicadores/{id}/` | GET | BDR historical indicators |
| `/api/bdr/historico-indicadores/{id}/{years}/` | GET | BDR historical indicators (limited) |
| `/api/bdr/seguir/{id}/` | POST? | Follow a BDR |
| `/api/bdr/avaliar/` | POST? | Rate a BDR |

### US Stocks — ID-based (e.g., 2 = AAPL)
| Endpoint | Method | Response |
|---|---|---|
| `/api/stock/cotacoes/chart/{id}/{days}/` | GET | Stock price chart |
| `/api/stock/dividend-yield/chart/{id}/{days}/` | GET | Stock DY chart |
| `/api/stock/dividendos/chart/{id}/{days}/` | GET | Stock dividends chart |
| `/api/stock/historico-indicadores/{id}/` | GET | Stock historical indicators |
| `/api/stock/historico-indicadores/{id}/{years}/` | GET | Stock historical indicators (limited) |
| `/api/stock/seguir/{id}/` | POST? | Follow a stock |
| `/api/stock/avaliar/` | POST? | Rate a stock |

### International Financials — ID-based
| Endpoint | Method | Response |
|---|---|---|
| `/api/international/balancos/balanco-patrimonial/table/{id}/` | GET | Intl balance sheet |
| `/api/international/balancos/balancoresultados/chart/{id}/` | GET | Intl income statement |
| `/api/international/balancos/receitaliquida/chart/{id}/` | GET | Intl net revenue |
| `/api/international/balancos/historico/` | GET | Intl balance history |
| `/api/international/cotacao-lucro/{id}/` | GET | Intl price vs earnings |
| `/api/international/evolucao-patrimonial/chart/{id}/` | GET | Intl equity evolution |
| `/api/international/fluxo-caixa/table/{id}/` | GET | Intl cash flow |

### ETFs — ID-based (e.g., 9 = BOVA11)
| Endpoint | Method | Response |
|---|---|---|
| `/api/etfs/cotacoes/chart/{id}/{days}/` | GET | ETF price chart |

### Crypto
| Endpoint | Method | Response |
|---|---|---|
| `/api/criptomoedas/cotacoes/{id}/` | GET | Crypto quotes |
| `/api/criptomoedas/get-select/` | GET | Crypto selector list |

### Commodities / Indices
| Endpoint | Method | Response |
|---|---|---|
| `/api/commodities/cotacoes/` | GET | Commodities quotes |
| `/api/quotations/one-day-commodity/` | GET | 1-day commodity quote |
| `/api/quotations/seven-days-commodity/` | GET | 7-day commodity quote |
| `/api/indices/` | GET | Market indices |

### Search & Content
| Endpoint | Method | Response |
|---|---|---|
| `/api/search/?q={query}` | GET | **Universal search (returns tickers, prices, variations)** |
| `/api/searchquery/?q={query}` | GET | Search query (returns array) |
| `/api/search-news/` | GET/POST | News search (422 without params) |
| `/api/lista-comentarios/` | GET | **All comments (270KB+!)** |
| `/api/lista-comentarios/{id}/` | GET | Comments for specific content |
| `/api/like-comentario/` | POST? | Like a comment |
| `/api/responder-comentario/` | POST? | Reply to a comment |
| `/api/criar-discussao/` | POST? | Create a discussion |
| `/api/component-list/layout.search.result-item` | GET | Layout component |

### Shareholdings
| Endpoint | Method | Response |
|---|---|---|
| `/api/company-shareholding/list/` | GET | Company shareholding list |
| `/api/stock-shareholding/list/` | GET | Stock shareholding list |

---

## Authenticated Endpoints (401 without auth)

| Endpoint | Status | Notes |
|---|---|---|
| `/api/user/` | 401 | User profile |
| `/api/user/me/` | 401 | Current user info |
| `/api/chat-ai/` | 200 | AI chat (empty without auth) |
| `/api/chat-ai/history` | ? | AI chat history |
| `/api/chat-ai/question` | POST? | Ask AI a question |
| `/api/notification/change-read-status` | POST? | Mark notifications read |
| `/api/login/` | POST | Login endpoint |
| `/api/register-client/` | POST | Registration |
| `/api/recuperar-senha-v2/` | POST | Password recovery |
| `/api/contato/` | POST | Contact form |
| `/api/google/onetap/callback/` | POST | Google One Tap auth callback |
| `/api/bdr/seguir/` | POST? | Follow BDR (auth required) |
| `/api/stock/seguir/` | POST? | Follow stock (auth required) |

---

## Notable Security Observations

1. **Laravel Horizon exposed** (`/horizon/` → 403) — queue dashboard is reachable, just auth-gated
2. **Admin panel discoverable** — `/api/admin/*` redirects reveal the obfuscated admin path `/api/mafmi10/login`
3. **Sanctum CSRF cookie** available at `/sanctum/csrf-cookie/` — confirms SPA auth pattern
4. **Mass data endpoints** — `/api/lista-comentarios/` returns ~270KB of all comments; `/api/fii/comparador/table/{id}/all/` returns all FII data
5. **No rate limiting observed** on public data endpoints
6. **PHP version exposed** — `X-Powered-By: PHP/8.2.30` header
7. **IDOR potential** — Most endpoints use sequential numeric IDs (1, 2, 24, 32...) for companies
8. **`/api/acoes/dividends-map`** — Returns a full map of all dividends across all stocks
9. **Aggregate paths** blocked by robots.txt (`*/aggregate*`) — suggests aggregation endpoints exist

---

## Recommended Next Steps

- Enumerate company IDs (1-1000+) to map ID → ticker for all asset types
- Fuzz `/api/mafmi10/` admin sub-paths
- Test POST endpoints with CSRF tokens for write operations
- Check for IDOR on authenticated endpoints (e.g., `/api/user/{id}`)
- Test aggregate endpoints that robots.txt tries to hide
- Explore Livewire components for additional server-side actions
