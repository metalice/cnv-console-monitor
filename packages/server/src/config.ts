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
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    jiraWebhookUrl: process.env.SLACK_JIRA_WEBHOOK_URL || '',
    enabled: !!process.env.SLACK_WEBHOOK_URL,
  },

  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'cnv-ui-monitor@redhat.com',
    recipients: (process.env.EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
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
    cron: process.env.CRON_SCHEDULE || '0 7 * * *',
    ackReminderHour: parseInt(process.env.ACK_REMINDER_HOUR || '10', 10),
    timezone: process.env.TZ || 'Asia/Jerusalem',
    pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '15', 10),
    initialLookbackDays: parseInt(process.env.INITIAL_LOOKBACK_DAYS || '180', 10),
  },

  polarion: {
    url: process.env.POLARION_URL || '',
  },

  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT || '8080', 10),
    launchFilter: process.env.LAUNCH_FILTER || 'test-kubevirt-console',
    url: process.env.DASHBOARD_URL || '',
  },

  db: {
    url: process.env.DATABASE_URL || 'postgresql://cnv_monitor:changeme@localhost:5432/cnv_monitor',
  },

  auth: {
    enabled: process.env.AUTH_ENABLED !== 'false',
  },
};

const SETTINGS_MAP: Record<string, (val: string) => void> = {
  'email.recipients': (v) => { config.email.recipients = v.split(',').filter(Boolean); },
  'email.from': (v) => { config.email.from = v; },
  'schedule.ackReminderHour': (v) => { config.schedule.ackReminderHour = parseInt(v, 10); },
  'schedule.pollIntervalMinutes': (v) => { config.schedule.pollIntervalMinutes = parseInt(v, 10); },
  'dashboard.launchFilter': (v) => { config.dashboard.launchFilter = v; },
  'dashboard.url': (v) => { config.dashboard.url = v; },
  'polarion.url': (v) => { config.polarion.url = v; },
  'jira.projectKey': (v) => { config.jira.projectKey = v; },
  'jira.issueType': (v) => { config.jira.issueType = v; },
  'jira.component': () => {},
  'reportportal.token': (v) => { config.reportportal.token = v; },
  'jira.token': (v) => { config.jira.token = v; },
};

export function applySettingsOverrides(dbSettings: Record<string, string>): void {
  for (const [key, value] of Object.entries(dbSettings)) {
    const setter = SETTINGS_MAP[key];
    if (setter) setter(value);
  }
}

export const EDITABLE_KEYS = Object.keys(SETTINGS_MAP);
