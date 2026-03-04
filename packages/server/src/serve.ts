import cron from 'node-cron';
import { createApp } from './api';
import { config } from './config';
import { getAcknowledgmentsForDate } from './db/store';
import { sendSlackReminder } from './notifiers/slack';

const app = createApp();

const ackReminderHour = config.schedule.ackReminderHour;
cron.schedule(`0 ${ackReminderHour} * * *`, async () => {
  const today = new Date().toISOString().split('T')[0];
  const acks = getAcknowledgmentsForDate(today);

  if (acks.length === 0) {
    console.log(`[AckReminder] No acknowledgment for ${today}, sending reminder`);
    try {
      await sendSlackReminder();
    } catch (err) {
      console.error('[AckReminder] Failed to send reminder:', err);
    }
  } else {
    console.log(`[AckReminder] ${today} already acknowledged by ${acks[0].reviewer}`);
  }
});

app.listen(config.dashboard.port, () => {
  console.log(`[Dashboard] Server running on port ${config.dashboard.port}`);
  console.log(`[Dashboard] ReportPortal: ${config.reportportal.url}`);
  console.log(`[Dashboard] Project: ${config.reportportal.project}`);
  console.log(`[Dashboard] Ack reminder scheduled at ${ackReminderHour}:00`);
});
