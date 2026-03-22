import React, { useMemo, useState as useLocalState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Alert, Button, Card, CardBody, CardTitle,
  Tabs, Tab, TabTitleText,
  Flex, FlexItem, Grid, GridItem,
  Label, Tooltip, Content, Spinner, Bullseye,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Select, SelectOption, SelectList, MenuToggle, type MenuToggleElement,
  ExpandableSection, Divider,
  Progress, ProgressSize, ProgressMeasureLocation,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, DownloadIcon, CopyIcon, ExternalLinkAltIcon, PencilAltIcon, CheckIcon, TimesIcon, UserIcon, InfoCircleIcon, WrenchIcon } from '@patternfly/react-icons';
import type { ReleaseInfo, ChecklistTask } from '@cnv-monitor/shared';
import { fetchVersionReadiness, fetchSubVersions } from '../../api/releases';
import { TrafficLight, computeHealth } from './TrafficLight';
import { HelpLabel } from '../common/HelpLabel';
import { RiskFlags } from './RiskFlags';
import { ReleaseReport } from './ReleaseReport';
import { BlockerWall } from './BlockerWall';
import { startChangelogJob, fetchChangelogStatus, assessRisk, saveChangelogEdits, type ChangelogResult, type ChangelogItem, type ChangelogStatus, type ChangelogCorrection, type RiskAssessment } from '../../api/ai';

