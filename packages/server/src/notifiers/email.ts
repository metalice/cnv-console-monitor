import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../logger';
import { DailyReport } from '../analyzer';
import { buildHtml } from './email-template';

const log = logger.child({ module: 'Email' });

export const sendEmailReport = async (report: DailyReport, recipientOverride?: string[]): Promise<void> => {
  const recipients = recipientOverride ?? [];
  if (!config.email.enabled || recipients.length === 0) {
    log.debug('Email not configured or no recipients, skipping');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
      tls: { rejectUnauthorized: false },
    });

    const statusText = report.overallHealth === 'green' ? 'ALL GREEN' : `${report.failedLaunches} FAILED`;

    await transporter.sendMail({
      from: config.email.from,
      to: recipients.join(', '),
      subject: `[CNV Console] ${report.date} — ${statusText}`,
      html: buildHtml(report),
    });

    log.info({ recipients: recipients.length }, 'Report sent');
  } catch (err) {
    log.error({ err, recipients: recipients.length }, 'Failed to send email report');
    throw err;
  }
}
