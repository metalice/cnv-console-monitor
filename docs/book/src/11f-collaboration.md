# Category F: Collaboration and Social

## 11.34 Quarantine Comments Thread

- Discussion thread on each quarantine for collaboration and context sharing.

**UI:** On the quarantine detail view (which opens as a `Drawer` from the quarantine dashboard), a "Comments" section at the bottom. Uses the same pattern as Jira comments: a vertical list of comment cards, each showing avatar (initials `Label`), author, timestamp (`TimeAgo`), and content. A `TextArea` with "Add Comment" `Button` at the bottom. Comments that were synced to Jira show a small `ExternalLinkAltIcon` badge. Markdown rendering for comment content with `react-markdown`.

## 11.35 Weekly Quarantine Standup Report

- Auto-generated weekly summary of quarantine activity, sent via Slack/email.

**UI:** Configurable in notification subscriptions: a new subscription type "Quarantine Weekly Digest" with schedule (default: Monday 9 AM). Preview in settings via an `AIActionButton` labeled "Preview Weekly Digest" that generates and shows the report in a `Modal`. The report itself (Slack/email) follows existing `slack-blocks.ts` and `email-template.ts` patterns with sections: New Quarantines, Resolved, Overdue, AI Suggestions, Metrics Summary.

## 11.36 Gamification / Accountability

- Per-engineer stats and optional leaderboard for quarantine fix velocity.

**UI:** On the "My Work" page (`/my-work`), a new `Card` section "Your Test Health Stats" with a `DescriptionList`: Tests Quarantined (count), Tests Fixed (count), Avg Fix Time (days), Docs Contributed (count). Below: a sparkline chart showing fix velocity over time. The leaderboard is opt-in (toggle in user preferences). When enabled, a `Table` on the Test Explorer page's "Metrics" tab: Rank, Engineer, Quarantines Fixed, Avg Fix Time, Health Contributions. Top 3 get a subtle `TrophyIcon` `Label`. The table uses `variant="compact"` and is sorted by fix count descending.

## 11.37 "Watch" a Test

- Subscribe to individual tests for direct notifications on failures, quarantines, or doc updates.

**UI:** In the file detail panel (both docs and tests), a `ToggleGroup` button in the top-right: `EyeIcon` "Watch". Clicking toggles the watch state (filled eye = watching). When watching, the button shows "Watching" with a `CheckIcon`. The user's watched tests are listed on their "My Work" page in a "Watched Tests" `Card` with a compact `Table`: Test Name, Component, Status, Last Event. Notification delivery follows the user's existing notification preferences (Slack/email). A badge on the tree node when the user is watching it: small `EyeIcon` in muted color.