const ReadinessGauge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 80 ? 'var(--pf-t--global--color--status--success--default)'
    : score >= 50 ? 'var(--pf-t--global--color--status--warning--default)'
    : 'var(--pf-t--global--color--status--danger--default)';
  return (
    <Tooltip content={`Readiness score: ${score}%`}>
      <div className="app-readiness-gauge">
        <svg viewBox="0 0 36 36" width="64" height="64">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="var(--pf-t--global--border--color--default)" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score}, 100`} strokeLinecap="round" />
          <text x="18" y="21" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{score}%</text>
        </svg>
      </div>
    </Tooltip>
  );
};

const MILESTONE_TYPE_COLORS: Record<string, string> = {
  ga: 'var(--pf-t--global--color--status--danger--default)',
  batch: 'var(--pf-t--global--color--brand--default)',
  feature_freeze: 'var(--pf-t--global--color--status--warning--default)',
  code_freeze: 'var(--pf-t--global--color--status--warning--default)',
  blockers_only: 'var(--pf-t--global--color--status--danger--default)',
  custom: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
};

const extractShortName = (name: string): string => {
  const ver = name.match(/(\d+\.\d+\.?\d*)/);
  if (ver) return ver[1];
  if (name.toLowerCase().includes('feature freeze')) return 'FF';
  if (name.toLowerCase().includes('code freeze')) return 'CF';
  if (name.toLowerCase().includes('blocker')) return 'BO';
  return name.substring(0, 10);
};

const MilestoneTimeline: React.FC<{ release: ReleaseInfo }> = ({ release }) => {
  return (
    <div className="app-ms-strip-scroll">
      <div className="app-ms-strip">
        <div className="app-ms-line" />
        {release.milestones.map((m, i) => {
          const color = MILESTONE_TYPE_COLORS[m.type] ?? 'var(--pf-t--global--border--color--default)';
          return (
            <Tooltip key={i} content={`${m.name} — ${new Date(m.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>
              <div className={`app-ms-point ${m.isPast ? 'app-ms-past' : ''}`}>
                <div className="app-ms-dot" style={{ background: color }} />
                <span className="app-ms-label-top">{extractShortName(m.name)}</span>
                <span className="app-ms-label-bot">
                  {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

const WorkloadChart: React.FC<{ tasks: ChecklistTask[] }> = ({ tasks }) => {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === 'Closed') continue;
      const assignee = t.assignee || 'Unassigned';
      counts.set(assignee, (counts.get(assignee) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tasks]);

  if (data.length === 0) return <Content component="p" className="app-text-muted">No open items</Content>;
  const max = data[0][1];

  return (
    <div className="app-comp-chart">
      {data.map(([name, count]) => (
        <div key={name} className="app-comp-row">
          <span className="app-comp-label app-text-xs">{name.split('@')[0]}</span>
          <div className="app-comp-bar-track">
            <div className="app-comp-bar" style={{ width: `${Math.max(2, (count / max) * 100)}%` }} />
          </div>
          <span className="app-comp-count app-text-xs app-text-muted">{count}</span>
        </div>
      ))}
    </div>
  );
};

type VersionDashboardProps = {
  release: ReleaseInfo;
  checklist?: ChecklistTask[];
  onClose?: () => void;
};

export const VersionDashboard: React.FC<VersionDashboardProps> = ({ release, checklist, onClose }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const version = release.shortname;

  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryKey: ['versionReadiness', version],
    queryFn: () => fetchVersionReadiness(version),
    staleTime: 5 * 60 * 1000,
  });

  const checklistDone = (checklist ?? []).filter(t => t.status === 'Closed').length;
  const checklistTotal = (checklist ?? []).length;

  const health = computeHealth({
    checklistDone,
    checklistTotal,
    passRate: readiness?.passRate ?? undefined,
    daysUntilNext: release.daysUntilNext,
  });

  const readinessScore = useMemo(() => {
    const checklistPct = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 100;
    const testPct = readiness?.passRate ?? 100;
    return Math.round(checklistPct * 0.5 + testPct * 0.5);
  }, [checklistDone, checklistTotal, readiness]);

  return (
    <Card>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem><TrafficLight status={health.status} reason={health.reason} size={16} /></FlexItem>
              <FlexItem>{release.shortname.replace('cnv-', 'CNV ')} Dashboard</FlexItem>
              <FlexItem><Label color={release.phase.includes('Maintenance') ? 'green' : release.phase.includes('Development') ? 'blue' : 'purple'} isCompact>{release.phase}</Label></FlexItem>
            </Flex>
          </FlexItem>
          {onClose && (
            <FlexItem>
              <Button variant="plain" onClick={onClose} aria-label="Close dashboard">&times;</Button>
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        <Grid hasGutter className="app-mb-md">
          <GridItem span={12} md={3}>
            <div className="app-text-block-center">
              <ReadinessGauge score={readinessScore} />
              <HelpLabel label="Readiness" help="Composite score combining checklist completion (50%) and test pass rate (50%). Higher is better." />
            </div>
          </GridItem>
          <GridItem span={12} md={3}>
            <DescriptionList isCompact isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm><HelpLabel label="Checklist" help="Jira release checklist tasks. Shows completed vs total." /></DescriptionListTerm>
                <DescriptionListDescription>{checklistDone}/{checklistTotal} done</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm><HelpLabel label="Pass Rate" help="Test pass rate from ReportPortal launches matching this CNV version in the last 14 days." /></DescriptionListTerm>
                <DescriptionListDescription>
                  {readinessLoading ? <Spinner size="sm" /> : readiness?.passRate !== null ? `${readiness?.passRate}%` : '--'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm><HelpLabel label="Next Release" help="Days until the next scheduled batch or GA release for this version." /></DescriptionListTerm>
                <DescriptionListDescription>
                  {release.daysUntilNext !== null ? (
                    <Label color={release.daysUntilNext <= 3 ? 'red' : release.daysUntilNext <= 7 ? 'orange' : 'green'} isCompact>
                      {release.daysUntilNext}d
                    </Label>
                  ) : '--'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm><HelpLabel label="Launches" help="Number of test launches from ReportPortal for this version in the last 14 days." /></DescriptionListTerm>
                <DescriptionListDescription>{readiness?.totalLaunches ?? '--'}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </GridItem>
          <GridItem span={12} md={6}>
            {readiness && readiness.trend.length > 0 && (
              <div>
                <HelpLabel label="Pass rate trend (14 days)" help="Daily test pass rate for this version. Green dots are ≥85%, yellow dots are below." />
                <svg viewBox="0 0 200 40" className="app-trend-chart">
                  {readiness.trend.map((d, i) => {
                    const x = (i / Math.max(readiness.trend.length - 1, 1)) * 196 + 2;
                    const y = d.passRate !== null ? 38 - (d.passRate / 100) * 36 : 38;
                    const color = d.passRate !== null && d.passRate >= 85 ? 'var(--pf-t--global--color--status--success--default)' : 'var(--pf-t--global--color--status--warning--default)';
                    return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />;
                  })}
                  <polyline
                    points={readiness.trend.map((d, i) => {
                      const x = (i / Math.max(readiness.trend.length - 1, 1)) * 196 + 2;
                      const y = d.passRate !== null ? 38 - (d.passRate / 100) * 36 : 38;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke="var(--pf-t--global--color--brand--default)" strokeWidth="1.5" opacity="0.5"
                  />
                </svg>
              </div>
            )}
          </GridItem>
        </Grid>

        <RiskFlags release={release} checklist={checklist} readiness={readiness} />

        <Flex className="app-mb-md" spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem><ReleaseReport release={release} checklist={checklist} readiness={readiness} /></FlexItem>
        </Flex>

        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>Milestones</TabTitleText>}>
            <div className="app-mt-md">
              <MilestoneTimeline release={release} />
            </div>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Workload ({(checklist ?? []).filter(t => t.status !== 'Closed').length} open)</TabTitleText>}>
            <div className="app-mt-md">
              <WorkloadChart tasks={checklist ?? []} />
            </div>
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Blockers</TabTitleText>}>
            <div className="app-mt-md">
              <BlockerWall version={version} />
            </div>
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>AI Changelog <Tooltip content="AI-generated changelog from Jira issues. Select sub-versions to compare what changed between releases."><OutlinedQuestionCircleIcon className="app-help-icon" /></Tooltip></TabTitleText>}>
            <ChangelogTab version={version} milestones={release.milestones} />
          </Tab>
          <Tab eventKey={4} title={<TabTitleText>AI Risk <Tooltip content="AI evaluates release readiness based on checklist progress, test pass rates, open blockers, and trends. Returns Ship / Hold / Needs Attention verdict."><OutlinedQuestionCircleIcon className="app-help-icon" /></Tooltip></TabTitleText>}>
            <RiskTab version={version} release={release} checklist={checklist} readiness={readiness} />
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
};

const CATEGORY_LABELS: Record<string, { label: string; color: 'green' | 'blue' | 'purple' | 'orange' | 'grey' }> = {
  features: { label: 'Features', color: 'green' },
  bugFixes: { label: 'Bug Fixes', color: 'red' as 'orange' },
  improvements: { label: 'Improvements', color: 'blue' },
  infrastructure: { label: 'Infrastructure', color: 'purple' },
  documentation: { label: 'Documentation', color: 'grey' },
};

const isVersionReleased = (versionName: string, milestones: Array<{ name: string; date: string; isPast: boolean }>): boolean => {
  const ver = versionName.match(/(\d+\.\d+\.?\d*)/)?.[1];
  if (!ver) return false;
  return milestones.some(m => {
    const mVer = m.name.match(/(\d+\.\d+\.?\d*)/)?.[1];
    return mVer === ver && m.isPast;
  });
};

const CATEGORY_KEYS = ['features', 'bugFixes', 'improvements', 'infrastructure', 'documentation'] as const;

const ConfidenceBadge: React.FC<{ confidence?: number; reason?: string }> = ({ confidence, reason }) => {
  if (confidence === undefined || confidence === null) return null;
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? 'green' : pct >= 70 ? 'grey' : 'orange';
  return (
    <Tooltip content={reason || `Confidence: ${pct}%`}>
      <Label color={color} isCompact className="app-ml-xs">
        {pct}%{pct < 70 ? ' ⚠' : ''}
      </Label>
    </Tooltip>
  );
};

const ChangelogTab: React.FC<{ version: string; milestones: Array<{ name: string; date: string; isPast: boolean }> }> = ({ version, milestones }) => {
  const [result, setResult] = useLocalState<ChangelogResult | null>(null);
  const [targetVer, setTargetVer] = useLocalState('');
  const [compareFrom, setCompareFrom] = useLocalState('');
  const [compareEnabled, setCompareEnabled] = useLocalState(false);
  const [targetOpen, setTargetOpen] = useLocalState(false);
  const [compareOpen, setCompareOpen] = useLocalState(false);
  const [componentFilter, setComponentFilter] = useLocalState('');
  const [editMode, setEditMode] = useLocalState(false);
  const [pendingEdits, setPendingEdits] = useLocalState<ChangelogCorrection[]>([]);
  const [savingEdits, setSavingEdits] = useLocalState(false);
  const [showLowConfidence, setShowLowConfidence] = useLocalState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  const addEdit = (correction: ChangelogCorrection) => {
    setPendingEdits(prev => {
      const existing = prev.findIndex(e => e.key === correction.key && e.field === correction.field);
      if (existing >= 0) { const next = [...prev]; next[existing] = correction; return next; }
      return [...prev, correction];
    });
  };

  const handleSaveEdits = async () => {
    if (pendingEdits.length === 0) return;
    setSavingEdits(true);
    try {
      await saveChangelogEdits(version, pendingEdits, targetVer, compareEnabled && compareFrom ? compareFrom : undefined);
      setPendingEdits([]);
      setEditMode(false);
      const status = await fetchChangelogStatus(targetVer, compareEnabled && compareFrom ? compareFrom : undefined);
      if (status.status === 'done' && status.changelog) {
        setResult({ changelog: status.changelog, meta: status.meta! } as ChangelogResult);
      }
    } catch { /* save failed */ }
    setSavingEdits(false);
  };

  const { data: subVersions } = useQuery({
    queryKey: ['subVersions', version],
    queryFn: () => fetchSubVersions(version),
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (subVersions?.length && !targetVer) {
      const latest = subVersions[subVersions.length - 1];
      setTargetVer(latest.name);
    }
  }, [subVersions, targetVer, setTargetVer]);

  const [jobStatus, setJobStatus] = useLocalState<ChangelogStatus | null>(null);
  const [isGenerating, setIsGenerating] = useLocalState(false);
  const pollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollForResult = React.useCallback(() => {
    if (!targetVer) return;
    fetchChangelogStatus(targetVer, compareEnabled && compareFrom ? compareFrom : undefined)
      .then(status => {
        setJobStatus(status);
        if (status.status === 'done' && status.changelog) {
          setResult({ changelog: status.changelog, meta: status.meta! } as ChangelogResult);
          setIsGenerating(false);
        } else if (status.status === 'running') {
          setIsGenerating(true);
          pollRef.current = setTimeout(pollForResult, 2000);
        } else if (status.status === 'error') {
          setIsGenerating(false);
        }
      })
      .catch(() => {});
  }, [targetVer, compareFrom, compareEnabled, setResult, setIsGenerating, setJobStatus]);

  React.useEffect(() => {
    if (!targetVer) return;
    pollForResult();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [targetVer, compareFrom, pollForResult]);

  const startGeneration = async () => {
    setIsGenerating(true);
    setResult(null);
    setJobStatus({ status: 'running', progress: 'Starting...', step: 'starting' });
    try {
      await startChangelogJob(version, targetVer, compareEnabled && compareFrom ? compareFrom : undefined);
      pollRef.current = setTimeout(pollForResult, 1000);
    } catch (err) {
      setJobStatus({ status: 'error', error: err instanceof Error ? err.message : 'Failed to start' });
      setIsGenerating(false);
    }
  };

  const mutation = { isPending: isGenerating, isError: false, error: null, mutate: startGeneration };

  const cl = result?.changelog;
  const hasCategories = cl?.categories && Object.values(cl.categories).some(items => items && items.length > 0);
  const totalItems = cl?.categories ? Object.values(cl.categories).reduce((sum, items) => sum + (items?.length ?? 0), 0) : 0;

  const filterItems = (items: ChangelogItem[]): ChangelogItem[] => {
    let filtered = items;
    if (componentFilter) {
      filtered = filtered.filter(item => item.component?.toLowerCase().includes(componentFilter.toLowerCase()));
    }
    if (showLowConfidence) {
      filtered = filtered.filter(item => item.confidence !== undefined && item.confidence < 0.7);
    }
    return filtered;
  };

  const buildSlackText = (): string => {
    if (!result || !cl) return '';
    const lines: string[] = [];
    lines.push(`:rocket: *${result.meta.label} Changelog*`);
    if (cl.summary) lines.push(`> ${cl.summary}`);
    if (cl.categories) {
      for (const [cat, items] of Object.entries(cl.categories)) {
        if (!items?.length) continue;
        const label = CATEGORY_LABELS[cat]?.label ?? cat;
        lines.push(`\n*${label} (${items.length}):*`);
        items.slice(0, 15).forEach(item => {
          lines.push(`• ${item.key ? `<https://issues.redhat.com/browse/${item.key}|${item.key}>` : ''} ${item.title || ''}`);
          if (item.ticketSummary) lines.push(`  _${item.ticketSummary}_`);
        });
        if (items.length > 15) lines.push(`_...and ${items.length - 15} more_`);
      }
    }
    return lines.join('\n');
  };

  const handlePdf = () => {
    if (!reportRef.current) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${result?.meta.label ?? ''} Changelog</title>
      <style>body{font-family:RedHatText,-apple-system,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#151515}h1{font-size:22px;border-bottom:2px solid #06c;padding-bottom:8px}h2{font-size:16px;color:#06c;margin-top:20px}.item{padding:3px 0;border-bottom:1px solid #eee;font-size:13px}.key{font-weight:600;min-width:90px;display:inline-block}.badge{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600}.summary{padding:12px;background:#f0f0f0;border-left:4px solid #06c;border-radius:4px;margin:12px 0}.footer{margin-top:24px;font-size:10px;color:#6a6e73;border-top:1px solid #d2d2d2;padding-top:8px}</style></head>
      <body><h1>${result?.meta.label ?? ''} Changelog</h1><p>Generated: ${new Date().toLocaleString()}</p>${reportRef.current.innerHTML}<div class="footer">Generated by CNV Console Monitor</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="app-mt-md">
      <Flex spaceItems={{ default: 'spaceItemsMd' }} alignItems={{ default: 'alignItemsFlexEnd' }} className="app-mb-md" flexWrap={{ default: 'wrap' }}>
        <FlexItem>
          <Content component="small" className="app-text-muted app-mb-xs">Target Version</Content>
          <Select isOpen={targetOpen} onOpenChange={setTargetOpen}
            toggle={(ref: React.Ref<MenuToggleElement>) => (
              <MenuToggle ref={ref} onClick={() => setTargetOpen(o => !o)} isExpanded={targetOpen} className="app-max-w-250">
                {targetVer || 'Select version'}
              </MenuToggle>
            )}
            onSelect={(_e, val) => { setTargetVer(val as string); setTargetOpen(false); setResult(null); }}
          >
            <SelectList>
              {(subVersions ?? []).map(v => {
                const released = isVersionReleased(v.name, milestones);
                return <SelectOption key={v.name} value={v.name}>{v.name}{released ? '' : ' (upcoming)'}</SelectOption>;
              })}
            </SelectList>
          </Select>
        </FlexItem>
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }} className="app-mb-xs">
            <FlexItem>
              <input type="checkbox" id="compare-enable" checked={compareEnabled} onChange={e => { setCompareEnabled(e.target.checked); if (!e.target.checked) { setCompareFrom(''); setResult(null); } }} />
            </FlexItem>
            <FlexItem>
              <Tooltip content="Enable to compare changes between two sub-versions. Shows only what's new in the target version compared to the selected base version.">
                <label htmlFor="compare-enable" className="app-text-xs" style={{ cursor: 'pointer' }}>Compare with previous version</label>
              </Tooltip>
            </FlexItem>
          </Flex>
          {compareEnabled && (
            <Select isOpen={compareOpen} onOpenChange={setCompareOpen}
              toggle={(ref: React.Ref<MenuToggleElement>) => (
                <MenuToggle ref={ref} onClick={() => setCompareOpen(o => !o)} isExpanded={compareOpen} className="app-max-w-250">
                  {compareFrom || 'Select base version'}
                </MenuToggle>
              )}
              onSelect={(_e, val) => { setCompareFrom(val as string); setCompareOpen(false); setResult(null); }}
            >
              <SelectList>
                {(subVersions ?? []).filter(v => v.name !== targetVer).map(v => <SelectOption key={v.name} value={v.name}>{v.name}</SelectOption>)}
              </SelectList>
            </Select>
          )}
        </FlexItem>
        <FlexItem>
          <Button variant="primary" onClick={() => mutation.mutate()} isLoading={mutation.isPending} isDisabled={!targetVer || mutation.isPending}>
            {mutation.isPending ? 'Generating...' : 'Generate Changelog'}
          </Button>
        </FlexItem>
      </Flex>

      {mutation.isPending && jobStatus?.status === 'running' && (
        <div className="app-changelog-progress app-mb-md">
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="app-mb-xs">
            <FlexItem>
              <Content component="small"><strong>{jobStatus.progress}</strong></Content>
            </FlexItem>
            <FlexItem>
              <Content component="small" className="app-text-muted">
                {jobStatus.totalIssues ? `${jobStatus.totalIssues.toLocaleString()} issues` : ''}
                {jobStatus.totalBatches ? ` · ${jobStatus.currentBatch}/${jobStatus.totalBatches} batches` : ''}
                {jobStatus.elapsedSeconds ? ` · ${jobStatus.elapsedSeconds}s` : ''}
              </Content>
            </FlexItem>
          </Flex>
          {jobStatus.totalBatches && jobStatus.totalBatches > 0 ? (
            <Progress
              value={jobStatus.step === 'summarizing' ? 95 : jobStatus.currentBatch && jobStatus.totalBatches ? Math.round((jobStatus.currentBatch / jobStatus.totalBatches) * 90) : 5}
              size={ProgressSize.sm}
              measureLocation={ProgressMeasureLocation.outside}
              aria-label="Changelog generation progress"
            />
          ) : (
            <Progress value={undefined} size={ProgressSize.sm} aria-label="Loading" />
          )}
          {jobStatus.log && jobStatus.log.length > 0 && (
            <div className="app-changelog-log app-mt-sm" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
              {jobStatus.log.map((entry, i) => (
                <div key={i} className={`app-changelog-log-entry app-changelog-log-${entry.type}`}>
                  <span className="app-changelog-log-time">{new Date(entry.time).toLocaleTimeString()}</span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {jobStatus?.status === 'error' && (
        <Alert variant="danger" isInline title={jobStatus.error || 'Generation failed'} className="app-mb-md" />
      )}

      {result && (
        <div ref={reportRef}>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="app-mb-md">
            <FlexItem>
              <Label color="blue" isCompact className="app-mr-sm">{result.meta.label}</Label>
              <span className="app-text-xs app-text-muted">
                {result.meta.issueCount} issues
                {result.meta.batches > 1 ? ` (${result.meta.batches} batches)` : ''}
                {' · '}{result.meta.tokensUsed} tokens
                {result.meta.cached ? ' · cached' : ''}
                {' · '}{result.meta.model}
              </span>
            </FlexItem>
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><Button variant="plain" icon={<DownloadIcon />} onClick={handlePdf} size="sm" aria-label="Download PDF" /></FlexItem>
                <FlexItem><Button variant="plain" icon={<CopyIcon />} onClick={() => navigator.clipboard.writeText(buildSlackText())} size="sm" aria-label="Copy Slack" /></FlexItem>
                <FlexItem>
                  <Tooltip content="Open Jira filter for this version">
                    <Button variant="plain" icon={<ExternalLinkAltIcon />} size="sm" aria-label="Jira filter"
                      onClick={() => window.open(`https://issues.redhat.com/issues/?jql=project%3DCNV%20AND%20fixVersion%3D%22${encodeURIComponent(result.meta.targetVersion)}%22`, '_blank')} />
                  </Tooltip>
                </FlexItem>
                <FlexItem>
                  <Tooltip content="Copy shareable link">
                    <Button variant="plain" icon={<CopyIcon />} size="sm" aria-label="Copy link"
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('clTarget', result.meta.targetVersion);
                        if (result.meta.compareFrom) url.searchParams.set('clFrom', result.meta.compareFrom);
                        navigator.clipboard.writeText(url.toString());
                      }} />
                  </Tooltip>
                </FlexItem>
                <FlexItem>
                <Tooltip content={editMode ? 'Exit edit mode' : 'Edit classifications, impact scores, and risk levels'}>
                  <Button variant={editMode ? 'secondary' : 'plain'} icon={editMode ? <TimesIcon /> : <PencilAltIcon />} size="sm" aria-label="Edit"
                    onClick={() => { if (editMode && pendingEdits.length > 0) { handleSaveEdits(); } else { setEditMode(!editMode); setPendingEdits([]); } }} />
                </Tooltip>
              </FlexItem>
              <FlexItem><Button variant="link" size="sm" onClick={() => { setResult(null); mutation.mutate(); }}>Regenerate</Button></FlexItem>
              </Flex>
            </FlexItem>
          </Flex>

          {editMode && (
            <Alert variant="info" isInline isPlain title={`Edit mode: ${pendingEdits.length} pending change${pendingEdits.length !== 1 ? 's' : ''}`} className="app-mb-sm">
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button variant="primary" size="sm" isDisabled={pendingEdits.length === 0} isLoading={savingEdits} onClick={handleSaveEdits}>
                    <CheckIcon className="app-mr-xs" />Save Edits
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button variant="link" size="sm" onClick={() => { setEditMode(false); setPendingEdits([]); }}>Cancel</Button>
                </FlexItem>
              </Flex>
            </Alert>
          )}

          {cl?.summary && (
            <div className="app-changelog-summary app-mb-md">
              <Content component="p">{typeof cl.summary === 'string' ? cl.summary : JSON.stringify(cl.summary)}</Content>
            </div>
          )}

          {cl?.highlights && (
            <div className="app-changelog-highlights app-mb-md">
              <Content component="h5" className="app-mb-xs"><InfoCircleIcon className="app-mr-xs" />Key Highlights</Content>
              {typeof cl.highlights === 'string' ? (
                cl.highlights.includes('\n') ? (
                  <ul className="app-text-sm">{cl.highlights.split('\n').filter(l => l.trim()).map((line, i) => <li key={i}>{line.replace(/^[-•*]\s*/, '')}</li>)}</ul>
                ) : (
                  <Content component="p" className="app-text-sm">{cl.highlights}</Content>
                )
              ) : (
                <Content component="p" className="app-text-sm">{JSON.stringify(cl.highlights)}</Content>
              )}
            </div>
          )}

          {cl?.breakingChanges && cl.breakingChanges.length > 0 && (
            <Alert variant="danger" isInline title={`${cl.breakingChanges.length} Breaking Changes`} className="app-mb-md">
              <ul className="app-text-xs">{cl.breakingChanges.map((bc, i) => (
                <li key={i}>{typeof bc === 'string' ? bc : (bc as Record<string, unknown>).title ? `${(bc as Record<string, unknown>).key || ''} — ${(bc as Record<string, unknown>).title}` : JSON.stringify(bc)}</li>
              ))}</ul>
            </Alert>
          )}

          {hasCategories && (
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="app-mb-md">
              <FlexItem>
                {Object.entries(cl!.categories!).map(([cat, items]) => {
                  if (!items?.length) return null;
                  const meta = CATEGORY_LABELS[cat] || { label: cat, color: 'grey' as const };
                  return <Label key={cat} color={meta.color} isCompact className="app-mr-sm">{meta.label}: {items.length}</Label>;
                })}
                <span className="app-text-xs app-text-muted app-ml-sm">{totalItems} total</span>
              </FlexItem>
              <FlexItem>
                <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <input
                      type="text"
                      value={componentFilter}
                      onChange={e => setComponentFilter(e.target.value)}
                      placeholder="Filter by component..."
                      className="app-search-input"
                      style={{ width: 180 }}
                    />
                    {componentFilter && (
                      <Button variant="plain" size="sm" onClick={() => setComponentFilter('')} aria-label="Clear filter">&times;</Button>
                    )}
                  </FlexItem>
                  <FlexItem>
                    <Tooltip content="Show only items with low AI confidence (<70%) that may need human review">
                      <Button variant={showLowConfidence ? 'secondary' : 'plain'} size="sm"
                        onClick={() => setShowLowConfidence(!showLowConfidence)}>
                        {showLowConfidence ? 'All items' : '⚠ Low confidence'}
                      </Button>
                    </Tooltip>
                  </FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          )}

          {hasCategories && Object.entries(cl!.categories!).map(([cat, items]) => {
            if (!items?.length) return null;
            const filtered = filterItems(items);
            if (filtered.length === 0) return null;
            const meta = CATEGORY_LABELS[cat] || { label: cat, color: 'grey' as const };
            return (
              <ExpandableSection key={cat} toggleText={`${meta.label} (${filtered.length})`} isIndented className="app-mb-sm">
                <div className="app-changelog-list">
                  {filtered.map((item, i) => (
                    <div key={i} className="app-changelog-item-wrap">
                      <div className="app-changelog-item">
                        {item.key && (
                          <a href={`https://issues.redhat.com/browse/${item.key}`} target="_blank" rel="noreferrer" className="app-changelog-key">
                            {item.key} <ExternalLinkAltIcon className="app-text-xs" />
                          </a>
                        )}
                        <Tooltip content={item.reasoning || item.title || ''} maxWidth="400px">
                          <span className="app-changelog-title">{item.title || ''}</span>
                        </Tooltip>
                        {item.component && <Label color="grey" isCompact className="app-ml-xs">{item.component}</Label>}
                        {editMode && item.key ? (
                          <>
                            <select className="app-edit-select app-ml-xs" defaultValue={cat}
                              onChange={e => addEdit({ key: item.key!, field: 'category', oldValue: cat, newValue: e.target.value, context: item.title })}>
                              {CATEGORY_KEYS.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]?.label || c}</option>)}
                            </select>
                            <select className="app-edit-select app-ml-xs" defaultValue={String(item.impactScore ?? 3)}
                              onChange={e => addEdit({ key: item.key!, field: 'impactScore', oldValue: String(item.impactScore ?? 3), newValue: e.target.value, context: item.title })}>
                              {[1,2,3,4,5].map(n => <option key={n} value={String(n)}>{'★'.repeat(n)}</option>)}
                            </select>
                            <select className="app-edit-select app-ml-xs" defaultValue={item.risk || 'low'}
                              onChange={e => addEdit({ key: item.key!, field: 'risk', oldValue: item.risk || 'low', newValue: e.target.value, context: item.title })}>
                              <option value="low">low risk</option>
                              <option value="medium">medium risk</option>
                              <option value="high">high risk</option>
                            </select>
                          </>
                        ) : (
                          <>
                            {item.impactScore && (
                              <Tooltip content={`Impact: ${item.impactScore}/5`}>
                                <Label color={item.impactScore >= 4 ? 'red' : item.impactScore >= 3 ? 'orange' : 'grey'} isCompact className="app-ml-xs">
                                  {'★'.repeat(item.impactScore)}
                                </Label>
                              </Tooltip>
                            )}
                            {item.risk && item.risk !== 'low' && (
                              <Label color={item.risk === 'high' ? 'red' : 'orange'} isCompact className="app-ml-xs">{item.risk} risk</Label>
                            )}
                          </>
                        )}
                        <ConfidenceBadge confidence={item.confidence} reason={item.confidenceReason} />
                        {item.prLinks && item.prLinks.length > 0 && item.prLinks.map((pr, pi) => (
                          <a key={pi} href={typeof pr === 'string' ? pr : '#'} target="_blank" rel="noreferrer" className="app-text-xs app-ml-xs">
                            PR <ExternalLinkAltIcon />
                          </a>
                        ))}
                      </div>
                      {(item.ticketSummary || item.status || item.assignee || item.availableIn || item.buildInfo || item.blockedBy) && (() => {
                        const avail = typeof item.availableIn === 'object' && item.availableIn ? item.availableIn : null;
                        const availStr = typeof item.availableIn === 'string' ? item.availableIn : null;
                        const availVersion = avail?.version || availStr || null;

                        const availTooltipLines: string[] = [];
                        if (avail) {
                          if (avail.evidence) availTooltipLines.push(`📋 ${avail.evidence}`);
                          if (avail.build) availTooltipLines.push(`🔧 Build: ${avail.build}${avail.buildDate ? ` (${avail.buildDate})` : ''}`);
                          if (avail.prMergedTo) availTooltipLines.push(`🔀 PR merged to: ${avail.prMergedTo}${avail.prMergedDate ? ` on ${avail.prMergedDate}` : ''}`);
                          if (item.resolvedDate) availTooltipLines.push(`✅ Resolved: ${item.resolvedDate}`);
                        } else {
                          if (item.availableInReason) availTooltipLines.push(item.availableInReason);
                          else if (item.buildInfo) availTooltipLines.push(`Build info: ${item.buildInfo}`);
                          if (item.resolvedDate) availTooltipLines.push(`Resolved: ${item.resolvedDate}`);
                          if (availTooltipLines.length === 0) availTooltipLines.push(`Version determined from Jira fixVersion field. Regenerate the changelog for detailed evidence.`);
                        }
                        const availTooltip = availTooltipLines.join('\n');

                        return (
                        <div className="app-changelog-ticket-detail">
                          {item.ticketSummary && (
                            <div className="app-changelog-ticket-summary">{item.ticketSummary}</div>
                          )}
                          <div className="app-changelog-ticket-meta">
                            {item.status && (
                              <Tooltip content={`Status: ${item.status}${item.resolution ? ` (${item.resolution})` : ''}${item.resolvedDate ? ` — resolved ${item.resolvedDate}` : ''}`}>
                                <span className="app-changelog-meta-item">
                                  <Label color={item.status === 'Closed' || item.status === 'Done' ? 'green' : item.status === 'In Progress' ? 'blue' : 'grey'} isCompact variant="outline">
                                    {item.status}
                                  </Label>
                                </span>
                              </Tooltip>
                            )}
                            {item.assignee && (
                              <Tooltip content={`Assignee: ${item.assignee}`}>
                                <span className="app-changelog-meta-item"><UserIcon className="app-text-xs" /> {item.assignee}</span>
                              </Tooltip>
                            )}
                            {availVersion && (
                              <Tooltip content={<div style={{ whiteSpace: 'pre-line' }}>{availTooltip}</div>} maxWidth="450px">
                                <Label color="blue" isCompact variant="outline" className="app-changelog-meta-item app-cursor-help">
                                  {availVersion}{avail?.build ? ` (${avail.build})` : ''}
                                </Label>
                              </Tooltip>
                            )}
                            {avail?.prMergedTo && (
                              <Tooltip content={`PR merged to branch ${avail.prMergedTo}${avail.prMergedDate ? ` on ${avail.prMergedDate}` : ''}`}>
                                <span className="app-changelog-meta-item app-text-xs app-text-muted app-cursor-help">
                                  → {avail.prMergedTo}
                                </span>
                              </Tooltip>
                            )}
                            {item.buildInfo && !availVersion && (
                              <Tooltip content={`Build: ${item.buildInfo}`}>
                                <span className="app-changelog-meta-item"><WrenchIcon className="app-text-xs" /> {item.buildInfo}</span>
                              </Tooltip>
                            )}
                            {item.blockedBy && (
                              <Label color="red" isCompact variant="outline" className="app-changelog-meta-item">
                                Blocked: {item.blockedBy}
                              </Label>
                            )}
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </ExpandableSection>
            );
          })}

          {result.meta.contributors && result.meta.contributors.length > 0 && (
            <ExpandableSection toggleText={`Contributors (${result.meta.contributors.length})`} className="app-mt-md">
              <div className="app-report-workload">
                {result.meta.contributors.map(c => (
                  <Flex key={c.name} spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }} className="app-mb-xs">
                    <FlexItem style={{ minWidth: 140 }}><span className="app-text-xs">{c.name}</span></FlexItem>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <Progress value={result.meta.contributors ? (c.count / result.meta.contributors[0].count) * 100 : 0} size={ProgressSize.sm} measureLocation={ProgressMeasureLocation.none} />
                    </FlexItem>
                    <FlexItem><span className="app-text-xs app-text-muted">{c.count}</span></FlexItem>
                  </Flex>
                ))}
              </div>
            </ExpandableSection>
          )}

          {cl?.epicStatus && cl.epicStatus.length > 0 && (
            <ExpandableSection toggleText={`Epic Status (${cl.epicStatus.length})`} className="app-mb-sm">
              {cl.epicStatus.map((epic, i) => (
                <div key={i} className="app-changelog-item">
                  <a href={`https://issues.redhat.com/browse/${epic.key}`} target="_blank" rel="noreferrer" className="app-changelog-key">{epic.key}</a>
                  <span className="app-changelog-title">{epic.title}</span>
                  <Label color={epic.status === 'complete' ? 'green' : epic.status === 'blocked' ? 'red' : 'orange'} isCompact className="app-ml-xs">
                    {epic.childrenDone}/{epic.childrenTotal} done
                  </Label>
                </div>
              ))}
            </ExpandableSection>
          )}

          {cl?.concerns && cl.concerns.length > 0 && (
            <Alert variant="warning" isInline title={`${cl.concerns.length} Concerns`} className="app-mb-md">
              <ul className="app-text-xs">
                {cl.concerns.map((c, i) => <li key={i}>{typeof c === 'string' ? c : JSON.stringify(c)}</li>)}
              </ul>
            </Alert>
          )}

          {cl?.testImpact && (cl.testImpact.newlyPassing > 0 || cl.testImpact.newlyFailing > 0) && (
            <div className="app-mb-md">
              <Content component="h5" className="app-mb-xs">Test Impact</Content>
              <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                {cl.testImpact.newlyPassing > 0 && (
                  <FlexItem><Label color="green" isCompact>{cl.testImpact.newlyPassing} newly passing</Label></FlexItem>
                )}
                {cl.testImpact.newlyFailing > 0 && (
                  <FlexItem><Label color="red" isCompact>{cl.testImpact.newlyFailing} newly failing</Label></FlexItem>
                )}
              </Flex>
              {cl.testImpact.details && cl.testImpact.details.length > 0 && (
                <ul className="app-text-xs app-mt-xs">
                  {cl.testImpact.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          )}

          {!hasCategories && !cl?.summary && (
            <Alert variant="warning" isInline title="AI response could not be parsed into structured categories" className="app-mb-md">
              <Content component="p" className="app-text-xs">
                The AI returned a response that could not be parsed as a structured changelog. This usually happens when the AI wraps the response in extra text or the JSON is malformed.
                Try clicking &quot;Regenerate&quot; above. {cl?.raw ? 'The raw AI output is shown below.' : ''}
              </Content>
            </Alert>
          )}

          {cl?.raw && (
            <ExpandableSection toggleText="Raw AI Output" className="app-mb-md">
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflow: 'auto', padding: 12, background: 'var(--pf-t--global--background--color--secondary--default)', borderRadius: 6, border: '1px solid var(--pf-t--global--border--color--default)' }}>
                {cl.raw}
              </pre>
            </ExpandableSection>
          )}
        </div>
      )}
    </div>
  );
};

const RiskTab: React.FC<{ version: string; release: ReleaseInfo; checklist?: ChecklistTask[]; readiness?: { passRate: number | null; totalLaunches: number; trend: Array<{ day: string; passRate: number | null }> } | null }> = ({ version, release, checklist, readiness }) => {
  const [result, setResult] = useLocalState<RiskAssessment | null>(null);
  const openItems = (checklist ?? []).filter(t => t.status !== 'Closed');
  const closedItems = (checklist ?? []).filter(t => t.status === 'Closed');

  const mutation = useMutation({
    mutationFn: () => assessRisk({
      version: version.replace('cnv-', ''),
      daysUntilRelease: release.daysUntilNext,
      checklistDone: closedItems.length,
      checklistTotal: (checklist ?? []).length,
      checklistPct: (checklist ?? []).length > 0 ? Math.round((closedItems.length / (checklist ?? []).length) * 100) : 100,
      passRate: readiness?.passRate ?? 0,
      totalLaunches: readiness?.totalLaunches ?? 0,
      openBlockers: 0,
      trend: readiness?.trend?.slice(-7) ?? [],
      openItems: openItems.slice(0, 20).map(t => ({ key: t.key, summary: t.summary, assignee: t.assignee, priority: t.priority })),
    }),
    onSuccess: setResult,
  });

  const verdictColor = (v?: string) => v === 'Ship' ? 'green' : v === 'Hold' ? 'red' : 'orange';

  return (
    <div className="app-mt-md">
      {!result && (
        <div className="app-text-block-center app-p-lg">
          <Content component="p" className="app-text-muted app-mb-md">
            AI will analyze checklist progress, pass rates, open blockers, and trends to assess release readiness.
          </Content>
          <Button variant="primary" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Assess Release Risk
          </Button>
          {mutation.isError && <Alert variant="danger" isInline title={mutation.error instanceof Error ? mutation.error.message : 'Failed'} className="app-mt-md" />}
        </div>
      )}
      {result && (
        <div>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} className="app-mb-md">
            <FlexItem>
              <Label color={verdictColor(result.assessment.verdict)} className="app-mr-sm">{result.assessment.verdict || 'Unknown'}</Label>
              <Label color={result.assessment.overallRisk === 'Low' ? 'green' : result.assessment.overallRisk === 'High' || result.assessment.overallRisk === 'Critical' ? 'red' : 'orange'} isCompact>
                Risk: {result.assessment.overallRisk}
              </Label>
              <span className="app-text-xs app-text-muted app-ml-sm">{result.model}{result.cached ? ' (cached)' : ''}</span>
            </FlexItem>
            <FlexItem>
              <Button variant="link" size="sm" onClick={() => { setResult(null); mutation.mutate(); }}>Re-assess</Button>
            </FlexItem>
          </Flex>
          {result.assessment.summary && <Content component="p" className="app-mb-md">{result.assessment.summary}</Content>}
          {result.assessment.concerns && result.assessment.concerns.length > 0 && (
            <div className="app-mb-md">
              <Content component="h5">Concerns</Content>
              {result.assessment.concerns.map((c, i) => (
                <Alert key={i} variant={c.severity === 'high' ? 'danger' : 'warning'} isInline isPlain title={`${c.area}: ${c.detail}`} className="app-mb-xs" />
              ))}
            </div>
          )}
          {result.assessment.recommendations && result.assessment.recommendations.length > 0 && (
            <div>
              <Content component="h5">Recommendations</Content>
              <ul className="app-text-xs">
                {result.assessment.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {result.assessment.raw && !result.assessment.verdict && <pre className="app-ack-notes">{result.assessment.raw}</pre>}
        </div>
      )}
    </div>
  );
};
