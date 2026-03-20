import type {
  NormalizedCurrencySeries,
  NormalizedIndicatorSeries,
  NormalizedTimeSeriesPoint,
} from './types.js';

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const direct = Number(value);
    if (Number.isFinite(direct)) {
      return direct;
    }

    const cleaned = value.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function normalizeSeries(
  rows: unknown,
  valueKey = 'price',
  dateKey = 'created_at',
): NormalizedTimeSeriesPoint[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      const item = row as Record<string, unknown>;
      const rawDate = typeof item[dateKey] === 'string' ? item[dateKey] : '';
      return {
        date: rawDate,
        rawDate,
        value: parseNumber(item[valueKey]),
      };
    })
    .filter((row) => row.rawDate);
}

export function normalizeCurrencySeriesMap(
  payload: Record<string, unknown>,
): NormalizedCurrencySeries[] {
  return Object.entries(payload)
    .filter(([, value]) => Array.isArray(value))
    .map(([currency, value]) => ({
      currency,
      points: normalizeSeries(value),
    }))
    .filter((series) => series.points.length > 0);
}

export function summarizeIntradaySeries(series: NormalizedTimeSeriesPoint[]) {
  const first = series.find((item) => item.value !== null);
  const last = [...series].reverse().find((item) => item.value !== null);
  const values = series.map((item) => item.value).filter((value): value is number => value !== null);

  if (!first || !last || values.length === 0) {
    return {
      open: null,
      high: null,
      low: null,
      close: null,
      change: null,
      changePercent: null,
    };
  }

  const open = first.value;
  const close = last.value;
  const change = close - open;

  return {
    open,
    high: Math.max(...values),
    low: Math.min(...values),
    close,
    change,
    changePercent: open === 0 ? null : (change / open) * 100,
  };
}

export function normalizeHistoricalIndicators(
  payload: Record<string, unknown>,
): {
  current: Record<string, number | null>;
  indicators: NormalizedIndicatorSeries[];
} {
  const current: Record<string, number | null> = {};
  const indicators: NormalizedIndicatorSeries[] = [];

  for (const [label, value] of Object.entries(payload)) {
    if (!Array.isArray(value) || value.length === 0) {
      continue;
    }

    const rows = value as Array<Record<string, unknown>>;
    const currentRow = rows.find((row) => row.year === 'Atual') ?? rows[0];
    const key =
      (typeof currentRow.key === 'string' && currentRow.key) ||
      label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const currentValue = parseNumber(currentRow.value);

    current[key] = currentValue;
    indicators.push({
      key,
      label,
      type: typeof currentRow.type === 'string' ? currentRow.type : null,
      currentValue,
      history: rows
        .filter((row) => row.year !== 'Atual')
        .map((row) => ({
          year: String(row.year ?? ''),
          value: parseNumber(row.value),
          type: typeof row.type === 'string' ? row.type : null,
          label,
          description: typeof row.description === 'string' ? row.description : undefined,
        })),
    });
  }

  return { current, indicators };
}

export function normalizeStatementTable(table: unknown) {
  if (!Array.isArray(table) || table.length === 0 || !Array.isArray(table[0])) {
    return { periods: [], metrics: [], raw: table };
  }

  const header = table[0] as unknown[];
  const periods = [];
  for (let index = 1; index < header.length; index += 3) {
    periods.push({
      period: String(header[index] ?? ''),
      avLabel: String(header[index + 1] ?? ''),
      ahLabel: String(header[index + 2] ?? ''),
    });
  }

  const metrics = (table as unknown[][])
    .slice(1)
    .map((row) => {
      const name = String(row[0] ?? '');
      const values = [];

      for (let index = 1; index < row.length; index += 3) {
        const rawValue = row[index];
        const normalizedValue =
          Array.isArray(rawValue) && rawValue.length >= 2
            ? {
                display: String(rawValue[0] ?? ''),
                raw: parseNumber(rawValue[1]),
              }
            : {
                display: String(rawValue ?? ''),
                raw: parseNumber(rawValue),
              };

        values.push({
          period: periods[Math.floor((index - 1) / 3)]?.period ?? '',
          value: normalizedValue,
          av: String(row[index + 1] ?? ''),
          ah: String(row[index + 2] ?? ''),
        });
      }

      return { metric: name, values };
    })
    .filter((metric) => metric.metric);

  return { periods, metrics, raw: table };
}

export function extractComparatorRow(
  payload: unknown,
  ticker: string,
): Record<string, unknown> | null {
  const data = payload && typeof payload === 'object' ? (payload as { data?: unknown[] }).data : null;
  if (!Array.isArray(data)) {
    return null;
  }

  const normalizedTicker = ticker.trim().toUpperCase();
  return (
    data.find((row) => {
      const record = row as Record<string, unknown>;
      return typeof record.title === 'string' && record.title.toUpperCase() === normalizedTicker;
    }) as Record<string, unknown> | undefined
  ) ?? null;
}

export function parseDividendMapRow(
  dividendsMap: unknown,
  ticker: string,
): {
  ticker: string;
  companyName?: string;
  monthlyProbabilities: Array<{ month: number; probability: number }>;
  rawRowHtml?: string;
} | null {
  const html =
    dividendsMap && typeof dividendsMap === 'object'
      ? (dividendsMap as { dividendsTable?: string }).dividendsTable
      : null;

  if (typeof html !== 'string') {
    return null;
  }

  const normalizedTicker = ticker.trim().toUpperCase();
  const rowPattern = new RegExp(`<tr class="tr">[\\s\\S]*?ticker-name">${normalizedTicker}<\\/div>[\\s\\S]*?<\\/tr>`);
  const rowMatch = html.match(rowPattern);
  if (!rowMatch?.[0]) {
    return null;
  }

  const rowHtml = rowMatch[0];
  const companyName = rowHtml.match(/company-name">([^<]+)</)?.[1]?.trim();
  const monthlyProbabilities = [...rowHtml.matchAll(/id="month-(\d+)">[\s\S]*?<h5>(\d+)%<\/h5>/g)].map(
    (match) => ({
      month: Number(match[1]),
      probability: Number(match[2]),
    }),
  );

  return {
    ticker: normalizedTicker,
    companyName,
    monthlyProbabilities,
    rawRowHtml: rowHtml,
  };
}
