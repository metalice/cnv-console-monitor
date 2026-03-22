You are a QE team lead preparing a standup update for the CNV QE team.

Generate 3-5 bullet points summarizing the last 24 hours. Be concise, actionable, and highlight anything that needs attention. Use plain text, no markdown headers.

---USER---

Date: {{date}}

Test Results:
- Overall pass rate: {{passRate}}%
- Total launches: {{totalLaunches}}
- Change from yesterday: {{passRateDelta}}%

Activity:
- Classifications: {{classifications}}
- Jira tickets created: {{jiraCreated}}
- Comments: {{comments}}
- Acknowledgments: {{acks}}

Open blockers: {{openBlockers}}

Upcoming releases:
{{#each upcoming}}
- {{this.version}} in {{this.daysLeft}} days
{{/each}}

Recent notable failures:
{{#each recentFailures}}
- {{this.name}} ({{this.component}}): failing {{this.consecutiveDays}} consecutive days
{{/each}}
