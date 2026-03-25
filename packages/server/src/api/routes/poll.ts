import { type NextFunction, type Request, type Response, Router } from 'express';

import { config, lastPollAt, setLastPollAt } from '../../config';
import { getEnrichmentStats, getLaunchCount } from '../../db/store';
import { logger } from '../../logger';
import { getPipelineManager, startPipeline } from '../../pipeline';
import { broadcast } from '../../ws';
import { requireAdmin } from '../middleware/auth';

const log = logger.child({ module: 'PollAPI' });
const router = Router();

const MAX_STATUS_ERRORS = 20;
const MAX_STATUS_LOG = 200;

router.get('/status', async (_req: Request, res: Response) => {
  const manager = getPipelineManager();
  const [enrichment, totalLaunches] = await Promise.all([getEnrichmentStats(), getLaunchCount()]);

  const pipelineState = manager.getState();
  const activePhase = Object.entries(pipelineState.phases).find(
    ([, phase]) => phase.status === 'running' || phase.status === 'retrying',
  );

  const lightPhases: Record<string, unknown> = {};
  for (const [name, phase] of Object.entries(pipelineState.phases)) {
    const { errors, ...rest } = phase;
    lightPhases[name] = {
      ...rest,
      errors: errors.slice(0, MAX_STATUS_ERRORS),
      totalErrors: errors.length,
    };
  }

  res.json({
    active: pipelineState.active,
    current: activePhase ? activePhase[1].succeeded : 0,
    enrichment: { ...enrichment, total: totalLaunches },
    lastPollAt: lastPollAt ?? null,
    message: activePhase ? `${activePhase[1].succeeded}/${activePhase[1].total}` : '',
    phase: activePhase ? activePhase[0] : pipelineState.active ? 'starting' : '',
    pipeline: {
      ...pipelineState,
      log: pipelineState.log.slice(-MAX_STATUS_LOG),
      phases: lightPhases,
      totalLogEntries: pipelineState.log.length,
    },
    pollIntervalMinutes: config.schedule.pollIntervalMinutes,
    startedAt: pipelineState.startedAt,
    total: activePhase ? activePhase[1].total : 0,
  });
});

router.get('/history', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const manager = getPipelineManager();
    const limit = parseInt(_req.query.limit as string, 10) || 10;
    const runs = await manager.getHistory(limit);
    res.json(runs);
  } catch (err) {
    next(err);
  }
});

router.post('/start', requireAdmin, (req: Request, res: Response) => {
  const manager = getPipelineManager();
  if (manager.isActive()) {
    res.status(409).json({ error: 'Pipeline already running' });
    return;
  }

  const mode = (req.query.mode as string) === 'full' ? 'full' : 'incremental';
  const lookbackDays = parseInt(req.query.lookbackDays as string, 10);
  const lookbackHours =
    mode === 'full'
      ? (lookbackDays > 0 ? lookbackDays : config.schedule.initialLookbackDays) * 24
      : 24;

  res.json({ lookbackHours, mode, success: true });

  void startPipeline({
    clearData: mode === 'full',
    lookbackHours,
    mode,
  })
    .then(() => {
      setLastPollAt(Date.now());
      broadcast('data-updated');
      log.info('Pipeline completed');
      return undefined;
    })
    .catch(err => {
      log.error({ err }, 'Pipeline failed');
    });
});

router.post('/cancel', requireAdmin, (_req: Request, res: Response) => {
  const manager = getPipelineManager();
  void manager.cancel();
  res.json({ success: true });
});

router.post('/resume-phase/:phaseName', requireAdmin, (req: Request, res: Response) => {
  const manager = getPipelineManager();
  const phaseName = req.params.phaseName as string;

  if (manager.isActive()) {
    res.status(409).json({ error: 'Pipeline already running' });
    return;
  }

  try {
    res.json({ phase: phaseName, success: true });
    manager
      .resumePhase(phaseName)
      .then(() => {
        broadcast('data-updated');
        return undefined;
      })
      .catch(err => log.error({ err, phase: phaseName }, 'Phase resume failed'));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Resume failed' });
  }
});

router.post('/health-check', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const manager = getPipelineManager();
    const report = await manager.healthCheck();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.post('/dry-run', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const manager = getPipelineManager();
    const report = await manager.dryRun();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Legacy endpoints for backward compatibility
router.post('/now', requireAdmin, (req: Request, res: Response) => {
  const manager = getPipelineManager();
  if (manager.isActive()) {
    res.status(409).json({ error: 'Pipeline already running' });
    return;
  }
  res.json({ success: true });
  startPipeline({ clearData: false, lookbackHours: 24, mode: 'incremental' })
    .then(() => {
      setLastPollAt(Date.now());
      broadcast('data-updated');
      return undefined;
    })
    .catch(err => log.error({ err }, 'Poll failed'));
});

router.post('/backfill', requireAdmin, (_req: Request, res: Response) => {
  const manager = getPipelineManager();
  if (manager.isActive()) {
    res.status(409).json({ error: 'Pipeline already running' });
    return;
  }
  const lookbackDays = config.schedule.initialLookbackDays;
  res.json({ lookbackDays, success: true });
  startPipeline({ clearData: true, lookbackHours: lookbackDays * 24, mode: 'full' })
    .then(() => {
      setLastPollAt(Date.now());
      broadcast('data-updated');
      return undefined;
    })
    .catch(err => log.error({ err }, 'Backfill failed'));
});

export default router;
