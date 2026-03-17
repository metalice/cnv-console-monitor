import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../db/data-source';

const router = Router();

router.get('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchName = decodeURIComponent(req.params.name as string);
    const repo = AppDataSource.getRepository('Launch');

    const stats = await repo.createQueryBuilder('l')
      .select('COUNT(*)', 'totalRuns')
      .addSelect("COUNT(CASE WHEN l.status = 'PASSED' THEN 1 END)", 'passed')
      .addSelect("COUNT(CASE WHEN l.status = 'FAILED' THEN 1 END)", 'failed')
      .addSelect("COUNT(CASE WHEN l.status = 'IN_PROGRESS' THEN 1 END)", 'inProgress')
      .addSelect('MIN(l.start_time)', 'firstRun')
      .addSelect('MAX(l.start_time)', 'lastRun')
      .where('l.name = :launchName', { launchName })
      .getRawOne() as Record<string, string>;

    const latest = await repo.createQueryBuilder('l')
      .where('l.name = :launchName', { launchName })
      .orderBy('l.start_time', 'DESC').limit(1)
      .getMany() as Array<Record<string, unknown>>;

    if (latest.length === 0) { res.json({ found: false }); return; }
    const launch = latest[0];
    res.json({
      found: true, name: launch.name,
      totalRuns: parseInt(stats.totalRuns, 10),
      passed: parseInt(stats.passed, 10),
      failed: parseInt(stats.failed, 10),
      inProgress: parseInt(stats.inProgress, 10),
      firstRun: Number(stats.firstRun),
      lastRun: Number(stats.lastRun),
      cnvVersion: launch.cnv_version, tier: launch.tier,
      component: launch.component, jenkinsTeam: launch.jenkins_team,
      jenkinsStatus: launch.jenkins_status,
      jenkinsMetadata: launch.jenkins_metadata,
      artifactsUrl: launch.artifacts_url,
    });
  } catch (error) { next(error); }
});

export default router;
