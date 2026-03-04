# CNV Console Monitor

Daily monitoring dashboard for CNV Console test launches from ReportPortal. Provides Slack/email notifications, an interactive web dashboard with triage actions, Jira integration, and a daily acknowledgment workflow.

## Features

- **Daily Polling**: CronJob fetches all `test-kubevirt-console-*` launches from the last 24 hours
- **Slack Notifications**: Morning digest with pass/fail summary, new failures, and dashboard link
- **Email Digest**: HTML-formatted email with the same report data
- **Interactive Web Dashboard**:
  - Status matrix of all launches by CNV version and tier
  - Failed test details with AI predictions and Polarion IDs
  - **Defect classification** — classify failures directly in ReportPortal from the dashboard
  - **Auto/Pattern/Unique Error Analysis** — trigger RP analysis from the dashboard
  - **Jira integration** — create bugs, link existing issues, see live Jira status
  - **Daily acknowledgment** — QE signs off that they reviewed today's report
  - **Trends** — 30-day pass rate trend chart
  - **Flaky tests** — identify tests that flip between pass and fail
  - **Filters** — by version, status, untriaged only, new failures only

## Architecture

```
K8s CronJob (7 AM) --> Polls ReportPortal --> Stores in SQLite --> Sends Slack + Email
K8s Deployment      --> Express Dashboard  --> Reads SQLite + Calls RP/Jira APIs
```

## Quick Start (Local)

```bash
# Install dependencies
npm install

# Set environment variables
export REPORTPORTAL_URL=https://reportportal-cnv.apps.dno.ocp-hub.prod.psi.redhat.com
export REPORTPORTAL_TOKEN=your-token-here

# Run the poller (fetches data)
npm run dev:poll

# Start the dashboard
npm run dev
# Open http://localhost:8080
```

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REPORTPORTAL_URL` | `https://reportportal-cnv.apps...` | ReportPortal base URL |
| `REPORTPORTAL_TOKEN` | — | ReportPortal API bearer token |
| `REPORTPORTAL_PROJECT` | `CNV` | ReportPortal project name |
| `LAUNCH_FILTER` | `test-kubevirt-console` | Launch name filter |
| `SLACK_WEBHOOK_URL` | — | Slack incoming webhook URL |
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `EMAIL_RECIPIENTS` | — | Comma-separated email list |
| `JIRA_URL` | — | Jira server URL |
| `JIRA_TOKEN` | — | Jira API token |
| `JIRA_PROJECT_KEY` | `CNV` | Jira project key for bug creation |
| `JIRA_ISSUE_TYPE` | `Bug` | Jira issue type |
| `DASHBOARD_PORT` | `8080` | Dashboard server port |
| `DB_PATH` | `./data/monitor.db` | SQLite database path |
| `CRON_SCHEDULE` | `0 7 * * *` | Poll schedule (cron format) |
| `ACK_REMINDER_HOUR` | `10` | Hour to send ack reminder |
| `TZ` | `Asia/Jerusalem` | Timezone |
| `DASHBOARD_URL` | — | Public URL of dashboard (for links in notifications) |

## Slack Setup

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Select "From scratch", name it "CNV Console Monitor", pick your workspace
3. Go to **Incoming Webhooks** and activate it
4. Click **Add New Webhook to Workspace** and select your channel
5. Copy the webhook URL and set it as `SLACK_WEBHOOK_URL`

## Kubernetes Deployment

```bash
# Create namespace (optional)
kubectl create namespace cnv-monitor

# Edit secrets with your actual values
vi k8s/secret.yaml

# Apply all manifests
kubectl apply -f k8s/ -n cnv-monitor

# Verify
kubectl get pods -n cnv-monitor
kubectl get cronjobs -n cnv-monitor

# Get the dashboard URL (OpenShift)
oc get route cnv-console-monitor -n cnv-monitor
```

### Building the Container Image

```bash
# Build
podman build -t quay.io/openshift-cnv/cnv-console-monitor:latest .

# Push
podman push quay.io/openshift-cnv/cnv-console-monitor:latest
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/launches` | Today's launches with status |
| `GET` | `/api/launches/report` | Full daily report with groups |
| `GET` | `/api/launches/trends` | Pass rate trend (30 days) |
| `GET` | `/api/test-items/launch/:id` | Test items for a launch |
| `GET` | `/api/test-items/untriaged` | Untriaged failed items |
| `GET` | `/api/test-items/:id/logs` | Logs for a test item |
| `POST` | `/api/triage/:itemId` | Classify defect type |
| `POST` | `/api/triage/:itemId/comment` | Add comment to test item |
| `POST` | `/api/analysis/:launchId/auto` | Trigger auto-analysis |
| `POST` | `/api/analysis/:launchId/pattern` | Trigger pattern analysis |
| `POST` | `/api/analysis/:launchId/unique` | Trigger unique error analysis |
| `POST` | `/api/jira/create` | Create Jira bug from failure |
| `POST` | `/api/jira/link` | Link existing Jira issue |
| `GET` | `/api/jira/search` | Search Jira issues |
| `GET` | `/api/acknowledgment/today` | Today's ack status |
| `POST` | `/api/acknowledgment` | Acknowledge today's report |
| `GET` | `/api/flaky-tests` | Top flaky tests |
| `GET` | `/health` | Health check |

## Project Structure

```
src/
  config.ts                    — environment-based configuration
  index.ts                     — CronJob entrypoint (poll + notify)
  serve.ts                     — dashboard server entrypoint
  poller.ts                    — ReportPortal data fetcher
  analyzer.ts                  — result grouping and analysis
  clients/
    reportportal.ts            — RP API client (read + write)
    jira.ts                    — Jira API client
  db/
    schema.ts                  — SQLite schema
    store.ts                   — data access layer
  notifiers/
    slack.ts                   — Slack Block Kit notifications
    email.ts                   — HTML email digest
  api/
    index.ts                   — Express app setup
    routes/
      launches.ts              — launch data endpoints
      testItems.ts             — test item endpoints
      triage.ts                — defect classification
      analysis.ts              — RP analysis triggers
      jira.ts                  — Jira operations
      acknowledgment.ts        — daily sign-off
      flaky.ts                 — flaky test detection
    middleware/
      errorHandler.ts          — error handling
  dashboard/
    public/
      index.html               — dashboard UI
      styles.css               — styling
      app.js                   — frontend logic
k8s/                           — Kubernetes manifests
Dockerfile                     — container build
```
