import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../../logger';
import { getPipelineManager, startPipeline } from '../../pipeline';
import { config, lastPollAt, setLastPollAt } from '../../config';
import { getEnrichmentStats, getLaunchCount } from '../../db/store';
import { broadcast } from '../../ws';

const log = logger.child({ module: 'PollAPI' });
const router = Router();

const MAX_STATUS_ERRORS = 20;
const MAX_STATUS_LOG = 200;

router.get('/status', async (_req: Request, res: Response) => {
  const manager = getPipelineManager();
  const [enrichment, totalLaunches] = await Promise.all([getEnrichmentStats(), getLaunchCount()]);

  const pipelineState = manager.getState();
  const activePhase = Object.entries(pipelineState.phases).find(([, p]) => p.status === 'running' || p.status === 'retrying');

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
    pipeline: {
      ...pipelineState,
      phases: lightPhases,
      log: pipelineState.log.slice(-MAX_STATUS_LOG),
      totalLogEntries: pipelineState.log.length,
    },
    lastPollAt: lastPollAt ? Number(lastPollAt) : null,
    pollIntervalMinutes: config.schedule.pollIntervalMinutes,
    enrichment: { ...enrichment, total: totalLaunches },
    active: pipelineState.active,
    phase: activePhase ? activePhase[0] : pipelineState.active ? 'starting' : '',
    current: activePhase ? activePhase[1].succeeded : 0,
    total: activePhase ? activePhase[1].total : 0,
    message: activePhase ? `${activePhase[1].succeeded}/${activePhase[1].total}` : '',
    startedAt: pipelineState.startedAt,
  });
});

router.get('/history', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const manager = getPipelineManager();
    const limit = parseInt(_req.query.limit as string, 10) || 10;
    const runs = await manager.getHistory(limit);
    res.json(runs);
  } catch (err) { next(err); }
});

router.post('/start', requireAdmin, async (req: Request, res: Response) => {
  const manager = getPipelineManager();
  if (manager.isActive()) {
    res.status(409).json({ error: 'Pipeline already running' });
    return;
  }

  const mode = (req.query.mode as string) === 'full' ? 'full' : 'incremental';
  const lookbackDays = parseInt(req.query.lookbackDays as string, 10);
  const lookbackHours = mode === 'full'
    ? (lookbackDays > 0 ? lookbackDays : config.schedule.initialLookbackDays) * 24
    : 24;

  res.json({ success: true, mode, lookbackHours });

  startPipeline({
    mode,
    lookbackHours,
    clearData: mode === 'full',
  }).then(() => {
    setLastPollAt(Date.now());
    broadcast('data-updated');
    log.info('Pipeline completed');
  }).catch(err => {
    log.error({ err }, 'Pipeline failed');
  });
});

router.post('/cancel', requireAdmin, (_req: Request, res: Response) => {
  const manager = getPipelineManager();
  manager.cancel();
  res.json({ success: true });
});

router.post('/resume-phase/:phaseName', requireAdmin, async (req: Request, res: Response) => {
  const manager = getPipelineManager();
  const phaseName = req.params.phaseName as string;

  if (manager.isActive()) {
    res.status(409).json({ error: 'Pipeline already running' });
    return;
  }

  try {
    res.json({ success: true, phase: phaseName });
    manager.resumePhase(phaseName)
      .then(() => { broadcast('data-updated'); })
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
  } catch (err) { next(err); }
});

router.post('/dry-run', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const manager = getPipelineManager();
    const report = await manager.dryRun();
    res.json(report);
  } catch (err) { next(err); }
});

// Legacy endpoints for backward compatibility
router.post('/now', requireAdmin, async (req: Request, res: Response) => {
  const manager = getPipelineManager();
  if (manager.isActive()) { res.status(409).json({ error: 'Pipeline already running' }); return; }
  res.json({ success: true });
  startPipeline({ mode: 'incremental', lookbackHours: 24, clearData: false })
    .then(() => { setLastPollAt(Date.now()); broadcast('data-updated'); })
    .catch(err => log.error({ err }, 'Poll failed'));
});

router.post('/backfill', requireAdmin, async (_req: Request, res: Response) => {
  const manager = getPipelineManager();
  if (manager.isActive()) { res.status(409).json({ error: 'Pipeline already running' }); return; }
  const lookbackDays = config.schedule.initialLookbackDays;
  res.json({ success: true, lookbackDays });
  startPipeline({ mode: 'full', lookbackHours: lookbackDays * 24, clearData: true })
    .then(() => { setLastPollAt(Date.now()); broadcast('data-updated'); })
    .catch(err => log.error({ err }, 'Backfill failed'));
});

export default router;
