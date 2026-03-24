import axios, { type AxiosInstance } from 'axios';

import { config } from '../config';

const buildAuthHeader = (email?: string, token?: string): string => {
  const jiraEmail = email || config.jira.email;
  const jiraToken = token || config.jira.token;
  if (jiraEmail) {
    const encoded = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    return `Basic ${encoded}`;
  }
  return `Bearer ${jiraToken}`;
};

export const createJiraClient = (overrides?: {
  url?: string;
  token?: string;
  email?: string;
}): AxiosInstance => {
  const baseUrl = overrides?.url || config.jira.url;
  const authHeader = buildAuthHeader(overrides?.email, overrides?.token);

  return axios.create({
    baseURL: `${baseUrl}/rest/api/latest`,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
};
