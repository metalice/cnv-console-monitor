import axios from 'axios';

import type { MilestoneType, ReleaseInfo, ReleaseMilestone } from '@cnv-monitor/shared';

import { config } from '../config';
import { logger } from '../logger';
import { withRetry } from '../utils/retry';

const log = logger.child({ module: 'Smartsheet' });
const API_BASE = 'https://api.smartsheet.com/2.0';

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedReleases: ReleaseInfo[] | null = null;
let cacheTimestamp = 0;

type SmartsheetCell = {
  columnId: number;
  value?: string | number | boolean | null;
  displayValue?: string | null;
};

type SmartsheetRow = {
  id: number;
  cells: SmartsheetCell[];
};

type SmartsheetColumn = {
  id: number;
  title: string;
  type: string;
};

type SmartsheetSheet = {
  id: number;
  name: string;
  columns: SmartsheetColumn[];
  rows: SmartsheetRow[];
};

type SheetSummary = {
  id: number;
  name: string;
};

const authHeaders = () => ({
  Authorization: `Bearer ${config.smartsheet.token}`,
});

const extractVersion = (sheetName: string): string | null => {
  const match = /cnv-(\d+\.\d+)/.exec(sheetName);
  return match ? match[1] : null;
};

const classifyTask = (taskName: string): MilestoneType | null => {
  const lower = taskName.toLowerCase();
  if (lower.includes('(ff)')) {
    return 'feature_freeze';
  }
  if (lower.includes('(cf)')) {
    return 'code_freeze';
  }
  if (lower.includes('(bo)')) {
    return 'blockers_only';
  }
  if (/\bga\b/.test(lower) && lower.includes('cnv-') && !lower.includes('batch')) {
    return 'ga';
  }
  if (lower.includes('batch') && lower.includes('ga')) {
    return 'batch';
  }
  if (lower.includes('kubevirt') && lower.includes('code freeze')) {
    return 'custom';
  }
  return null;
};

const derivePhase = (milestones: ReleaseMilestone[], today: Date): string => {
  const findDate = (type: MilestoneType) =>
    milestones.find(milestone => milestone.type === type)?.date;

  const gaDate = findDate('ga');
  const ffDate = findDate('feature_freeze');
  const boDate = findDate('blockers_only');
  const cfDate = findDate('code_freeze');

  const todayStr = today.toISOString().split('T')[0];
  const hasUpcoming = milestones.some(milestone => !milestone.isPast);

  if (cfDate && todayStr >= cfDate && (!gaDate || todayStr < gaDate)) {
    return 'Code Freeze';
  }
  if (boDate && todayStr >= boDate && (!cfDate || todayStr < cfDate)) {
    return 'Blockers Only';
  }
  if (ffDate && todayStr >= ffDate && (!boDate || todayStr < boDate)) {
    return 'Feature Freeze';
  }
  if (ffDate && todayStr < ffDate) {
    return 'Development';
  }
  if (gaDate && todayStr >= gaDate && hasUpcoming) {
    return 'Maintenance';
  }
  if (gaDate && todayStr >= gaDate) {
    return 'GA';
  }
  if (!gaDate && !ffDate && milestones.some(milestone => milestone.isPast) && hasUpcoming) {
    return 'Maintenance';
  }
  if (!gaDate && !ffDate && milestones.some(milestone => milestone.isPast)) {
    return 'GA';
  }
  return 'Planning';
};

const fetchSmartsheetList = async (): Promise<SheetSummary[]> => {
  const response = await withRetry(
    () =>
      axios.get(`${API_BASE}/sheets`, {
        headers: authHeaders(),
        params: { includeAll: true },
        timeout: 10_000,
      }),
    'smartsheet.listSheets',
    { maxRetries: 2 },
  );

  const sheets = (response.data as { data: SheetSummary[] }).data;
  return sheets.filter(sheet => /^cnv-\d+\.\d+/.test(sheet.name));
};

const fetchSheet = async (sheetId: number): Promise<SmartsheetSheet> => {
  const response = await withRetry(
    () =>
      axios.get(`${API_BASE}/sheets/${sheetId}`, {
        headers: authHeaders(),
        timeout: 15_000,
      }),
    `smartsheet.fetchSheet.${sheetId}`,
    { maxRetries: 2 },
  );
  return response.data as SmartsheetSheet;
};

