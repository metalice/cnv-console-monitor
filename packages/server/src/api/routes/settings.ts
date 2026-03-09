import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import https from 'https';
import { config, applySettingsOverrides, EDITABLE_KEYS, startedAt, lastPollAt } from '../../config';
import { getAllSettings, setSetting } from '../../db/store';
import { buildDailyReport } from '../../analyzer';
import { sendEmailReport } from '../../notifiers/email';
import { sendSlackReport } from '../../notifiers/slack';
import { logger } from '../../logger';

const log = logger.child({ module: 'Settings' });
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbSettings = await getAllSettings();

    const editableSettings: Record<string, { value: string; source: 'db' | 'env' }> = {};
    const maskToken = (t: string) => t ? `${t.substring(0, 8)}...${t.substring(t.length - 4)}` : '';

    const configValues: Record<string, string> = {
      'email.recipients': config.email.recipients.join(','),
      'email.from': config.email.from,
      'schedule.ackReminderHour': String(config.schedule.ackReminderHour),
      'schedule.pollIntervalMinutes': String(config.schedule.pollIntervalMinutes),
      'dashboard.launchFilter': config.dashboard.launchFilter,
      'dashboard.url': config.dashboard.url,
      'polarion.url': config.polarion.url,
      'jira.projectKey': config.jira.projectKey,
      'jira.issueType': config.jira.issueType,
      'jira.component': dbSettings['jira.component'] || 'CNV User Interface',
      'reportportal.token': maskToken(config.reportportal.token),
      'jira.token': maskToken(config.jira.token),
      'slack.webhookUrl': maskToken(config.slack.webhookUrl),
      'slack.jiraWebhookUrl': maskToken(config.slack.jiraWebhookUrl),
    };

    for (const key of EDITABLE_KEYS) {
      editableSettings[key] = {
        value: configValues[key] ?? dbSettings[key] ?? '',
        source: dbSettings[key] !== undefined ? 'db' : 'env',
      };
    }

    res.json({
      settings: editableSettings,
      system: {
        reportportalUrl: config.reportportal.url,
        reportportalProject: config.reportportal.project,
        authEnabled: config.auth.enabled,
        emailEnabled: config.email.enabled,
        slackEnabled: config.slack.enabled,
        jiraEnabled: config.jira.enabled,
        uptime: Math.round((Date.now() - startedAt) / 1000),
        lastPollAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = req.body as Record<string, string>;
    const updatedBy = req.user?.email || 'unknown';

    for (const [key, value] of Object.entries(updates)) {
      if (!EDITABLE_KEYS.includes(key)) {
        res.status(400).json({ error: `Setting '${key}' is not editable` });
        return;
      }
      await setSetting(key, value, updatedBy);
    }

    const dbSettings = await getAllSettings();
    applySettingsOverrides(dbSettings);

    res.json({ success: true, updated: Object.keys(updates) });
  } catch (err) {
    next(err);
  }
});

router.post('/test-email', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.email.enabled) {
      res.status(400).json({ error: 'Email not configured. SMTP_HOST not set.' });
      return;
    }
    if (config.email.recipients.length === 0) {
      res.status(400).json({ error: 'No email recipients configured.' });
      return;
    }

    const report = await buildDailyReport(24);
    await sendEmailReport(report);

    res.json({ success: true, message: `Test email sent to ${config.email.recipients.join(', ')}` });
  } catch (err) {
    next(err);
  }
});

router.post('/test-slack', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.slack.enabled) {
      res.status(400).json({ error: 'Slack not configured. SLACK_WEBHOOK_URL not set.' });
      return;
    }

    const report = await buildDailyReport(24);
    await sendSlackReport(report);

    res.json({ success: true, message: 'Test Slack notification sent' });
  } catch (err) {
    next(err);
  }
});

router.get('/launch-names', async (_req: Request, res: Response) => {
  try {
    const client = axios.create({
      baseURL: `${config.reportportal.url}/api/v1/${config.reportportal.project}`,
      headers: { Authorization: `Bearer ${config.reportportal.token}` },
      timeout: 15000,
      httpsAgent,
    });
    const response = await client.get('/launch/names');
    const names: string[] = response.data?.content || response.data || [];
    res.json(names.sort());
  } catch (err) {
    log.warn({ err }, 'Failed to fetch launch names');
    res.json([]);
  }
});

router.get('/jira-meta', async (_req: Request, res: Response) => {
  if (!config.jira.enabled) {
    res.json({ projects: [], issueTypes: [], components: [] });
    return;
  }

  try {
    const client = axios.create({
      baseURL: `${config.jira.url}/rest/api/2`,
      headers: { Authorization: `Bearer ${config.jira.token}` },
      timeout: 15000,
      httpsAgent,
    });

    const [projectRes, issueTypeRes, componentRes] = await Promise.allSettled([
      client.get(`/project/${config.jira.projectKey}`),
      client.get('/issuetype'),
      client.get(`/project/${config.jira.projectKey}/components`),
    ]);

    const projects = projectRes.status === 'fulfilled' ? [projectRes.value.data.key] : [config.jira.projectKey];

    const issueTypes = issueTypeRes.status === 'fulfilled'
      ? (issueTypeRes.value.data as Array<{ name: string }>)
          .map(t => t.name)
          .filter(n => !n.toLowerCase().includes('sub-task'))
      : ['Bug', 'Task', 'Story'];

    const components = componentRes.status === 'fulfilled'
      ? (componentRes.value.data as Array<{ name: string }>).map(c => c.name).sort()
      : [];

    res.json({ projects, issueTypes, components });
  } catch (err) {
    log.warn({ err }, 'Failed to fetch Jira metadata');
    res.json({ projects: [config.jira.projectKey], issueTypes: ['Bug'], components: [] });
  }
});

export default router;
