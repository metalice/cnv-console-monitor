import { z } from 'zod';

export const SubscriptionSchema = z.object({
  id: z.number(),
  name: z.string(),
  components: z.array(z.string()),
  slackWebhook: z.string().nullish(),
  jiraWebhook: z.string().nullish(),
  emailRecipients: z.array(z.string()),
  schedule: z.string(),
  timezone: z.string(),
  enabled: z.boolean(),
  createdBy: z.string().nullish(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const CreateSubscriptionSchema = z.object({
  name: z.string().min(1),
  components: z.array(z.string()),
  slackWebhook: z.string().nullish(),
  jiraWebhook: z.string().nullish(),
  emailRecipients: z.array(z.string()).default([]),
  schedule: z.string().default('0 7 * * *'),
  timezone: z.string().default('Asia/Jerusalem'),
  enabled: z.boolean().default(true),
});

export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial();

export type UpdateSubscriptionRequest = z.infer<typeof UpdateSubscriptionSchema>;
