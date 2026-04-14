import https from 'https';

import axios, { type AxiosInstance } from 'axios';

import { config } from '../config';

export type RPLaunch = {
  id: number;
  uuid: string;
  name: string;
  number: number;
  status: string;
  description?: string;
  startTime: number | string;
  endTime?: number | string;
  lastModified?: number | string;
  approximateDuration?: number;
  statistics: {
    executions: { total?: number; passed?: number; failed?: number; skipped?: number };
    defects?: Record<string, Record<string, number>>;
  };
  attributes: { key?: string; value: string }[];
};

export type RPTestItem = {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  status: string;
  type: string;
  startTime: number | string;
  endTime?: number | string;
  attributes: { key?: string; value: string }[];
  issue?: {
    issueType: string;
    comment?: string;
    autoAnalyzed?: boolean;
    externalSystemIssues?: { url?: string; ticketId?: string }[];
  };
  statistics?: {
    executions: Record<string, number>;
    defects?: Record<string, Record<string, number>>;
  };
  uniqueId?: string;
  testCaseHash?: number;
};

export type RPDefectType = {
  locator: string;
  typeRef: string;
  longName: string;
  shortName: string;
  color: string;
};

export type RPLogEntry = {
  id: number;
  message: string;
  level: string;
  time: number;
  binaryContent?: { id: string; contentType: string };
};

/** RP may return epoch ms (number) or ISO-8601 strings — normalize to epoch ms. */
export const toEpochMs = (value: number | string): number => {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Cannot parse RP timestamp: ${value}`);
  }
  return parsed;
};

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export const createRPClient = (): AxiosInstance =>
  axios.create({
    baseURL: `${config.reportportal.url}/api/v1/${config.reportportal.project}`,
    headers: {
      Authorization: `Bearer ${config.reportportal.token}`,
      'Content-Type': 'application/json',
    },
    httpsAgent,
    timeout: 30000,
  });
