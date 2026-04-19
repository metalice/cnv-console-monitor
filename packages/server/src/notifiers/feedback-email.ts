import nodemailer from 'nodemailer';

import { config } from '../config';
import { logger } from '../logger';

const log = logger.child({ module: 'FeedbackEmail' });
const EMAIL_TIMEOUT_MS = 30000;

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
  improvement: 'Improvement',
};

const createTransporter = () =>
  nodemailer.createTransport({
    auth: config.email.user ? { pass: config.email.pass, user: config.email.user } : undefined,
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    socketTimeout: EMAIL_TIMEOUT_MS,
    tls: { rejectUnauthorized: false },
  });

type FeedbackEmailData = {
  category: string;
  description: string;
  id: number;
  pageUrl: string;
  screenshot?: string | null;
  submittedBy: string;
};

export const sendFeedbackAdminNotification = async (feedback: FeedbackEmailData): Promise<void> => {
  const adminEmail = config.feedback.adminEmail || config.email.from;
  if (!config.email.enabled || !adminEmail) {
    log.debug('Email not configured, skipping feedback admin notification');
    return;
  }

  try {
    const transporter = createTransporter();
    const categoryLabel = CATEGORY_LABELS[feedback.category] ?? feedback.category;
    const dashboardUrl = config.dashboard.url ? `${config.dashboard.url}/feedback` : '/feedback';

    const screenshotHtml = feedback.screenshot
      ? '<hr><p><strong>Screenshot:</strong></p><p><img src="cid:screenshot" style="max-width:100%;border:1px solid #ddd;border-radius:4px" /></p>'
      : '';

    const attachments = feedback.screenshot
      ? [
          {
            cid: 'screenshot',
            content: feedback.screenshot.replace(/^data:image\/\w+;base64,/, ''),
            encoding: 'base64' as const,
            filename: `feedback-${feedback.id}.jpg`,
          },
        ]
      : [];

    await transporter.sendMail({
      attachments,
      from: config.email.from,
      html: `
        <h2>New Feedback: ${categoryLabel}</h2>
        <p><strong>From:</strong> ${feedback.submittedBy}</p>
        <p><strong>Page:</strong> ${feedback.pageUrl}</p>
        <hr>
        <p>${feedback.description.replaceAll('\n', '<br>')}</p>
        ${screenshotHtml}
        <hr>
        <p><a href="${dashboardUrl}">View in Dashboard</a></p>
      `,
      subject: `[CNV Monitor Feedback] ${categoryLabel} #${feedback.id}`,
      to: adminEmail,
    });

    log.info({ feedbackId: feedback.id, to: adminEmail }, 'Feedback admin notification sent');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(
      { feedbackId: feedback.id, host: config.email.host, to: adminEmail },
      `Failed to send feedback admin notification: ${message}`,
    );
  }
};

export const sendFeedbackStatusNotification = async (
  submitterEmail: string,
  feedbackId: number,
  newStatus: string,
  category: string,
): Promise<void> => {
  if (!config.email.enabled || !submitterEmail.includes('@')) {
    log.debug('Email not configured or no valid submitter email, skipping status notification');
    return;
  }

  try {
    const transporter = createTransporter();
    const categoryLabel = CATEGORY_LABELS[category] ?? category;
    const dashboardUrl = config.dashboard.url ? `${config.dashboard.url}/feedback` : '/feedback';

    await transporter.sendMail({
      from: config.email.from,
      html: `
        <h2>Feedback Status Updated</h2>
        <p>Your ${categoryLabel.toLowerCase()} (#${feedbackId}) has been updated to: <strong>${newStatus}</strong></p>
        <p><a href="${dashboardUrl}">View in Dashboard</a></p>
      `,
      subject: `[CNV Monitor] Your feedback #${feedbackId} is now ${newStatus}`,
      to: submitterEmail,
    });

    log.info({ feedbackId, submitterEmail }, 'Feedback status notification sent to submitter');
  } catch (err) {
    log.warn({ err, feedbackId }, 'Failed to send feedback status notification');
  }
};
