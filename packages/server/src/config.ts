import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export let startedAt = Date.now();
export let lastPollAt: number | null = null;
export function setLastPollAt(ts: number): void { lastPollAt = ts; }

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

const SETTINGS_MAP: Record<string, (val: string) => void> = {
  'reportportal.url': (v) => { config.reportportal.url = v; },
  'reportportal.project': (v) => { config.reportportal.project = v; },
  'reportportal.token': (v) => { config.reportportal.token = v; },
  'email.from': (v) => { config.email.from = v; },
  'email.host': (v) => { config.email.host = v; config.email.enabled = !!v; },
  'email.user': (v) => { config.email.user = v; },
  'email.pass': (v) => { config.email.pass = v; },
  'schedule.pollIntervalMinutes': (v) => { config.schedule.pollIntervalMinutes = parseInt(v, 10); },
  'schedule.timezone': (v) => { config.schedule.timezone = v; },
  'schedule.initialLookbackDays': (v) => { config.schedule.initialLookbackDays = parseInt(v, 10); },
  'dashboard.url': (v) => { config.dashboard.url = v; },
  'polarion.url': (v) => { config.polarion.url = v; },
  'jira.url': (v) => { config.jira.url = v; config.jira.enabled = !!v; },
  'jira.projectKey': (v) => { config.jira.projectKey = v; },
  'jira.issueType': (v) => { config.jira.issueType = v; },
  'jira.component': () => {},
  'jira.token': (v) => { config.jira.token = v; },
  'slack.jiraWebhookUrl': (v) => { config.slack.jiraWebhookUrl = v; },
};

export function applySettingsOverrides(dbSettings: Record<string, string>): void {
  for (const [key, value] of Object.entries(dbSettings)) {
    const setter = SETTINGS_MAP[key];
    if (setter) setter(value);
  }
}

export const EDITABLE_KEYS = Object.keys(SETTINGS_MAP);
