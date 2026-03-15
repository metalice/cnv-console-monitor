import { Router, Request, Response, NextFunction } from 'express';
import { TriageRequestSchema, CommentRequestSchema, BulkTriageRequestSchema } from '@cnv-monitor/shared';
import { getTestItemByRpId, updateTestItemDefect, addTriageLog, getLaunchByRpId } from '../../db/store';
import { updateDefectType, addTestItemComment } from '../../clients/reportportal';
import { validateBody, parseIntParam } from '../middleware/validate';
import { broadcast } from '../../ws';

const router = Router();

router.post('/:itemId', validateBody(TriageRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = parseIntParam(req.params.itemId, 'itemId', res);
    if (itemId === null) return;

    const { defectType, comment } = req.body;
    const performedBy = req.user?.email || 'unknown';

    const existing = await getTestItemByRpId(itemId);
    if (!existing) {
      res.status(404).json({ error: 'Test item not found' });
      return;
    }

    const launch = await getLaunchByRpId(existing.launch_rp_id);

    await updateDefectType([itemId], defectType, comment);
    await updateTestItemDefect(itemId, defectType, comment || '');

    await addTriageLog({
      test_item_rp_id: itemId,
      action: 'classify_defect',
      old_value: existing.defect_type || 'unset',
      new_value: defectType,
      performed_by: performedBy,
      component: launch?.component,
    });

    broadcast('data-updated');
    res.json({ success: true, itemId, defectType });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', validateBody(BulkTriageRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemIds, defectType, comment } = req.body;
    const performedBy = req.user?.email || 'unknown';

    await updateDefectType(itemIds, defectType, comment);

    for (const itemId of itemIds) {
      const existing = await getTestItemByRpId(itemId);
      const launch = existing ? await getLaunchByRpId(existing.launch_rp_id) : undefined;
      await updateTestItemDefect(itemId, defectType, comment || '');
      await addTriageLog({
        test_item_rp_id: itemId,
        action: 'bulk_classify_defect',
        old_value: existing?.defect_type || 'unset',
        new_value: defectType,
        performed_by: performedBy,
        component: launch?.component,
      });
    }

    broadcast('data-updated');
    res.json({ success: true, count: itemIds.length, defectType });
  } catch (err) {
    next(err);
  }
});

router.post('/:itemId/comment', validateBody(CommentRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = parseIntParam(req.params.itemId, 'itemId', res);
    if (itemId === null) return;

    const { comment } = req.body;
    const performedBy = req.user?.email || req.body.performedBy || 'unknown';

    const item = await getTestItemByRpId(itemId);
    const launch = item ? await getLaunchByRpId(item.launch_rp_id) : undefined;

    await addTestItemComment(itemId, comment);

    await addTriageLog({
      test_item_rp_id: itemId,
      action: 'add_comment',
      new_value: comment,
      performed_by: performedBy,
      component: launch?.component,
    });

    broadcast('data-updated');
    res.json({ success: true, itemId });
  } catch (err) {
    next(err);
  }
});

export default router;
