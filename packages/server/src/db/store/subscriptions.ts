import { AppDataSource } from '../data-source';
import { NotificationSubscription } from '../entities/NotificationSubscription';
import type { SubscriptionRecord } from './types';

const subscriptions = () => AppDataSource.getRepository(NotificationSubscription);

const toSubscriptionRecord = (row: NotificationSubscription): SubscriptionRecord => {
  let components: string[] = [];
  try { components = JSON.parse(row.components || '[]'); } catch { /* empty */ }
  return {
    id: row.id,
    name: row.name,
    components,
    slackWebhook: row.slack_webhook,
    jiraWebhook: row.jira_webhook,
    emailRecipients: (row.email_recipients || '').split(',').filter(Boolean),
    schedule: row.schedule,
    timezone: row.timezone || 'Asia/Jerusalem',
    enabled: row.enabled,
    createdBy: row.created_by,
    reminderEnabled: row.reminder_enabled ?? false,
    reminderTime: row.reminder_time || '10:00',
    reminderDays: row.reminder_days || '1,2,3,4,5',
  };
}

export const getAllSubscriptions = async (): Promise<SubscriptionRecord[]> => {
  const rows = await subscriptions().find({ order: { id: 'ASC' } });
  return rows.map(toSubscriptionRecord);
}

export const getSubscription = async (id: number): Promise<SubscriptionRecord | undefined> => {
  const row = await subscriptions().findOneBy({ id });
  return row ? toSubscriptionRecord(row) : undefined;
}

export const createSubscription = async (data: Omit<SubscriptionRecord, 'id'>): Promise<SubscriptionRecord> => {
  const row = await subscriptions().save({
    name: data.name,
    components: JSON.stringify(data.components),
    slack_webhook: data.slackWebhook ?? null,
    jira_webhook: data.jiraWebhook ?? null,
    email_recipients: data.emailRecipients.join(',') || null,
    schedule: data.schedule,
    timezone: data.timezone || 'Asia/Jerusalem',
    enabled: data.enabled,
    created_by: data.createdBy ?? null,
    reminder_enabled: data.reminderEnabled ?? false,
    reminder_time: data.reminderTime || '10:00',
    reminder_days: data.reminderDays || '1,2,3,4,5',
  });
  return toSubscriptionRecord(row);
}

export const updateSubscription = async (
  id: number,
  data: Partial<Omit<SubscriptionRecord, 'id'>>,
): Promise<SubscriptionRecord | undefined> => {
  const update: Partial<NotificationSubscription> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.components !== undefined) update.components = JSON.stringify(data.components);
  if (data.slackWebhook !== undefined) update.slack_webhook = data.slackWebhook;
  if (data.jiraWebhook !== undefined) update.jira_webhook = data.jiraWebhook;
  if (data.emailRecipients !== undefined) update.email_recipients = data.emailRecipients.join(',') || null;
  if (data.schedule !== undefined) update.schedule = data.schedule;
  if (data.timezone !== undefined) update.timezone = data.timezone;
  if (data.enabled !== undefined) update.enabled = data.enabled;
  if (data.reminderEnabled !== undefined) update.reminder_enabled = data.reminderEnabled;
  if (data.reminderTime !== undefined) update.reminder_time = data.reminderTime;
  if (data.reminderDays !== undefined) update.reminder_days = data.reminderDays;

  await subscriptions().update({ id }, update);
  return getSubscription(id);
}

export const deleteSubscription = async (id: number): Promise<void> => {
  await subscriptions().delete({ id });
}
