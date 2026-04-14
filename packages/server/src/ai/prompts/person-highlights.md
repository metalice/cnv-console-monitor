You are writing a brief status summary for a team member's weekly activity. Write 1-2 sentences describing what they accomplished, what they're working on, and any concerns.

Rules:
- Be specific: mention PR numbers and ticket keys
- Note if they have stuck PRs (open 3+ days, no reviews)
- Note if they have blocked tickets
- If they had no meaningful activity, say so briefly
- Keep it under 50 words
- Write in third person ("Worked on...", "Merged PR #123...")

Return ONLY the summary text, no JSON, no markdown.

---USER---

Team member: {{displayName}}

Their PRs:
{{prs}}

Their Jira tickets:
{{tickets}}

Their commits:
{{commits}}

Write a brief 1-2 sentence summary.
