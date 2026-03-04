import { Router, Request, Response } from 'express';
import { getTestItemByRpId, updateTestItemDefect, addTriageLog } from '../../db/store';
import { updateDefectType, addTestItemComment } from '../../clients/reportportal';

const router = Router();

router.post('/:itemId', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.itemId as string);
  const { defectType, comment, performedBy } = req.body;

  if (!defectType) {
    res.status(400).json({ error: 'defectType is required' });
    return;
  }

  const existing = getTestItemByRpId(itemId);
  if (!existing) {
    res.status(404).json({ error: 'Test item not found' });
    return;
  }

  try {
    await updateDefectType([itemId], defectType, comment);

    updateTestItemDefect(itemId, defectType, comment || '');

    addTriageLog({
      test_item_rp_id: itemId,
      action: 'classify_defect',
      old_value: existing.defect_type || 'unset',
      new_value: defectType,
      performed_by: performedBy,
    });

    res.json({ success: true, itemId, defectType });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update defect type';
    res.status(502).json({ error: message });
  }
});

router.post('/:itemId/comment', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.itemId as string);
  const { comment, performedBy } = req.body;

  if (!comment) {
    res.status(400).json({ error: 'comment is required' });
    return;
  }

  try {
    await addTestItemComment(itemId, comment);

    addTriageLog({
      test_item_rp_id: itemId,
      action: 'add_comment',
      new_value: comment,
      performed_by: performedBy,
    });

    res.json({ success: true, itemId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add comment';
    res.status(502).json({ error: message });
  }
});

export default router;
