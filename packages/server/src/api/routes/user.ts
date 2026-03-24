import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { getUserPreferences, setUserPreferences } from '../../db/store';

const PreferencesSchema = z
  .object({
    activityPresets: z
      .array(
        z.object({
          dateRange: z.string(),
          filters: z.record(z.string().optional()),
          name: z.string(),
        }),
      )
      .optional(),
    checklistComponent: z.string().optional(),
    checklistVersions: z.array(z.string()).optional(),
    dashboardComponents: z.array(z.string()).optional(),
    dashboardVersion: z.string().optional(),
    dateRange: z.string().optional(),
    lastActivityViewedAt: z.number().optional(),
    sidebarCollapsed: z.boolean().optional(),
    tableColumns: z.record(z.array(z.string())).optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
  })
  .passthrough();

const DEPRECATED_KEYS = ['dashboardComponent'];

const router = Router();

router.get('/profile', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json(req.user);
});

router.get('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const prefs = await getUserPreferences(req.user.email);
    const cleaned = Object.fromEntries(
      Object.entries(prefs as Record<string, unknown>).filter(
        ([k]) => !DEPRECATED_KEYS.includes(k),
      ),
    );
    res.json(cleaned);
  } catch (err) {
    next(err);
  }
});

router.put('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const parsed = PreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ details: parsed.error.issues, error: 'Invalid preferences' });
      return;
    }
    const existing = await getUserPreferences(req.user.email);
    const raw = { ...existing, ...parsed.data };
    const merged = Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter(([k]) => !DEPRECATED_KEYS.includes(k)),
    );
    await setUserPreferences(req.user.email, merged);
    res.json(merged);
  } catch (err) {
    next(err);
  }
});

export default router;
