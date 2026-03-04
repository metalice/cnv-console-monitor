import { pollReportPortal } from './poller';
import { buildDailyReport } from './analyzer';
import { sendSlackReport } from './notifiers/slack';
import { sendEmailReport } from './notifiers/email';
import { config } from './config';

async function main(): Promise<void> {
  console.log(`[Main] Starting poll at ${new Date().toISOString()}`);
  console.log(`[Main] ReportPortal: ${config.reportportal.url}`);
  console.log(`[Main] Project: ${config.reportportal.project}`);
  console.log(`[Main] Filter: ${config.dashboard.launchFilter}`);

  try {
    await pollReportPortal(24);

    const report = buildDailyReport(24);

    console.log(`[Main] Report: ${report.totalLaunches} launches, ${report.failedLaunches} failed, ${report.newFailures.length} new failures`);

    const dashboardUrl = process.env.DASHBOARD_URL;

    await sendSlackReport(report, dashboardUrl);
    await sendEmailReport(report, dashboardUrl);

    console.log(`[Main] Done at ${new Date().toISOString()}`);
    process.exit(0);
  } catch (err) {
    console.error('[Main] Fatal error:', err);
    process.exit(1);
  }
}

main();
