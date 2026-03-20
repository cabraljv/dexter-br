import { describe, expect, it } from 'bun:test';
import stockIndicators from './__fixtures__/stock-indicators-petr4.json';
import bankIndicators from './__fixtures__/bank-indicators-bbdc3.json';
import fiiComparator from './__fixtures__/fii-comparator-hglg11.json';
import {
  extractComparatorRow,
  normalizeHistoricalIndicators,
  normalizeSeries,
  normalizeStatementTable,
} from './normalizers.js';

describe('investidor10 normalizers', () => {
  it('normalizes stock indicator fixtures into current values and history', () => {
    const normalized = normalizeHistoricalIndicators(stockIndicators);

    expect(normalized.current.p_l).toBe(5.47);
    expect(normalized.current.dividend_yield_last_12_months).toBe(6.89);
    expect(normalized.indicators.find((item) => item.key === 'p_l')?.history.length).toBe(2);
  });

  it('normalizes bank indicator fixtures the same way', () => {
    const normalized = normalizeHistoricalIndicators(bankIndicators);

    expect(normalized.current.payout).toBeCloseTo(86.89388881151875);
    expect(normalized.indicators.find((item) => item.key === 'payout')?.history[0]?.year).toBe('2025');
  });

  it('extracts the target fii row from the comparator dataset', () => {
    const row = extractComparatorRow(fiiComparator, 'HGLG11');

    expect(row?.title).toBe('HGLG11');
    expect(row?.p_vp).toBe(0.94);
    expect(row?.net_worth).toBe(7056514999);
  });

  it('normalizes simple time-series payloads', () => {
    const points = normalizeSeries([
      { price: 47.39, created_at: '2026-03-19 10:05:00' },
      { price: 46.74, created_at: '2026-03-19 18:00:00' },
    ]);

    expect(points).toEqual([
      { date: '2026-03-19 10:05:00', rawDate: '2026-03-19 10:05:00', value: 47.39 },
      { date: '2026-03-19 18:00:00', rawDate: '2026-03-19 18:00:00', value: 46.74 },
    ]);
  });

  it('normalizes Investidor10 statement tables into periods and metrics', () => {
    const table = normalizeStatementTable([
      ['#', '2025', 'AV %', 'AH %', '2024', 'AV %', 'AH %'],
      ['Receita Líquida - (R$)', ['127,37 Bilhões', '127371000000'], '100,00 %', '4,18 %', ['122,26 Bilhões', '122258000000'], '100,00 %', '7,21 %'],
    ]);

    expect(table.periods).toHaveLength(2);
    expect(table.metrics[0]?.metric).toBe('Receita Líquida - (R$)');
    expect(table.metrics[0]?.values[0]?.value.raw).toBe(127371000000);
  });
});
