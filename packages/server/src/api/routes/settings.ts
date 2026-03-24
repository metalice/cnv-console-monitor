import { type NextFunction, type Request, type Response, Router } from 'express';

import { applySettingsOverrides, config, EDITABLE_KEYS, lastPollAt, startedAt } from '../../config';
import { deleteSetting, getAllSettings, getSettingsLog, setSetting } from '../../db/store';
import { requireAdmin } from '../middleware/auth';

import settingsMetaRouter from './settings-meta';
import settingsTestRouter from './settings-test';

const router = Router();

router.use(settingsTestRouter);
router.use(settingsMetaRouter);

router.get('/', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbSettings = await getAllSettings();

    const editableSettings: Record<string, { value: string; source: 'db' | 'env' }> = {};
    const maskToken = (t: string) => (t ? `••••${t.substring(t.length - 4)}` : '');

    const configValues: Record<string, string> = {
      'dashboard.url': config.dashboard.url,
      'email.from': config.email.from,
      'email.host': config.email.host,
      'email.pass': config.email.pass ? '••••••' : '',
      'email.port': String(config.email.port),
      'email.user': config.email.user,
      'jenkins.token': maskToken(config.jenkins.token),
      'jenkins.user': config.jenkins.user,
      'jira.component': dbSettings['jira.component'] || 'CNV User Interface',
      'jira.email': config.jira.email,
      'jira.issueType': config.jira.issueType,
      'jira.projectKey': config.jira.projectKey,
      'jira.token': maskToken(config.jira.token),
      'jira.url': config.jira.url,
      'polarion.url': config.polarion.url,
      'reportportal.project': config.reportportal.project,
      'reportportal.token': maskToken(config.reportportal.token),
      'reportportal.url': config.reportportal.url,
      'schedule.initialLookbackDays': String(config.schedule.initialLookbackDays),
      'schedule.jenkinsConcurrency': String(config.schedule.jenkinsConcurrency),
      'schedule.pollIntervalMinutes': String(config.schedule.pollIntervalMinutes),
      'schedule.reminderDays': config.schedule.reminderDays,
      'schedule.reminderTime': config.schedule.reminderTime,
      'schedule.rpConcurrency': String(config.schedule.rpConcurrency),
      'schedule.rpPageSize': String(config.schedule.rpPageSize),
      'schedule.timezone': config.schedule.timezone,
      'slack.jiraWebhookUrl': maskToken(config.slack.jiraWebhookUrl),
    };

    for (const key of EDITABLE_KEYS) {
      editableSettings[key] = {
        source: dbSettings[key] !== undefined ? 'db' : 'env',
        value: configValues[key] ?? dbSettings[key] ?? '',
      };
    }

    res.json({
      settings: editableSettings,
      system: {
        authEnabled: config.auth.enabled,
        emailEnabled: config.email.enabled,
        jiraEnabled: config.jira.enabled,
        lastPollAt,
        reportportalProject: config.reportportal.project,
        reportportalUrl: config.reportportal.url,
        slackEnabled: Boolean(config.slack.jiraWebhookUrl),
        uptime: Math.round((Date.now() - startedAt) / 1000),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

router.get('/changelog', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await getSettingsLog(100);
    res.json(log);
  } catch (err) {
    next(err);
  }
});

router.post('/reset', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbSettings = await getAllSettings();
    for (const key of Object.keys(dbSettings)) {
      await deleteSetting(key);
    }
    applySettingsOverrides({});
    res.json({ cleared: Object.keys(dbSettings).length, success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
