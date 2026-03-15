import type { VersionTrendPoint, HeatmapCell, AIPredictionAccuracy } from '@cnv-monitor/shared';

export const VERSION_COLORS = ['#0066CC', '#C9190B', '#F0AB00', '#3E8635', '#6753AC', '#009596', '#EC7A08', '#B8BBBE'];

export type VersionGroups = {
  versions: string[];
  dates: string[];
  byVersion: Map<string, Map<string, number>>;
};

export const buildVersionGroups = (data: VersionTrendPoint[] | undefined): VersionGroups => {
  if (!data) return { versions: [], dates: [], byVersion: new Map() };
  const versions = [...new Set(data.map(point => point.version))].sort();
  const dates = [...new Set(data.map(point => point.date))].sort();
  const byVersion = new Map<string, Map<string, number>>();
  for (const version of versions) byVersion.set(version, new Map());
  for (const point of data) {
    byVersion.get(point.version)?.set(point.date, point.rate);
  }
  return { versions, dates, byVersion };
}

export type HeatmapData = {
  tests: Array<{ unique_id: string; name: string; fail_count: number }>;
  dates: string[];
  cellMap: Map<string, string>;
};

export const buildHeatmap = (data: HeatmapCell[] | undefined): HeatmapData | null => {
  if (!data || data.length === 0) return null;
  const tests: HeatmapData['tests'] = [];
  const seen = new Set<string>();
  const dates = [...new Set(data.map(cell => cell.date))].sort();
  const cellMap = new Map<string, string>();

  for (const cell of data) {
    if (!seen.has(cell.unique_id)) {
      seen.add(cell.unique_id);
      tests.push({ unique_id: cell.unique_id, name: cell.name, fail_count: cell.fail_count });
    }
    cellMap.set(`${cell.unique_id}|${cell.date}`, cell.status);
  }

  return { tests, dates, cellMap };
}

export type AIMatrix = {
  predictions: string[];
  actuals: string[];
  matrix: Map<string, Map<string, number>>;
  totals: Map<string, number>;
  accuracies: Array<{ prediction: string; accuracy: number }>;
};

export const buildAIMatrix = (data: AIPredictionAccuracy[] | undefined): AIMatrix | null => {
  if (!data || data.length === 0) return null;
  const predictions = [...new Set(data.map(item => item.prediction))];
  const actuals = [...new Set(data.map(item => item.actual))];
  const matrix = new Map<string, Map<string, number>>();
  const totals = new Map<string, number>();
  for (const prediction of predictions) { matrix.set(prediction, new Map()); totals.set(prediction, 0); }
  for (const entry of data) {
    matrix.get(entry.prediction)?.set(entry.actual, entry.count);
    totals.set(entry.prediction, (totals.get(entry.prediction) || 0) + entry.count);
  }
  const accuracies = predictions.map(prediction => {
    const shortPrediction = prediction.replace('Predicted ', '');
    const correct = matrix.get(prediction)?.get(shortPrediction) || 0;
    const total = totals.get(prediction) || 1;
    return { prediction, accuracy: Math.round((correct / total) * 100) };
  });
  return { predictions, actuals, matrix, totals, accuracies };
}

export const heatmapCellColor = (status: string | undefined): string => {
  if (status === 'FAILED') return '#e74c3c';
  if (status === 'PASSED') return '#2ecc71';
  return '#d2d2d2';
};

export const heatmapCellLabel = (status: string | undefined): string => {
  if (status === 'FAILED') return 'Failed';
  if (status === 'PASSED') return 'Passed';
  return 'No run';
};

export const rateColor = (rate: number, thresholds: [number, number] = [80, 50]): 'green' | 'orange' | 'red' => {
  if (rate > thresholds[0]) return 'green';
  if (rate > thresholds[1]) return 'orange';
  return 'red';
};

export type VersionHealth = {
  best: { version: string; rate: number } | null;
  worst: { version: string; rate: number } | null;
};

export const computeVersionHealth = (data: VersionTrendPoint[] | undefined): VersionHealth => {
  if (!data || data.length === 0) return { best: null, worst: null };
  const versionRates = new Map<string, number[]>();
  for (const point of data) {
    if (!versionRates.has(point.version)) versionRates.set(point.version, []);
    versionRates.get(point.version)!.push(point.rate);
  }
  let best: VersionHealth['best'] = null;
  let worst: VersionHealth['worst'] = null;
  for (const [version, rates] of versionRates) {
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    if (!best || avg > best.rate) best = { version, rate: Math.round(avg * 10) / 10 };
    if (!worst || avg < worst.rate) worst = { version, rate: Math.round(avg * 10) / 10 };
  }
  return { best, worst };
}

export type SummaryStats = { overallRate: number; totalLaunches: number; totalTests: number } | null;

export const computeSummaryStats = (trends: { total: number; passed: number }[] | undefined): SummaryStats => {
  if (!trends || trends.length === 0) return null;
  const totalLaunches = trends.reduce((sum, trend) => sum + trend.total, 0);
  const totalPassed = trends.reduce((sum, trend) => sum + trend.passed, 0);
  const overallRate = totalLaunches > 0 ? Math.round((totalPassed / totalLaunches) * 1000) / 10 : 0;
  return { overallRate, totalLaunches, totalTests: totalPassed };
}
