import { Router, Request, Response, NextFunction } from 'express';
import { pollReportPortal, enrichLaunchesFromJenkins, enrichRemainingLaunches } from '../../poller';
import { broadcast } from '../../ws';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../../logger';
import {
  lockPoll, unlockPoll, getPollProgress,
  forceUnlockPoll, isPollLocked, isPollCancelled,
  pauseAutoPoll, resumeAutoPoll,
} from '../../pollLock';
import { config, lastPollAt, setLastPollAt } from '../../config';
import { clearAllLaunches, clearAllTestItems, getEnrichmentStats, backfillComponentFromSiblings, getLaunchCount } from '../../db/store';
import { autoGenerateMappings } from '../../componentMap';

const log = logger.child({ module: 'PollAPI' });
const router = Router();

router.get('/status', async (_req: Request, res: Response) => {
  const [enrichment, totalLaunches] = await Promise.all([getEnrichmentStats(), getLaunchCount()]);
  res.json({ ...getPollProgress(), lastPollAt: lastPollAt ? Number(lastPollAt) : null, pollIntervalMinutes: config.schedule.pollIntervalMinutes, enrichment: { ...enrichment, total: totalLaunches } });
});

router.post('/now', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const pollId = lockPoll();
  if (!pollId) { res.status(409).json({ error: 'Poll already in progress' }); return; }
  try {
    const lookbackDays = parseInt(req.query.lookbackDays as string, 10);
    const lookbackHours = lookbackDays > 0 ? lookbackDays * 24 : 24;
    log.info({ lookbackHours, pollId }, 'Manual poll triggered');
    const result = await pollReportPortal(lookbackHours, true, pollId);
    setLastPollAt(Date.now());
    unlockPoll();
    broadcast('data-updated');
    res.json({ success: true, launches: result.launches.length });

    if (result.launches.length > 0) {
      enrichLaunchesFromJenkins(result.launches)
        .then(() => backfillComponentFromSiblings())
        .then(() => broadcast('data-updated'))
        .catch((enrichErr) => log.error({ enrichErr }, 'Post-poll enrichment failed'));
    }
  } catch (err) { unlockPoll(); next(err); }
});

router.post('/backfill', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  const pollId = lockPoll();
  if (!pollId) { res.status(409).json({ error: 'Poll already in progress' }); return; }
  pauseAutoPoll();
  try {
    const lookbackDays = config.schedule.initialLookbackDays;
    log.info({ lookbackDays, pollId }, 'Full history fetch — Phase 1');
    await clearAllTestItems();
    await clearAllLaunches();

    const result = await pollReportPortal(lookbackDays * 24, true, pollId);
    const wasCancelled = isPollCancelled();
    setLastPollAt(Date.now());
    unlockPoll();
    broadcast('data-updated');
    res.json({ success: true, launches: result.launches.length, lookbackDays, cancelled: wasCancelled });

    if (wasCancelled) {
      log.info({ fetched: result.launches.length }, 'Backfill was cancelled — skipping Jenkins enrichment');
      resumeAutoPoll();
    } else {
      log.info('Phase 2: Jenkins enrichment');
      enrichLaunchesFromJenkins(result.launches)
        .then(async (enrichResult) => {
          log.info(enrichResult, 'Phase 3: Auto-mapping');
          broadcast('jenkins-progress', { phase: 'mapping', current: 0, total: 0, message: 'Auto-mapping components...' });
          const mapResult = await autoGenerateMappings();
          const backfilled = await backfillComponentFromSiblings();
          log.info({ backfilled }, 'Backfilled components from sibling launches');
          broadcast('jenkins-progress', { phase: 'complete', current: 0, total: 0, message: `Done — ${enrichResult.succeeded} enriched, ${mapResult.mapped.length} mapped, ${backfilled} backfilled` });
          broadcast('data-updated');
        })
        .finally(() => resumeAutoPoll());
    }
  } catch (err) { unlockPoll(); resumeAutoPoll(); next(err); }
});

router.post('/enrich', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    pauseAutoPoll();
    log.info('Jenkins enrichment triggered for pending launches');
    res.json({ success: true, message: 'Jenkins enrichment started' });
    enrichRemainingLaunches()
      .then(async (result) => {
        log.info(result, 'Enrichment done, running auto-map');
        const mapResult = await autoGenerateMappings();
        const backfilled = await backfillComponentFromSiblings();
        log.info({ backfilled }, 'Backfilled components from sibling launches');
        broadcast('jenkins-progress', { phase: 'complete', current: 0, total: 0, message: `${result.succeeded} enriched, ${mapResult.mapped.length} mapped, ${backfilled} backfilled` });
        broadcast('data-updated');
      })
      .finally(() => resumeAutoPoll());
  } catch (err) { resumeAutoPoll(); next(err); }
});

router.post('/retry-failed', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    log.info('Retrying failed Jenkins enrichments');
    const result = await enrichRemainingLaunches();
    broadcast('data-updated');
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

router.post('/cancel', requireAdmin, (_req: Request, res: Response) => {
  if (!isPollLocked()) { res.status(400).json({ error: 'No poll in progress' }); return; }
  forceUnlockPoll();
  broadcast('poll-progress', { phase: 'cancelled', current: 0, total: 0, message: 'Poll cancelled' });
  res.json({ success: true });
});

export default router;
