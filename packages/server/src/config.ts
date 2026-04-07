import path from 'path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const startedAt = Date.now();
export let lastPollAt: number | null = null;
export const setLastPollAt = (timestamp: number): void => {
  lastPollAt = timestamp;
};

export const config = {
  admin: {
    secret: process.env.ADMIN_SECRET || '',
  },

  auth: {
    enabled: !['false', '0', 'no'].includes((process.env.AUTH_ENABLED || '').toLowerCase()),
  },

  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT || '8080', 10),
    url: process.env.DASHBOARD_URL || '',
  },

  db: {
    url: process.env.DATABASE_URL || 'postgresql://cnv_monitor:changeme@localhost:5432/cnv_monitor',
  },

  email: {
    enabled: Boolean(process.env.SMTP_HOST),
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'cnv-ui-monitor@redhat.com',
    host: process.env.SMTP_HOST || '',
    pass: process.env.SMTP_PASS || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
  },

  jenkins: {
    token: process.env.JENKINS_TOKEN || '',
    user: process.env.JENKINS_USER || '',
  },

  jira: {
    email: process.env.JIRA_EMAIL || '',
    enabled: Boolean(process.env.JIRA_URL),
    issueType: process.env.JIRA_ISSUE_TYPE || 'Bug',
    projectKey: process.env.JIRA_PROJECT_KEY || 'CNV',
    token: process.env.JIRA_TOKEN || '',
    url: process.env.JIRA_URL || '',
  },

  polarion: {
    url: process.env.POLARION_URL || '',
  },

  productpages: {
    clientId: process.env.PP_CLIENT_ID || '',
    clientSecret: process.env.PP_CLIENT_SECRET || '',
    enabled: Boolean(process.env.PP_CLIENT_ID && process.env.PP_CLIENT_SECRET),
  },

  reportportal: {
    project: process.env.REPORTPORTAL_PROJECT || 'CNV',
    token: process.env.REPORTPORTAL_TOKEN || '',
    url:
      process.env.REPORTPORTAL_URL ||
      'https://reportportal-cnv.apps.dno.ocp-hub.prod.psi.redhat.com',
  },

  schedule: {
    initialLookbackDays: 180,
    jenkinsConcurrency: 20,
    pollIntervalMinutes: 15,
    reminderDays: process.env.ACK_REMINDER_DAYS || '1,2,3,4,5',
    reminderTime: process.env.ACK_REMINDER_TIME || '10:00',
    rpConcurrency: 20,
    rpPageSize: 100,
    timezone: process.env.TZ || 'Asia/Jerusalem',
  },

  slack: {
    jiraWebhookUrl: process.env.SLACK_JIRA_WEBHOOK_URL || '',
  },

  smartsheet: {
    enabled: Boolean(process.env.SMARTSHEET_TOKEN),
    token: process.env.SMARTSHEET_TOKEN || '',
  },
};

const SETTINGS_MAP = {
  'dashboard.url': settingValue => {
    config.dashboard.url = settingValue;
  },
  'email.from': settingValue => {
    config.email.from = settingValue;
  },
  'email.host': settingValue => {
    config.email.host = settingValue;
    config.email.enabled = Boolean(settingValue);
  },
  'email.pass': settingValue => {
    config.email.pass = settingValue;
  },
  'email.port': settingValue => {
    config.email.port = parseInt(settingValue, 10);
  },
  'email.user': settingValue => {
    config.email.user = settingValue;
  },
  'github.token': () => {
    // no-op
  },
  'gitlab.token': () => {
    // no-op
  },
  'jenkins.token': settingValue => {
    config.jenkins.token = settingValue;
  },
  'jenkins.user': settingValue => {
    config.jenkins.user = settingValue;
  },
  'jira.component': () => {
    // no-op
  },
  'jira.email': settingValue => {
    config.jira.email = settingValue;
  },
  'jira.issueType': settingValue => {
    config.jira.issueType = settingValue;
  },
  'jira.projectKey': settingValue => {
    config.jira.projectKey = settingValue;
  },
  'jira.token': settingValue => {
    config.jira.token = settingValue;
  },
  'jira.url': settingValue => {
    config.jira.url = settingValue;
    config.jira.enabled = Boolean(settingValue);
  },
  'polarion.url': settingValue => {
    config.polarion.url = settingValue;
  },
  'reportportal.project': settingValue => {
    config.reportportal.project = settingValue;
  },
  'reportportal.token': settingValue => {
    config.reportportal.token = settingValue;
  },
  'reportportal.url': settingValue => {
    config.reportportal.url = settingValue;
  },
  'schedule.initialLookbackDays': settingValue => {
    config.schedule.initialLookbackDays = parseInt(settingValue, 10);
  },
  'schedule.jenkinsConcurrency': settingValue => {
    config.schedule.jenkinsConcurrency = Math.max(
      1,
      Math.min(100, parseInt(settingValue, 10) || 20),
    );
  },
  'schedule.pollIntervalMinutes': settingValue => {
    config.schedule.pollIntervalMinutes = parseInt(settingValue, 10);
  },
  'schedule.reminderDays': settingValue => {
    config.schedule.reminderDays = settingValue;
  },
  'schedule.reminderTime': settingValue => {
    config.schedule.reminderTime = settingValue;
  },
  'schedule.rpConcurrency': settingValue => {
    config.schedule.rpConcurrency = Math.max(1, Math.min(100, parseInt(settingValue, 10) || 20));
  },
  'schedule.rpPageSize': settingValue => {
    config.schedule.rpPageSize = Math.max(10, Math.min(1000, parseInt(settingValue, 10) || 100));
  },
  'schedule.timezone': settingValue => {
    config.schedule.timezone = settingValue;
  },
  'slack.jiraWebhookUrl': settingValue => {
    config.slack.jiraWebhookUrl = settingValue;
  },
  'smartsheet.token': settingValue => {
    config.smartsheet.token = settingValue;
    config.smartsheet.enabled = Boolean(settingValue);
  },
} satisfies Record<string, (settingValue: string) => void>;

export const applySettingsOverrides = (dbSettings: Record<string, string>): void => {
  for (const [key, value] of Object.entries(dbSettings)) {
    if (!Object.hasOwn(SETTINGS_MAP, key)) {
      continue;
    }
    SETTINGS_MAP[key as keyof typeof SETTINGS_MAP](value);
  }
};

export const EDITABLE_KEYS = Object.keys(SETTINGS_MAP);
