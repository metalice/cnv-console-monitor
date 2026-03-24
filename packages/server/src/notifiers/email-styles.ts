export const healthColor = (health: string): string => {
  switch (health) {
    case 'green':
      return '#2ecc71';
    case 'yellow':
      return '#f39c12';
    case 'red':
      return '#e74c3c';
    default:
      return '#95a5a6';
  }
};

export const emailCss = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { color: white; padding: 16px 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; font-size: 20px; }
    .header p { margin: 0; opacity: 0.9; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8f9fa; text-align: left; padding: 10px 12px; border-bottom: 2px solid #dee2e6; font-size: 13px; text-transform: uppercase; color: #666; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .status-passed { color: #2ecc71; font-weight: 600; }
    .status-failed { color: #e74c3c; font-weight: 600; }
    .status-in_progress { color: #f39c12; font-weight: 600; }
    .test-item { margin-bottom: 12px; padding: 10px 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #e74c3c; }
    .test-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .test-meta { font-size: 12px; color: #666; }
    .test-meta span { margin-right: 12px; }
    .jira-badge { background: #0052CC; color: white; font-size: 11px; padding: 2px 6px; border-radius: 3px; text-decoration: none; }
    .btn { display: inline-block; background: #0066FF; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
    .section-title { font-size: 16px; font-weight: 600; margin: 24px 0 12px 0; }
    .green-list { color: #2ecc71; }`;

export const streakBarHtml = (runs: { status: string; date: string }[]): string => {
  const segments = runs
    .map(run => {
      const color =
        run.status === 'FAILED' ? '#e74c3c' : run.status === 'PASSED' ? '#2ecc71' : '#95a5a6';
      const label = run.status === 'FAILED' ? `${run.date} — Failed` : `${run.date} — Passed`;
      return `<span style="display:inline-block;width:12px;height:12px;background:${color};border-radius:2px;margin-right:2px;cursor:default;" title="${label}"></span>`;
    })
    .join('');
  return `<span style="display:inline-flex;align-items:center;">${segments}</span>`;
};

export const formatLastPass = (
  lastPassDate: string | null,
  lastPassTime: number | null,
): string => {
  if (!lastPassDate || !lastPassTime) {
    return '<span style="color:#e74c3c;">Never passed</span>';
  }
  const dateObj = new Date(lastPassTime);
  const month = dateObj.toLocaleString('en-US', { month: 'short' });
  const day = dateObj.getDate();
  const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `Last passed: ${month} ${day} ${time}`;
};
