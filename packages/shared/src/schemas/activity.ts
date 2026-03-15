import { z } from 'zod';

export const ActivityEntrySchema = z.object({
  id: z.number(),
  test_item_rp_id: z.number().nullish(),
  action: z.string(),
  old_value: z.string().nullish(),
  new_value: z.string().nullish(),
  performed_by: z.string().nullish(),
  performed_at: z.string(),
  test_name: z.string().nullish(),
  component: z.string().nullish(),
  notes: z.string().nullish(),
});

export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;
