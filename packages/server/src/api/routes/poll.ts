import { Router, Request, Response, NextFunction } from 'express';
import { pollReportPortal, enrichLaunchesFromJenkins, enrichRemainingLaunches, refreshLaunchTestItems } from '../../poller';
import { broadcast } from '../../ws';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../../logger';
import {
  lockPoll, unlockPoll, getPollProgress,
  forceUnlockPoll, isPollLocked, isPollCancelled,
  pauseAutoPoll, resumeAutoPoll,
  getFailedItemLaunches, clearFailedItemLaunches,
  setLastPollSummary, getLastPollSummary,
  cancelJenkins,
} from '../../pollLock';
import { config, lastPollAt, setLastPollAt } from '../../config';
import { clearAllLaunches, clearAllTestItems, getEnrichmentStats, backfillComponentFromSiblings, getLaunchCount } from '../../db/store';
import { autoGenerateMappings } from '../../componentMap';

const log = logger.child({ module: 'PollAPI' });
const router = Router();

router.get('/status', async (_req: Request, res: Response) => {
  const { AppDataSource } = await import('../../db/data-source');
  const [enrichment, totalLaunches, oldestRow] = await Promise.all([
    getEnrichmentStats(), getLaunchCount(),
    AppDataSource.getRepository('Launch').findOne({ where: {}, order: { start_time: 'ASC' }, select: ['start_time'] }),
  ]);
  const inMemoryFailed = getFailedItemLaunches();
  const countResult = await AppDataSource.query(
    `SELECT COUNT(*) as cnt FROM launches l
     WHERE l.failed > 0
     AND NOT EXISTS (SELECT 1 FROM test_items ti WHERE ti.launch_rp_id = l.rp_id)`
  );
  const missingItemCount = Math.max(inMemoryFailed.length, parseInt(countResult[0]?.cnt ?? '0', 10));
  const oldestLaunchTime = (oldestRow as { start_time?: number } | null)?.start_time ?? null;
  const dataCoverageDays = oldestLaunchTime ? Math.round((Date.now() - Number(oldestLaunchTime)) / (1000 * 60 * 60 * 24)) : 0;
  res.json({
    ...getPollProgress(),
    lastPollAt: lastPollAt ? Number(lastPollAt) : null,
    pollIntervalMinutes: config.schedule.pollIntervalMinutes,
    enrichment: { ...enrichment, total: totalLaunches },
    failedItemLaunches: inMemoryFailed,
    missingItemCount: inMemoryFailed.length > 0 ? inMemoryFailed.length : missingItemCount,
    dataCoverageDays,
    configuredLookbackDays: config.schedule.initialLookbackDays,
    lastPollSummary: getLastPollSummary(),
  });
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
        .then(async (enrichResult) => {
          await backfillComponentFromSiblings();
          broadcast('data-updated');
          setLastPollSummary({
            timestamp: Date.now(), durationMs: Date.now() - result.startedAt, cancelled: false,
            launches: result.launchStats, testItems: result.itemStats,
            jenkins: { total: enrichResult.total, succeeded: enrichResult.succeeded, failed: enrichResult.failed, errors: enrichResult.errorReasons, authRequired: enrichResult.authRequired, deleted: enrichResult.deleted, pruned: enrichResult.pruned },
          });
        })
        .catch((enrichErr) => log.error({ enrichErr }, 'Post-poll enrichment failed'));
    } else {
      setLastPollSummary({ timestamp: Date.now(), durationMs: Date.now() - result.startedAt, cancelled: false, launches: result.launchStats, testItems: result.itemStats, jenkins: { total: 0, succeeded: 0, failed: 0, errors: {}, authRequired: 0, deleted: 0, pruned: 0 } });
    }
  } catch (err) { unlockPoll(); next(err); }
});

router.post('/backfill', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  const pollId = lockPoll();
  if (!pollId) { res.status(409).json({ error: 'Poll already in progress' }); return; }
  pauseAutoPoll();
  try {
    cancelJenkins();
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
      log.info({ fetched: result.launches.length }, 'Backfill was cancelled — clearing partial data');
      await clearAllTestItems();
      await clearAllLaunches();
      broadcast('data-updated');
      setLastPollSummary({ timestamp: Date.now(), durationMs: Date.now() - result.startedAt, cancelled: true, launches: result.launchStats, testItems: result.itemStats, jenkins: { total: 0, succeeded: 0, failed: 0, errors: {}, authRequired: 0, deleted: 0, pruned: 0 } });
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
          setLastPollSummary({
            timestamp: Date.now(), durationMs: Date.now() - result.startedAt, cancelled: false,
            launches: result.launchStats, testItems: result.itemStats,
            jenkins: { total: enrichResult.total, succeeded: enrichResult.succeeded, failed: enrichResult.failed, errors: enrichResult.errorReasons, authRequired: enrichResult.authRequired, deleted: enrichResult.deleted, pruned: enrichResult.pruned },
          });
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
  if (isPollLocked()) {
    forceUnlockPoll();
    broadcast('poll-progress', { phase: 'cancelled', current: 0, total: 0, message: 'Poll cancelled' });
  }
  cancelJenkins();
  broadcast('jenkins-progress', { phase: 'cancelled', current: 0, total: 0, message: 'Jenkins cancelled' });
  res.json({ success: true });
});

router.post('/retry-items', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const inMemory = getFailedItemLaunches();
    let toRetry: Array<{ rpId: number }> = inMemory.map(e => ({ rpId: e.rpId }));

    if (toRetry.length === 0) {
      const dbMissing = await AppDataSource.query(
        `SELECT l.rp_id FROM launches l
         WHERE l.failed > 0
         AND NOT EXISTS (SELECT 1 FROM test_items ti WHERE ti.launch_rp_id = l.rp_id)`
      );
      toRetry = dbMissing.map((r: { rp_id: number }) => ({ rpId: r.rp_id }));
    }

    if (toRetry.length === 0) { res.json({ success: true, retried: 0, succeeded: 0, stillFailed: 0 }); return; }

    log.info({ count: toRetry.length }, 'Retrying failed test item fetches');
    let succeeded = 0;
    let stillFailed = 0;
    for (const entry of toRetry) {
      try {
        const items = await refreshLaunchTestItems(entry.rpId);
        if (items.length === 0) {
          await AppDataSource.query('UPDATE launches SET failed = 0 WHERE rp_id = $1', [entry.rpId]);
        }
        succeeded++;
      } catch {
        stillFailed++;
      }
    }

    clearFailedItemLaunches();
    if (succeeded > 0) broadcast('data-updated');

    res.json({ success: true, retried: toRetry.length, succeeded, stillFailed });
  } catch (err) { next(err); }
});

export default router;
