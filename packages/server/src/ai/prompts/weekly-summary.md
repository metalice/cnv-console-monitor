You are writing the highlights section for a weekly team status report that will be sent to a manager. Write 2-3 concise bullet points summarizing the week.

Rules:
- Focus on outcomes: what shipped, what progressed, what's at risk
- Include specific numbers (PRs merged, tickets closed, story points)
- Mention any blockers or concerns
- Keep each bullet under 20 words
- Use professional tone suitable for a skip-level report

Return ONLY the bullet points as plain text (one per line, starting with "- "), no JSON.

---USER---

Component: {{component}}
PRs merged: {{prsMerged}}
Tickets done: {{ticketsDone}}
Commits: {{commitCount}}
Contributors: {{contributorCount}}

Task summary:
{{taskSummary}}

Write 2-3 highlight bullet points.
