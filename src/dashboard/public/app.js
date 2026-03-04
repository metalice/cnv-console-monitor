let reportData = null;

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function timeAgo(ms) {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toast(message, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

function showModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// -- Tabs --
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab-content#tab-${tab}`).classList.add('active');
  document.querySelectorAll('.tab')[['overview','failures','trends','flaky'].indexOf(tab)].classList.add('active');

  if (tab === 'failures') loadFailures();
  if (tab === 'trends') loadTrends();
  if (tab === 'flaky') loadFlaky();
}

// -- Data Loading --
async function refreshData() {
  try {
    reportData = await api('/launches/report');
    renderSummary();
    renderLaunchTable();
    loadAckStatus();
    document.getElementById('lastUpdated').textContent = `Updated: ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderSummary() {
  if (!reportData) return;
  const grid = document.getElementById('summaryGrid');
  grid.innerHTML = `
    <div class="summary-stat"><div class="value">${reportData.totalLaunches}</div><div class="label">Total Launches</div></div>
    <div class="summary-stat green"><div class="value">${reportData.passedLaunches}</div><div class="label">Passed</div></div>
    <div class="summary-stat red"><div class="value">${reportData.failedLaunches}</div><div class="label">Failed</div></div>
    <div class="summary-stat yellow"><div class="value">${reportData.inProgressLaunches}</div><div class="label">In Progress</div></div>
    <div class="summary-stat red"><div class="value">${reportData.newFailures?.length || 0}</div><div class="label">New Failures</div></div>
  `;

  const badge = document.getElementById('overallBadge');
  badge.className = `status-badge ${reportData.overallHealth}`;
  document.getElementById('overallText').textContent = reportData.overallHealth === 'green' ? 'All Green' : reportData.overallHealth === 'red' ? 'Has Failures' : 'In Progress';
}

function renderLaunchTable() {
  if (!reportData) return;
  const body = document.getElementById('launchTableBody');
  const filterVersion = document.getElementById('filterVersion').value;
  const filterStatus = document.getElementById('filterStatus').value;

  const versions = new Set(reportData.groups.map(g => g.cnvVersion));
  const versionSelect = document.getElementById('filterVersion');
  if (versionSelect.options.length <= 1) {
    [...versions].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      versionSelect.appendChild(opt);
    });
  }

  let groups = reportData.groups;
  if (filterVersion) groups = groups.filter(g => g.cnvVersion === filterVersion);
  if (filterStatus) groups = groups.filter(g => g.latestLaunch.status === filterStatus);

  body.innerHTML = groups.map(g => {
    const passRateColor = g.passRate >= 95 ? 'var(--green)' : g.passRate >= 80 ? 'var(--yellow)' : 'var(--red)';
    const rowClass = g.latestLaunch.status.toLowerCase();
    const launchId = g.latestLaunch.rp_id;

    return `
      <tr class="${rowClass}" id="row-${launchId}">
        <td><strong>${g.cnvVersion}</strong></td>
        <td>${g.tier}</td>
        <td><span class="status-pill ${g.latestLaunch.status}">${g.latestLaunch.status}</span></td>
        <td>
          <div class="pass-rate-bar"><div class="pass-rate-bar-fill" style="width:${g.passRate}%;background:${passRateColor}"></div></div>
          ${g.passRate}%
        </td>
        <td>${g.passedTests}/${g.totalTests}</td>
        <td>${g.failedTests}</td>
        <td><span class="time-ago">${timeAgo(g.latestLaunch.start_time)}</span></td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            ${g.failedTests > 0 ? `<button class="btn btn-outline btn-sm" onclick="toggleFailedPanel(${launchId})">Details</button>` : ''}
            <button class="btn btn-outline btn-sm" onclick="runAnalysis(${launchId}, 'auto')" title="Auto Analysis">AA</button>
            <button class="btn btn-outline btn-sm" onclick="runAnalysis(${launchId}, 'pattern')" title="Pattern Analysis">PA</button>
          </div>
        </td>
      </tr>
      <tr id="panel-${launchId}" style="display:none;">
        <td colspan="8">
          <div class="failed-panel" id="failed-${launchId}">Loading...</div>
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleFailedPanel(launchId) {
  const panel = document.getElementById(`panel-${launchId}`);
  if (panel.style.display === 'none') {
    panel.style.display = 'table-row';
    const items = await api(`/test-items/launch/${launchId}?status=FAILED`);
    renderFailedItems(`failed-${launchId}`, items, launchId);
  } else {
    panel.style.display = 'none';
  }
}

function renderFailedItems(containerId, items, launchId) {
  const container = document.getElementById(containerId);
  if (items.length === 0) {
    container.innerHTML = '<p>No failed items found.</p>';
    return;
  }

  container.innerHTML = items.map(item => {
    const shortName = item.name.split('.').pop() || item.name;
    const polarion = item.polarion_id ? `<span class="polarion-id">${item.polarion_id}</span> ` : '';
    const prediction = item.ai_prediction && item.ai_confidence
      ? `<span class="ai-badge ${item.ai_prediction.replace('Predicted ', '').replace(/\s/g, '-').toLowerCase()}">${item.ai_prediction.replace('Predicted ', '')} ${item.ai_confidence}%</span>`
      : '';
    const jira = item.jira_key
      ? `<span class="jira-badge">${item.jira_key} (${item.jira_status || '?'})</span>`
      : '';

    return `
      <div class="failed-item">
        <div class="failed-item-name">
          ${polarion}${shortName}
          <div style="margin-top:4px">${prediction} ${jira}</div>
        </div>
        <div class="failed-item-meta">
          <button class="btn btn-outline btn-sm" onclick="showTriageModal(${item.rp_id})">Classify</button>
          <button class="btn btn-outline btn-sm" onclick="createJiraBug(${item.rp_id})">Create Bug</button>
          <button class="btn btn-outline btn-sm" onclick="showJiraLinkModal(${item.rp_id})">Link Jira</button>
        </div>
      </div>
    `;
  }).join('') + `
    <div class="action-bar">
      <button class="btn btn-outline btn-sm" onclick="runAnalysis(${launchId}, 'auto')">Run Auto-Analysis</button>
      <button class="btn btn-outline btn-sm" onclick="runAnalysis(${launchId}, 'pattern')">Run Pattern Analysis</button>
      <button class="btn btn-outline btn-sm" onclick="runAnalysis(${launchId}, 'unique')">Run Unique Error Analysis</button>
    </div>
  `;
}

// -- Failures tab --
async function loadFailures() {
  try {
    const items = await api('/test-items/untriaged');
    const container = document.getElementById('failuresList');

    if (items.length === 0) {
      container.innerHTML = '<p style="color:var(--green);padding:20px;">No untriaged failures!</p>';
      return;
    }

    container.innerHTML = items.map(item => {
      const shortName = item.name.split('.').pop() || item.name;
      const polarion = item.polarion_id ? `<span class="polarion-id">${item.polarion_id}</span> ` : '';

      return `
        <div class="failed-item">
          <div class="failed-item-name">${polarion}${shortName}</div>
          <div class="failed-item-meta">
            <button class="btn btn-outline btn-sm" onclick="showTriageModal(${item.rp_id})">Classify</button>
            <button class="btn btn-outline btn-sm" onclick="createJiraBug(${item.rp_id})">Create Bug</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// -- Trends tab --
async function loadTrends() {
  try {
    const data = await api('/launches/trends?days=30');
    renderTrendChart(data);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderTrendChart(data) {
  const canvas = document.getElementById('trendChart');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth - 48;

  const padding = { top: 30, right: 30, bottom: 50, left: 50 };
  const w = canvas.width - padding.left - padding.right;
  const h = canvas.height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (data.length === 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
    return;
  }

  const maxRate = 100;
  const xStep = w / Math.max(data.length - 1, 1);

  // grid
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + w, y);
    ctx.stroke();
    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxRate - (25 * i)}%`, padding.left - 8, y + 4);
  }

  // line
  ctx.beginPath();
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 2;
  data.forEach((d, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + h - (d.rate / maxRate) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // dots
  data.forEach((d, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + h - (d.rate / maxRate) * h;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = d.rate >= 95 ? '#2ecc71' : d.rate >= 80 ? '#f39c12' : '#e74c3c';
    ctx.fill();
  });

  // x labels
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const labelEvery = Math.max(1, Math.floor(data.length / 10));
  data.forEach((d, i) => {
    if (i % labelEvery === 0) {
      const x = padding.left + i * xStep;
      ctx.fillText(d.date.slice(5), x, padding.top + h + 20);
    }
  });
}

// -- Flaky tests tab --
async function loadFlaky() {
  try {
    const data = await api('/flaky-tests?days=14&limit=20');
    const body = document.getElementById('flakyTableBody');

    body.innerHTML = data.map(t => `
      <tr>
        <td>${t.name.split('.').pop() || t.name}</td>
        <td><strong>${t.flip_count}</strong></td>
        <td>${t.total_runs}</td>
        <td>${Math.round((t.flip_count / t.total_runs) * 100)}%</td>
      </tr>
    `).join('') || '<tr><td colspan="4">No flaky tests found</td></tr>';
  } catch (err) {
    toast(err.message, 'error');
  }
}

// -- Acknowledgment --
async function loadAckStatus() {
  try {
    const data = await api('/acknowledgment/today');
    const banner = document.getElementById('ackBanner');
    const text = document.getElementById('ackText');

    if (data.acknowledged) {
      banner.className = 'ack-banner reviewed';
      const ack = data.acknowledgments[data.acknowledgments.length - 1];
      text.textContent = `Reviewed by ${ack.reviewer} at ${new Date(ack.acknowledged_at).toLocaleTimeString()}${ack.notes ? ` — "${ack.notes}"` : ''}`;
      banner.querySelector('button').style.display = 'none';
    } else {
      banner.className = 'ack-banner not-reviewed';
      text.textContent = "Today's report has not been reviewed yet.";
      banner.querySelector('button').style.display = '';
    }
  } catch {}
}

function showAckModal() { showModal('ackModal'); }

async function submitAck() {
  const reviewer = document.getElementById('ackName').value.trim();
  const notes = document.getElementById('ackNotes').value.trim();
  if (!reviewer) { toast('Please enter your name', 'error'); return; }

  try {
    await api('/acknowledgment', {
      method: 'POST',
      body: JSON.stringify({ reviewer, notes }),
    });
    closeModal('ackModal');
    toast('Report acknowledged!');
    loadAckStatus();
  } catch (err) { toast(err.message, 'error'); }
}

// -- Triage --
function showTriageModal(itemId) {
  document.getElementById('triageItemId').value = itemId;
  showModal('triageModal');
}

async function submitTriage() {
  const itemId = document.getElementById('triageItemId').value;
  const defectType = document.getElementById('triageDefectType').value;
  const comment = document.getElementById('triageComment').value;
  const performedBy = document.getElementById('triageName').value;

  try {
    await api(`/triage/${itemId}`, {
      method: 'POST',
      body: JSON.stringify({ defectType, comment, performedBy }),
    });
    closeModal('triageModal');
    toast('Defect classified!');
    refreshData();
  } catch (err) { toast(err.message, 'error'); }
}

// -- Jira --
async function createJiraBug(itemId) {
  if (!confirm('Create a Jira bug for this test failure?')) return;
  try {
    const result = await api('/jira/create', {
      method: 'POST',
      body: JSON.stringify({ testItemId: itemId }),
    });
    if (result.existing) {
      toast(`Found existing issue: ${result.issue.key} (${result.issue.status})`);
    } else {
      toast(`Created: ${result.issue.key}`);
    }
    refreshData();
  } catch (err) { toast(err.message, 'error'); }
}

function showJiraLinkModal(itemId) {
  document.getElementById('jiraLinkItemId').value = itemId;
  document.getElementById('jiraLinkKey').value = '';
  document.getElementById('jiraSearch').value = '';
  document.getElementById('jiraSearchResults').innerHTML = '';
  showModal('jiraLinkModal');
}

async function submitJiraLink() {
  const itemId = document.getElementById('jiraLinkItemId').value;
  const jiraKey = document.getElementById('jiraLinkKey').value.trim();
  if (!jiraKey) { toast('Enter a Jira key', 'error'); return; }

  try {
    await api('/jira/link', {
      method: 'POST',
      body: JSON.stringify({ testItemId: parseInt(itemId), jiraKey }),
    });
    closeModal('jiraLinkModal');
    toast(`Linked to ${jiraKey}`);
    refreshData();
  } catch (err) { toast(err.message, 'error'); }
}

let searchTimeout;
async function searchJira() {
  const q = document.getElementById('jiraSearch').value.trim();
  if (q.length < 3) return;

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const results = await api(`/jira/search?q=${encodeURIComponent(q)}`);
      const container = document.getElementById('jiraSearchResults');
      container.innerHTML = results.map(r => `
        <div style="padding:6px 0;border-bottom:1px solid #eee;cursor:pointer;" onclick="document.getElementById('jiraLinkKey').value='${r.key}'">
          <strong>${r.key}</strong> — ${r.summary} <span class="status-pill" style="font-size:10px;padding:2px 6px;">${r.status}</span>
        </div>
      `).join('') || '<p style="color:#999;font-size:13px;">No results</p>';
    } catch {}
  }, 500);
}

// -- Analysis --
async function runAnalysis(launchId, type) {
  try {
    await api(`/analysis/${launchId}/${type}`, { method: 'POST' });
    const labels = { auto: 'Auto-Analysis', pattern: 'Pattern Analysis', unique: 'Unique Error Analysis' };
    toast(`${labels[type]} triggered!`);
  } catch (err) { toast(err.message, 'error'); }
}

// -- Filters --
function applyFilters() { renderLaunchTable(); }

// -- Init --
refreshData();
setInterval(refreshData, 5 * 60 * 1000);
