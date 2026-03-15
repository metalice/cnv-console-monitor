import axios from 'axios';
import https from 'https';
import { config } from '../../config';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const JIRA_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

export const isValidJiraKey = (key: string): boolean => {
  return JIRA_KEY_PATTERN.test(key) && key.length <= 30;
}

export const createJiraClient = () => {
  return axios.create({
    baseURL: `${config.jira.url}/rest/api/2`,
    headers: { Authorization: `Bearer ${config.jira.token}`, 'Content-Type': 'application/json' },
    timeout: 15000,
    httpsAgent,
  });
}

export const sanitizeJql = (s: string): string => {
  return s.replace(/["\\\n\r{}()\[\]]/g, '').substring(0, 100);
}
