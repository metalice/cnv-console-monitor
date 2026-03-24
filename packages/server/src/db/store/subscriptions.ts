import { AppDataSource } from '../data-source';
import { NotificationSubscription } from '../entities/NotificationSubscription';

import type { SubscriptionRecord } from './types';

const subscriptions = () => AppDataSource.getRepository(NotificationSubscription);

const toSubscriptionRecord = (row: NotificationSubscription): SubscriptionRecord => {
  let components: string[] = [];
  try {
    components = JSON.parse(row.components || '[]');
  } catch {
    /* Empty */
  }
  return {
    components,
    createdBy: row.created_by,
    emailRecipients: (row.email_recipients || '').split(',').filter(Boolean),
    enabled: row.enabled,
    id: row.id,
    jiraWebhook: row.jira_webhook,
    name: row.name,
    reminderDays: row.reminder_days || '1,2,3,4,5',
    reminderEnabled: row.reminder_enabled ?? false,
    reminderTime: row.reminder_time || '10:00',
    schedule: row.schedule,
    slackWebhook: row.slack_webhook,
    timezone: row.timezone || 'Asia/Jerusalem',
  };
};

export const getAllSubscriptions = async (): Promise<SubscriptionRecord[]> => {
  const rows = await subscriptions().find({ order: { id: 'ASC' } });
  return rows.map(toSubscriptionRecord);
};

export const getSubscription = async (id: number): Promise<SubscriptionRecord | undefined> => {
  const row = await subscriptions().findOneBy({ id });
  return row ? toSubscriptionRecord(row) : undefined;
};

export const createSubscription = async (
  data: Omit<SubscriptionRecord, 'id'>,
): Promise<SubscriptionRecord> => {
  const row = await subscriptions().save({
    components: JSON.stringify(data.components),
    created_by: data.createdBy ?? null,
    email_recipients: data.emailRecipients.join(',') || null,
    enabled: data.enabled,
    jira_webhook: data.jiraWebhook ?? null,
    name: data.name,
    reminder_days: data.reminderDays || '1,2,3,4,5',
    reminder_enabled: data.reminderEnabled ?? false,
    reminder_time: data.reminderTime || '10:00',
    schedule: data.schedule,
    slack_webhook: data.slackWebhook ?? null,
    timezone: data.timezone || 'Asia/Jerusalem',
  });
  return toSubscriptionRecord(row);
};

export const updateSubscription = async (
  id: number,
  data: Partial<Omit<SubscriptionRecord, 'id'>>,
): Promise<SubscriptionRecord | undefined> => {
  const update: Partial<NotificationSubscription> = {};
  if (data.name !== undefined) {
    update.name = data.name;
  }
  if (data.components !== undefined) {
    update.components = JSON.stringify(data.components);
  }
  if (data.slackWebhook !== undefined) {
    update.slack_webhook = data.slackWebhook;
  }
  if (data.jiraWebhook !== undefined) {
    update.jira_webhook = data.jiraWebhook;
  }
  if (data.emailRecipients !== undefined) {
    update.email_recipients = data.emailRecipients.join(',') || null;
  }
  if (data.schedule !== undefined) {
    update.schedule = data.schedule;
  }
  if (data.timezone !== undefined) {
    update.timezone = data.timezone;
  }
  if (data.enabled !== undefined) {
    update.enabled = data.enabled;
  }
  if (data.reminderEnabled !== undefined) {
    update.reminder_enabled = data.reminderEnabled;
  }
  if (data.reminderTime !== undefined) {
    update.reminder_time = data.reminderTime;
  }
  if (data.reminderDays !== undefined) {
    update.reminder_days = data.reminderDays;
  }

  await subscriptions().update({ id }, update);
  return getSubscription(id);
};

export const deleteSubscription = async (id: number): Promise<void> => {
  await subscriptions().delete({ id });
};
