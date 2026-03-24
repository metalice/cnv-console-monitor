import { type NextFunction, type Request, type Response, Router } from 'express';

import {
  BulkTriageRequestSchema,
  CommentRequestSchema,
  TriageRequestSchema,
} from '@cnv-monitor/shared';

import { addTestItemComment, updateDefectType } from '../../clients/reportportal';
import {
  addTriageLog,
  getLaunchByRpId,
  getTestItemByRpId,
  updateTestItemDefect,
} from '../../db/store';
import { broadcast } from '../../ws';
import { requireAdmin } from '../middleware/auth';
import { parseIntParam, validateBody } from '../middleware/validate';

const router = Router();

router.post(
  '/:itemId',
  requireAdmin,
  validateBody(TriageRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = parseIntParam(req.params.itemId, 'itemId', res);
      if (itemId === null) {
        return;
      }

      const { comment, defectType } = req.body;
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
        action: 'classify_defect',
        component: launch?.component,
        new_value: defectType,
        old_value: existing.defect_type || 'unset',
        performed_by: performedBy,
        test_item_rp_id: itemId,
      });

      broadcast('data-updated');
      res.json({ defectType, itemId, success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/bulk',
  requireAdmin,
  validateBody(BulkTriageRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, defectType, itemIds } = req.body;
      const performedBy = req.user?.email || 'unknown';

      await updateDefectType(itemIds, defectType, comment);

      for (const itemId of itemIds) {
        const existing = await getTestItemByRpId(itemId);
        const launch = existing ? await getLaunchByRpId(existing.launch_rp_id) : undefined;
        await updateTestItemDefect(itemId, defectType, comment || '');
        await addTriageLog({
          action: 'bulk_classify_defect',
          component: launch?.component,
          new_value: defectType,
          old_value: existing?.defect_type || 'unset',
          performed_by: performedBy,
          test_item_rp_id: itemId,
        });
      }

      broadcast('data-updated');
      res.json({ count: itemIds.length, defectType, success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:itemId/comment',
  requireAdmin,
  validateBody(CommentRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = parseIntParam(req.params.itemId, 'itemId', res);
      if (itemId === null) {
        return;
      }

      const { comment } = req.body;
      const performedBy = req.user?.email || 'unknown';

      const item = await getTestItemByRpId(itemId);
      const launch = item ? await getLaunchByRpId(item.launch_rp_id) : undefined;

      await addTestItemComment(itemId, comment);

      await addTriageLog({
        action: 'add_comment',
        component: launch?.component,
        new_value: comment,
        performed_by: performedBy,
        test_item_rp_id: itemId,
      });

      broadcast('data-updated');
      res.json({ itemId, success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
