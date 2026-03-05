import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const config = {
  reportportal: {
    url: process.env.REPORTPORTAL_URL || 'https://reportportal-cnv.apps.dno.ocp-hub.prod.psi.redhat.com',
    token: process.env.REPORTPORTAL_TOKEN || '',
    project: process.env.REPORTPORTAL_PROJECT || 'CNV',
  },

  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    enabled: !!process.env.SLACK_WEBHOOK_URL,
  },

  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'cnv-console-monitor@redhat.com',
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

  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT || '8080', 10),
    launchFilter: process.env.LAUNCH_FILTER || 'test-kubevirt-console',
  },

  db: {
    url: process.env.DATABASE_URL || 'postgresql://cnv_monitor:changeme@localhost:5432/cnv_monitor',
  },
};
