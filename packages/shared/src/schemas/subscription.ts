import { z } from 'zod';

export const SubscriptionTypeEnum = z.enum(['test', 'team_report']);
export type SubscriptionType = z.infer<typeof SubscriptionTypeEnum>;

export const SubscriptionSchema = z.object({
  components: z.array(z.string()),
  createdBy: z.string().nullish(),
  emailRecipients: z.array(z.string()),
  enabled: z.boolean(),
  id: z.number(),
  jiraWebhook: z.string().nullish(),
  name: z.string(),
  reminderDays: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().optional(),
  schedule: z.string(),
  slackWebhook: z.string().nullish(),
  teamReportEmailRecipients: z.array(z.string()).default([]),
  teamReportSchedule: z.string().nullish(),
  teamReportSlackWebhook: z.string().nullish(),
  timezone: z.string(),
  type: SubscriptionTypeEnum.default('test'),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const CreateSubscriptionSchema = z.object({
  components: z.array(z.string()),
  emailRecipients: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  jiraWebhook: z.string().nullish(),
  name: z.string().min(1),
  reminderDays: z.string().default('1,2,3,4,5'),
  reminderEnabled: z.boolean().default(false),
  reminderTime: z.string().default('10:00'),
  schedule: z.string().default('0 7 * * *'),
  slackWebhook: z.string().nullish(),
  teamReportEmailRecipients: z.array(z.string()).default([]).optional(),
  teamReportSchedule: z.string().nullish(),
  teamReportSlackWebhook: z.string().nullish(),
  timezone: z.string().default('Asia/Jerusalem'),
  type: SubscriptionTypeEnum.default('test'),
});

export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial();

export type UpdateSubscriptionRequest = z.infer<typeof UpdateSubscriptionSchema>;
