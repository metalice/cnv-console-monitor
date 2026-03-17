import { Router, Request, Response, NextFunction } from 'express';
import { config, applySettingsOverrides, EDITABLE_KEYS, startedAt, lastPollAt } from '../../config';
import { getAllSettings, setSetting, deleteSetting, getSettingsLog } from '../../db/store';
import { requireAdmin } from '../middleware/auth';
import settingsTestRouter from './settings-test';
import settingsMetaRouter from './settings-meta';

const router = Router();

router.use(settingsTestRouter);
router.use(settingsMetaRouter);

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbSettings = await getAllSettings();

    const editableSettings: Record<string, { value: string; source: 'db' | 'env' }> = {};
    const maskToken = (t: string) => t ? `••••${t.substring(t.length - 4)}` : '';

    const configValues: Record<string, string> = {
      'reportportal.url': config.reportportal.url,
      'reportportal.project': config.reportportal.project,
      'reportportal.token': maskToken(config.reportportal.token),
      'email.from': config.email.from,
      'email.host': config.email.host,
      'email.user': config.email.user,
      'email.pass': config.email.pass ? '••••••' : '',
      'schedule.pollIntervalMinutes': String(config.schedule.pollIntervalMinutes),
      'schedule.timezone': config.schedule.timezone,
      'schedule.initialLookbackDays': String(config.schedule.initialLookbackDays),
      'dashboard.url': config.dashboard.url,
      'polarion.url': config.polarion.url,
      'jira.url': config.jira.url,
      'jira.projectKey': config.jira.projectKey,
      'jira.issueType': config.jira.issueType,
      'jira.component': dbSettings['jira.component'] || 'CNV User Interface',
      'jira.email': config.jira.email,
      'jira.token': maskToken(config.jira.token),
      'slack.jiraWebhookUrl': config.slack.jiraWebhookUrl,
      'jenkins.user': config.jenkins.user,
      'jenkins.token': maskToken(config.jenkins.token),
      'schedule.reminderTime': config.schedule.reminderTime,
      'schedule.reminderDays': config.schedule.reminderDays,
      'email.port': String(config.email.port),
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
        slackEnabled: !!config.slack.jiraWebhookUrl,
        jiraEnabled: config.jira.enabled,
        uptime: Math.round((Date.now() - startedAt) / 1000),
        lastPollAt,
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
    res.json({ success: true, cleared: Object.keys(dbSettings).length });
  } catch (err) {
    next(err);
  }
});

export default router;
