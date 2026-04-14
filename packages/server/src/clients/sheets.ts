import axios from 'axios';

import { type SpreadsheetRow, type VersionTab } from '@cnv-monitor/shared';

import { getSetting } from '../db/store/settings';
import { logger } from '../logger';

const log = logger.child({ module: 'WeeklyReport:Sheets' });

const TIMEOUT_MS = 15_000;

const getConfig = async (): Promise<{ apiKey: string; spreadsheetId: string } | null> => {
  const apiKey = await getSetting('weekly.sheets.apiKey');
  const spreadsheetId = await getSetting('weekly.sheets.spreadsheetId');
  if (!apiKey) {
    log.debug('Google Sheets API key not configured, skipping');
    return null;
  }
  return { apiKey, spreadsheetId: spreadsheetId ?? '' };
};

const baseUrl = (spreadsheetId: string): string =>
  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

export const fetchVersionTabs = async (): Promise<VersionTab[]> => {
  const cfg = await getConfig();
  if (!cfg) return [];

  const response = await axios.get<{
    sheets: { properties: { sheetId: number; title: string } }[];
  }>(baseUrl(cfg.spreadsheetId), {
    params: { fields: 'sheets.properties(sheetId,title)', key: cfg.apiKey },
    timeout: TIMEOUT_MS,
  });

  const tabs: VersionTab[] = response.data.sheets.map(sheet => {
    const versionMatch = /^(\d+\.\d+)/.exec(sheet.properties.title);
    return {
      name: sheet.properties.title,
      sheetId: sheet.properties.sheetId,
      version: versionMatch?.[1] ?? null,
    };
  });

  log.info({ count: tabs.length }, 'Fetched Sheets version tabs');
  return tabs;
};

export const fetchSheetRows = async (tabName: string): Promise<SpreadsheetRow[]> => {
  const cfg = await getConfig();
  if (!cfg) return [];

  const range = encodeURIComponent(tabName);
  const response = await axios.get<{ values?: string[][] }>(
    `${baseUrl(cfg.spreadsheetId)}/values/${range}`,
    { params: { key: cfg.apiKey }, timeout: TIMEOUT_MS },
  );

  const rawRows = response.data.values ?? [];
  if (rawRows.length < 2) return [];

  const headers = rawRows[0].map(header => header.toLowerCase().trim());
  const featureIdx = headers.findIndex(h => h.includes('feature'));
  const jiraIdx = headers.findIndex(h => h.includes('jira') || h.includes('ticket'));
  const statusIdx = headers.findIndex(h => h.includes('status'));
  const assigneeIdx = headers.findIndex(h => h.includes('assignee') || h.includes('owner'));
  const notesIdx = headers.findIndex(h => h.includes('note'));

  const rows: SpreadsheetRow[] = rawRows.slice(1).map(row => ({
    assignee: assigneeIdx >= 0 ? (row[assigneeIdx] ?? null) : null,
    feature: featureIdx >= 0 ? (row[featureIdx] ?? null) : null,
    jiraKey: jiraIdx >= 0 ? extractJiraKey(row[jiraIdx]) : null,
    notes: notesIdx >= 0 ? (row[notesIdx] ?? null) : null,
    status: statusIdx >= 0 ? (row[statusIdx] ?? null) : null,
    version: /^(\d+\.\d+)/.exec(tabName)?.[1] ?? null,
  }));

  log.info({ count: rows.length, tab: tabName }, 'Fetched Sheets rows');
  return rows;
};

const JIRA_KEY_REGEX = /[A-Z]+-\d+/;

const extractJiraKey = (cell: string | undefined): string | null => {
  if (!cell) return null;
  const match = JIRA_KEY_REGEX.exec(cell);
  return match?.[0] ?? null;
};

export const isSheetsConfigured = async (): Promise<boolean> => {
  const apiKey = await getSetting('weekly.sheets.apiKey');
  return Boolean(apiKey);
};
