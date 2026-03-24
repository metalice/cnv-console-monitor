import nodemailer from 'nodemailer';

import { type DailyReport } from '../analyzer';
import { config } from '../config';
import { logger } from '../logger';

import { buildHtml } from './email-template';

const log = logger.child({ module: 'Email' });
const EMAIL_TIMEOUT_MS = 30000;

export const sendEmailReport = async (
  report: DailyReport,
  recipientOverride?: string[],
): Promise<void> => {
  const recipients = recipientOverride ?? [];
  if (!config.email.enabled || recipients.length === 0) {
    log.debug('Email not configured or no recipients, skipping');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      auth: config.email.user ? { pass: config.email.pass, user: config.email.user } : undefined,
      connectionTimeout: EMAIL_TIMEOUT_MS,
      greetingTimeout: EMAIL_TIMEOUT_MS,
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      socketTimeout: EMAIL_TIMEOUT_MS,
      tls: { rejectUnauthorized: false },
    });

    const statusText =
      report.overallHealth === 'green' ? 'ALL GREEN' : `${report.failedLaunches} FAILED`;

    await transporter.sendMail({
      from: config.email.from,
      html: buildHtml(report),
      subject: `[CNV Console] ${report.date} — ${statusText}`,
      to: recipients.join(', '),
    });

    log.info({ recipients: recipients.length }, 'Report sent');
  } catch (err) {
    log.error({ err, recipients: recipients.length }, 'Failed to send email report');
    throw err;
  }
};
