import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export let startedAt = Date.now();
export let lastPollAt: number | null = null;
export const setLastPollAt = (ts: number): void => { lastPollAt = ts; };

export const config = {
  reportportal: {
    url: process.env.REPORTPORTAL_URL || 'https://reportportal-cnv.apps.dno.ocp-hub.prod.psi.redhat.com',
    token: process.env.REPORTPORTAL_TOKEN || '',
    project: process.env.REPORTPORTAL_PROJECT || 'CNV',
  },

  slack: {
    jiraWebhookUrl: process.env.SLACK_JIRA_WEBHOOK_URL || '',
  },

  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'cnv-ui-monitor@redhat.com',
    enabled: !!process.env.SMTP_HOST,
  },

  jira: {
    url: process.env.JIRA_URL || '',
    token: process.env.JIRA_TOKEN || '',
    projectKey: process.env.JIRA_PROJECT_KEY || 'CNV',
    issueType: process.env.JIRA_ISSUE_TYPE || 'Bug',
    enabled: !!process.env.JIRA_URL,
  },

  schedule: {
    timezone: process.env.TZ || 'Asia/Jerusalem',
    pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '15', 10),
    initialLookbackDays: parseInt(process.env.INITIAL_LOOKBACK_DAYS || '180', 10),
  },

  polarion: {
    url: process.env.POLARION_URL || '',
  },

  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT || '8080', 10),
    url: process.env.DASHBOARD_URL || '',
  },

  db: {
    url: process.env.DATABASE_URL || 'postgresql://cnv_monitor:changeme@localhost:5432/cnv_monitor',
  },

  auth: {
    enabled: !['false', '0', 'no'].includes((process.env.AUTH_ENABLED || '').toLowerCase()),
  },

  admin: {
    secret: process.env.ADMIN_SECRET || '',
  },

  productpages: {
    clientId: process.env.PP_CLIENT_ID || '',
    clientSecret: process.env.PP_CLIENT_SECRET || '',
    enabled: !!(process.env.PP_CLIENT_ID && process.env.PP_CLIENT_SECRET),
  },
};

const SETTINGS_MAP: Record<string, (settingValue: string) => void> = {
  'reportportal.url': (settingValue) => { config.reportportal.url = settingValue; },
  'reportportal.project': (settingValue) => { config.reportportal.project = settingValue; },
  'reportportal.token': (settingValue) => { config.reportportal.token = settingValue; },
  'email.from': (settingValue) => { config.email.from = settingValue; },
  'email.host': (settingValue) => { config.email.host = settingValue; config.email.enabled = !!settingValue; },
  'email.user': (settingValue) => { config.email.user = settingValue; },
  'email.pass': (settingValue) => { config.email.pass = settingValue; },
  'schedule.pollIntervalMinutes': (settingValue) => { config.schedule.pollIntervalMinutes = parseInt(settingValue, 10); },
  'schedule.timezone': (settingValue) => { config.schedule.timezone = settingValue; },
  'schedule.initialLookbackDays': (settingValue) => { config.schedule.initialLookbackDays = parseInt(settingValue, 10); },
  'dashboard.url': (settingValue) => { config.dashboard.url = settingValue; },
  'polarion.url': (settingValue) => { config.polarion.url = settingValue; },
  'jira.url': (settingValue) => { config.jira.url = settingValue; config.jira.enabled = !!settingValue; },
  'jira.projectKey': (settingValue) => { config.jira.projectKey = settingValue; },
  'jira.issueType': (settingValue) => { config.jira.issueType = settingValue; },
  'jira.component': () => {},
  'jira.token': (settingValue) => { config.jira.token = settingValue; },
  'slack.jiraWebhookUrl': (settingValue) => { config.slack.jiraWebhookUrl = settingValue; },
};

export const applySettingsOverrides = (dbSettings: Record<string, string>): void => {
  for (const [key, value] of Object.entries(dbSettings)) {
    const setter = SETTINGS_MAP[key];
    if (setter) setter(value);
  }
}

export const EDITABLE_KEYS = Object.keys(SETTINGS_MAP);
