import { Router, Request, Response } from 'express';
import { TriageRequestSchema, CommentRequestSchema, BulkTriageRequestSchema } from '@cnv-monitor/shared';
import { getTestItemByRpId, updateTestItemDefect, addTriageLog } from '../../db/store';
import { updateDefectType, addTestItemComment } from '../../clients/reportportal';
import { validateBody, parseIntParam } from '../middleware/validate';
import { broadcast } from '../../ws';

const router = Router();

router.post('/:itemId', validateBody(TriageRequestSchema), async (req: Request, res: Response) => {
  const itemId = parseIntParam(req.params.itemId, 'itemId', res);
  if (itemId === null) return;

  const { defectType, comment, performedBy } = req.body;

  const existing = await getTestItemByRpId(itemId);
  if (!existing) {
    res.status(404).json({ error: 'Test item not found' });
    return;
  }

  try {
    await updateDefectType([itemId], defectType, comment);
    await updateTestItemDefect(itemId, defectType, comment || '');

    await addTriageLog({
      test_item_rp_id: itemId,
      action: 'classify_defect',
      old_value: existing.defect_type || 'unset',
      new_value: defectType,
      performed_by: performedBy,
    });

    broadcast('data-updated');
    res.json({ success: true, itemId, defectType });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update defect type';
    res.status(502).json({ error: message });
  }
});

router.post('/bulk', validateBody(BulkTriageRequestSchema), async (req: Request, res: Response) => {
  const { itemIds, defectType, comment, performedBy } = req.body;

  try {
    await updateDefectType(itemIds, defectType, comment);

    for (const itemId of itemIds) {
      const existing = await getTestItemByRpId(itemId);
      await updateTestItemDefect(itemId, defectType, comment || '');
      await addTriageLog({
        test_item_rp_id: itemId,
        action: 'bulk_classify_defect',
        old_value: existing?.defect_type || 'unset',
        new_value: defectType,
        performed_by: performedBy,
      });
    }

    broadcast('data-updated');
    res.json({ success: true, count: itemIds.length, defectType });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to bulk update defect types';
    res.status(502).json({ error: message });
  }
});

router.post('/:itemId/comment', validateBody(CommentRequestSchema), async (req: Request, res: Response) => {
  const itemId = parseIntParam(req.params.itemId, 'itemId', res);
  if (itemId === null) return;

  const { comment, performedBy } = req.body;

  try {
    await addTestItemComment(itemId, comment);

    await addTriageLog({
      test_item_rp_id: itemId,
      action: 'add_comment',
      new_value: comment,
      performed_by: performedBy,
    });

    broadcast('data-updated');
    res.json({ success: true, itemId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add comment';
    res.status(502).json({ error: message });
  }
});

export default router;