const parseSheetToRelease = (sheet: SmartsheetSheet): ReleaseInfo | null => {
  const version = extractVersion(sheet.name);
  if (!version) {
    return null;
  }

  const taskCol = sheet.columns.find(col => col.title === 'Task Name');
  const startCol = sheet.columns.find(col => col.title === 'Start');
  const finishCol = sheet.columns.find(col => col.title === 'Finish');
  const flagsCol = sheet.columns.find(col => col.title === 'Flags');

  if (!taskCol || !startCol) {
    log.warn({ sheet: sheet.name }, 'Missing expected columns');
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const milestones: ReleaseMilestone[] = [];
  let versionStart: string | null = null;
  let versionEnd: string | null = null;
  // eslint-disable-next-line security/detect-non-literal-regexp -- version is from sheet name, safe bounded input
  const versionPattern = new RegExp(`^cnv-${version.replace('.', '\\.')}(\\.\\d)?$`);

  for (const row of sheet.rows) {
    const cellMap = new Map<number, string | null>();
    for (const cell of row.cells) {
      const val = cell.displayValue ?? (cell.value != null ? String(cell.value) : null);
      cellMap.set(cell.columnId, val);
    }

    const taskName = cellMap.get(taskCol.id) ?? '';
    const startRaw = cellMap.get(startCol.id);
    const finishRaw = finishCol ? cellMap.get(finishCol.id) : null;
    const flagsRaw = cellMap.get(flagsCol?.id ?? 0) ?? '';

    if (!taskName.trim()) {
      continue;
    }

    const startDate = startRaw?.slice(0, 10) ?? null;
    const finishDate = finishRaw?.slice(0, 10) ?? null;

    if (versionPattern.test(taskName.trim()) && startDate) {
      versionStart = startDate;
      versionEnd = finishDate ?? startDate;
      continue;
    }

    const milestoneType = classifyTask(taskName);
    if (!milestoneType || !startDate) {
      continue;
    }

    const flags = flagsRaw
      .replace(/^Flags:\s*/i, '')
      .split(',')
      .map(flag => flag.trim())
      .filter(Boolean);

    if (flags.includes('pp-skip') || flags.includes('draft')) {
      continue;
    }

    milestones.push({
      date: startDate,
      isPast: new Date(startDate).getTime() <= todayTime,
      name: taskName.trim(),
      source: 'smartsheet' as ReleaseMilestone['source'],
      type: milestoneType,
    });
  }

  milestones.sort(
    (milestoneA, milestoneB) =>
      new Date(milestoneA.date).getTime() - new Date(milestoneB.date).getTime(),
  );

  const gaDateMilestone = milestones.find(
    milestone => milestone.type === 'ga' && milestone.name.toLowerCase().includes(`cnv-${version}`),
  );
  const gaDate = gaDateMilestone?.date ?? null;

  const gaTasks = milestones.filter(
    milestone => milestone.type === 'ga' || milestone.type === 'batch',
  );
  const pastGaTasks = gaTasks.filter(task => task.isPast);
  const futureGaTasks = gaTasks.filter(task => !task.isPast);

  const lastReleased = pastGaTasks.length > 0 ? pastGaTasks[pastGaTasks.length - 1] : null;
  const nextRelease = futureGaTasks.length > 0 ? futureGaTasks[0] : null;

  // eslint-disable-next-line security/detect-unsafe-regex -- bounded input from internal sheet data
  const zMatch = lastReleased?.name.match(/(\d{1,20}\.\d{1,20}(?:\.\d{1,20})?)/);
  const currentZStream = zMatch ? zMatch[1] : null;

  const daysUntilNext = nextRelease
    ? Math.round((new Date(nextRelease.date).getTime() - todayTime) / (1000 * 60 * 60 * 24))
    : null;

  const daysSinceLastRelease = lastReleased
    ? Math.round((todayTime - new Date(lastReleased.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    currentZStream,
    currentZStreamDate: lastReleased?.date ?? null,
    daysSinceLastRelease,
    daysUntilNext,
    endDate: versionEnd,
    gaDate,
    milestones,
    name: `CNV ${version}`,
    nextRelease: nextRelease ? { date: nextRelease.date, name: nextRelease.name } : null,
    phase: derivePhase(milestones, today),
    shortname: `cnv-${version}`,
    startDate: versionStart,
  };
};

export const fetchSmartsheetReleases = async (): Promise<ReleaseInfo[]> => {
  if (!config.smartsheet.enabled) {
    log.debug('Smartsheet not configured, skipping');
    return [];
  }

  if (cachedReleases && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedReleases;
  }

  try {
    const sheets = await fetchSmartsheetList();
    log.info({ count: sheets.length }, 'Fetched Smartsheet sheet list');

    const releases: ReleaseInfo[] = [];
    for (const summary of sheets) {
      try {
        // eslint-disable-next-line no-await-in-loop -- rate-limit safe: max ~12 sequential calls
        const sheet = await fetchSheet(summary.id);
        const release = parseSheetToRelease(sheet);
        if (release) {
          releases.push(release);
        }
      } catch (err) {
        log.warn({ err, sheet: summary.name }, 'Failed to parse sheet');
      }
    }

    releases.sort((releaseA, releaseB) => {
      const dateA = releaseA.gaDate ? new Date(releaseA.gaDate).getTime() : Infinity;
      const dateB = releaseB.gaDate ? new Date(releaseB.gaDate).getTime() : Infinity;
      return dateB - dateA;
    });

    cachedReleases = releases;
    cacheTimestamp = Date.now();
    log.info({ count: releases.length }, 'Smartsheet releases cached');

    return releases;
  } catch (err) {
    log.warn({ err }, 'Failed to fetch Smartsheet releases');
    if (cachedReleases) {
      log.info('Returning stale cached releases');
      return cachedReleases;
    }
    return [];
  }
};

export const clearSmartsheetCache = (): void => {
  cachedReleases = null;
  cacheTimestamp = 0;
};

export const testSmartsheetConnection = async (): Promise<{
  connected: boolean;
  sheetCount: number;
  error?: string;
}> => {
  try {
    const sheets = await fetchSmartsheetList();
    return { connected: true, sheetCount: sheets.length };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Connection failed',
      sheetCount: 0,
    };
  }
};
