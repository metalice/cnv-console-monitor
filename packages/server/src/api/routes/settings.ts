import { Router, Request, Response, NextFunction } from 'express';
import { config, applySettingsOverrides, EDITABLE_KEYS, startedAt, lastPollAt } from '../../config';
import { getAllSettings, setSetting } from '../../db/store';
import { buildDailyReport } from '../../analyzer';
import { sendEmailReport } from '../../notifiers/email';
import { sendSlackReport } from '../../notifiers/slack';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbSettings = await getAllSettings();

    const editableSettings: Record<string, { value: string; source: 'db' | 'env' }> = {};
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

export default router;
