import { createApp } from './api';
import { config } from './config';

const app = createApp();

app.listen(config.dashboard.port, () => {
  console.log(`[Dashboard] Server running on port ${config.dashboard.port}`);
  console.log(`[Dashboard] ReportPortal: ${config.reportportal.url}`);
  console.log(`[Dashboard] Project: ${config.reportportal.project}`);
});
