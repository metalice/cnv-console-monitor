import https from 'https';

import axios from 'axios';

import { config } from '../config';
import { getSetting } from '../db/store';

const TIMEOUT_MS = 10_000;
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

type TokenValidationResult = {
  email?: string;
  username?: string;
};

const validateGitHubToken = async (token: string): Promise<TokenValidationResult> => {
  const res = await axios.get<{ email?: string; login: string }>('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
    timeout: TIMEOUT_MS,
  });
  return { email: res.data.email, username: res.data.login };
};

const validateGitLabToken = async (
  token: string,
  apiBaseUrl?: string,
): Promise<TokenValidationResult> => {
  const baseUrl = apiBaseUrl ?? (await resolveGitLabBaseUrl());
  if (!baseUrl) {
    throw new Error('No GitLab API URL configured.');
  }
  const res = await axios.get<{ email?: string; username: string }>(`${baseUrl}/user`, {
    headers: { 'Private-Token': token },
    httpsAgent,
    timeout: TIMEOUT_MS,
  });
  return { email: res.data.email, username: res.data.username };
};

const validateJiraToken = async (token: string): Promise<TokenValidationResult> => {
  const jiraUrl = (await getSetting('jira.url')) || config.jira.url;
  const jiraEmail = (await getSetting('jira.email')) || config.jira.email;
  if (!jiraUrl) {
    throw new Error('Jira URL is not configured in the server settings.');
  }
  const credentials = Buffer.from(`${jiraEmail}:${token}`).toString('base64');
  const res = await axios.get<{
    displayName?: string;
    emailAddress?: string;
    name?: string;
  }>(`${jiraUrl}/rest/api/3/myself`, {
    headers: { Accept: 'application/json', Authorization: `Basic ${credentials}` },
    timeout: TIMEOUT_MS,
  });
  return {
    email: res.data.emailAddress,
    username: res.data.displayName ?? res.data.name ?? '',
  };
};

export const validateToken = async (
  provider: string,
  token: string,
  apiBaseUrl?: string,
): Promise<TokenValidationResult> => {
  if (provider === 'github') return validateGitHubToken(token);
  if (provider === 'gitlab') return validateGitLabToken(token, apiBaseUrl);
  if (provider === 'jira') return validateJiraToken(token);
  throw new Error(`Unknown provider: ${provider}`);
};

const resolveGitLabBaseUrl = async (): Promise<string | null> => {
  const { getAllRepositories } = await import('../db/store');
  const repos = await getAllRepositories();
  const gitlabRepo = repos.find(repo => repo.provider === 'gitlab');
  return gitlabRepo?.api_base_url ?? null;
};
