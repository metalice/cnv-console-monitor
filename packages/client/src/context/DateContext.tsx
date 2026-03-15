import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type LookbackMode = '24h' | '48h' | '7d' | '1m' | '3m' | '6m' | 'range';

export const LOOKBACK_HOURS: Record<Exclude<LookbackMode, 'range'>, number> = {
  '24h': 24,
  '48h': 48,
  '7d': 168,
  '1m': 730,
  '3m': 2190,
  '6m': 4380,
};

type DateContextValue = {
  dateFrom: string;
  dateTo: string;
  lookbackMode: LookbackMode;
  setDateFrom: (date: string) => void;
  setDateTo: (date: string) => void;
  setLookbackMode: (mode: LookbackMode) => void;
  setCustomRange: (from: string, to: string) => void;
  isRangeMode: boolean;
  since: number;
  until: number;
  displayLabel: string;
};

const todayStr = (): string =>
  new Date().toISOString().split('T')[0];

const toDateStr = (ts: number): string =>
  new Date(ts).toISOString().split('T')[0];

const startOfDay = (dateStr: string): number =>
  new Date(dateStr + 'T00:00:00').getTime();

const endOfDay = (dateStr: string): number =>
  startOfDay(dateStr) + 24 * 60 * 60 * 1000;

const DateContext = createContext<DateContextValue | null>(null);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [lookbackMode, setLookbackModeRaw] = useState<LookbackMode>('24h');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (lookbackMode === 'range') return;
    const timer = setInterval(() => setTick(prev => prev + 1), 60_000);
    return () => clearInterval(timer);
  }, [lookbackMode]);

  const setLookbackMode = useCallback((mode: LookbackMode) => {
    setLookbackModeRaw(mode);
    if (mode !== 'range') {
      const hours = LOOKBACK_HOURS[mode];
      const now = Date.now();
      setDateFrom(toDateStr(now - hours * 60 * 60 * 1000));
      setDateTo(todayStr());
    }
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setLookbackModeRaw('range');
  }, []);

  const value = useMemo((): DateContextValue => {
    const isRangeMode = lookbackMode === 'range';

    let since: number;
    let until: number;

    if (isRangeMode) {
      since = startOfDay(dateFrom);
      until = Math.min(endOfDay(dateTo), Date.now());
    } else {
      const hours = LOOKBACK_HOURS[lookbackMode];
      until = Date.now();
      since = until - hours * 60 * 60 * 1000;
    }

    let displayLabel: string;
    if (isRangeMode) {
      displayLabel = dateFrom === dateTo ? dateFrom : `${dateFrom} — ${dateTo}`;
    } else {
      displayLabel = lookbackMode;
    }

    return {
      dateFrom,
      dateTo,
      lookbackMode,
      setDateFrom,
      setDateTo,
      setLookbackMode,
      setCustomRange,
      isRangeMode,
      since,
      until,
      displayLabel,
    };
  }, [dateFrom, dateTo, lookbackMode, setLookbackMode, setCustomRange, tick]);

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};

export const useDate = (): DateContextValue => {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error('useDate must be used within DateProvider');
  return ctx;
};
