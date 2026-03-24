import { z } from 'zod';

export const ActivityEntrySchema = z.object({
  action: z.string(),
  component: z.string().nullish(),
  id: z.number(),
  launch_rp_id: z.number().nullish(),
  new_value: z.string().nullish(),
  notes: z.string().nullish(),
  old_value: z.string().nullish(),
  performed_at: z.string(),
  performed_by: z.string().nullish(),
  pin_note: z.string().nullish(),
  pinned: z.boolean().nullish(),
  test_item_rp_id: z.number().nullish(),
  test_name: z.string().nullish(),
});

export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;
