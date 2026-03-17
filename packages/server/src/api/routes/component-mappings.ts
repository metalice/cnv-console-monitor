import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/auth';
import {
  getAllComponentMappings,
  upsertComponentMapping,
  deleteComponentMapping,
  getUnmappedLaunchNames,
  getMatchCountForPattern,
  getMatchingLaunchNames,
  getLaunchCount,
  getDistinctComponents,
} from '../../db/store';
import { refreshMappingCache, fetchJiraComponents, autoGenerateMappings } from '../../componentMap';
import { AppDataSource } from '../../db/data-source';
import detailsRouter from './component-mappings-details';

const router = Router();
router.use('/launch-details', detailsRouter);

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [mappings, unmappedNames, jiraComponents] = await Promise.all([
      getAllComponentMappings(),
      getUnmappedLaunchNames(),
      fetchJiraComponents(),
    ]);

    const componentCounts = await AppDataSource.getRepository('Launch')
      .createQueryBuilder('l').select('l.component', 'component')
      .addSelect('COUNT(*)', 'count').where('l.component IS NOT NULL')
      .groupBy('l.component').getRawMany() as Array<{ component: string; count: string }>;
    const countMap = new Map(componentCounts.map((row) => [row.component, parseInt(row.count, 10)]));

    const mappingsWithCounts = await Promise.all(mappings.map(async (mapping) => {
      if (mapping.type === 'manual') {
        const appliedCount = await AppDataSource.getRepository('Launch').createQueryBuilder('l')
          .where("l.jenkins_status = 'regex_mapped'").andWhere('l.name ~* :pattern', { pattern: mapping.pattern })
          .getCount();
        return { ...mapping, matchCount: appliedCount };
      }
      return { ...mapping, matchCount: countMap.get(mapping.component) ?? 0 };
    }));

    const [launchCount, componentList, mappedCount] = await Promise.all([
      getLaunchCount(), getDistinctComponents(),
      AppDataSource.getRepository('Launch').createQueryBuilder('l').where('l.component IS NOT NULL').getCount(),
    ]);
    const summary = {
      totalLaunches: launchCount,
      mappedLaunches: mappedCount,
      unmappedLaunches: launchCount - mappedCount,
      componentCount: componentList.length,
      coveragePercent: launchCount > 0 ? Math.round((mappedCount / launchCount) * 100) : 0,
    };
    res.json({ mappings: mappingsWithCounts, unmapped: unmappedNames, jiraComponents, launchCount, summary });
  } catch (error) {
    next(error);
  }
});

router.get('/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pattern = req.query.pattern as string;
    if (!pattern) { res.status(400).json({ error: 'pattern query param required' }); return; }
    const includeDeleted = req.query.includeDeleted === 'true';
    const matches = await getMatchingLaunchNames(pattern, 20, includeDeleted);
    const counts = await getMatchCountForPattern(pattern, includeDeleted);

    const allMappings = await getAllComponentMappings();
    const conflicts = allMappings
      .filter((mapping) => mapping.type === 'manual' && mapping.pattern !== pattern)
      .filter((mapping) => {
        try { return matches.some((name) => new RegExp(mapping.pattern, 'i').test(name)); } catch { return false; }
      })
      .map((mapping) => ({ pattern: mapping.pattern, component: mapping.component }));
    res.json({ matches, totalCount: counts.launches, nameCount: counts.names, conflicts });
  } catch (error) {
    next(error);
  }
});

router.put('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pattern, component, type, includeDeleted } = req.body as {
      pattern: string;
      component: string;
      type?: string;
      includeDeleted?: boolean;
    };

    if (!pattern || !component) {
      res.status(400).json({ error: 'pattern and component are required' });
      return;
    }

    const mappingType = type ?? 'manual';
    await upsertComponentMapping(pattern, component, mappingType);
    await refreshMappingCache();

    let applied = 0;
    if (mappingType === 'manual') {
      const { applyRegexMapping } = await import('../../db/store/componentMappings');
      applied = await applyRegexMapping(pattern, component, includeDeleted ?? false);
    }
    res.json({ success: true, pattern, component, type: mappingType, applied });
  } catch (error) {
    next(error);
  }
});

router.delete('/:pattern', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decodedPattern = decodeURIComponent(req.params.pattern as string);
    const existing = (await getAllComponentMappings()).find((mapping) => mapping.pattern === decodedPattern);
    await deleteComponentMapping(decodedPattern);
    await refreshMappingCache();

    let cleared = 0;
    if (existing?.type === 'manual') {
      const { clearRegexMapping } = await import('../../db/store/componentMappings');
      cleared = await clearRegexMapping(decodedPattern, existing.component);
    }
    res.json({ success: true, deleted: decodedPattern, cleared });
  } catch (error) {
    next(error);
  }
});

router.post('/auto-map', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await autoGenerateMappings();
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;
