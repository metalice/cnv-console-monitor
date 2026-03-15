import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { config } from '../config';

export interface RPLaunch {
  id: number;
  uuid: string;
  name: string;
  number: number;
  status: string;
  description?: string;
  startTime: number;
  endTime?: number;
  lastModified?: number;
  approximateDuration?: number;
  statistics: {
    executions: { total?: number; passed?: number; failed?: number; skipped?: number };
    defects?: Record<string, Record<string, number>>;
  };
  attributes: Array<{ key?: string; value: string }>;
}

export interface RPTestItem {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  status: string;
  type: string;
  startTime: number;
  endTime?: number;
  attributes: Array<{ key?: string; value: string }>;
  issue?: {
    issueType: string;
    comment?: string;
    autoAnalyzed?: boolean;
    externalSystemIssues?: Array<{ url?: string; ticketId?: string }>;
  };
  statistics?: {
    executions: Record<string, number>;
    defects?: Record<string, Record<string, number>>;
  };
  uniqueId?: string;
  testCaseHash?: number;
}

export interface RPDefectType {
  locator: string;
  typeRef: string;
  longName: string;
  shortName: string;
  color: string;
}

export interface RPLogEntry {
  id: number;
  message: string;
  level: string;
  time: number;
  binaryContent?: { id: string; contentType: string };
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export const createRPClient = (): AxiosInstance => {
  return axios.create({
    baseURL: `${config.reportportal.url}/api/v1/${config.reportportal.project}`,
    headers: {
      Authorization: `Bearer ${config.reportportal.token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    httpsAgent,
  });
}
