import React, { useMemo, useState as useLocalState } from 'react';

import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  MenuToggle,
  type MenuToggleElement,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  Tooltip,
} from '@patternfly/react-core';
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkAltIcon,
  InfoCircleIcon,
  OutlinedQuestionCircleIcon,
  PencilAltIcon,
  TimesIcon,
  UserIcon,
  WrenchIcon,
} from '@patternfly/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  assessRisk,
  type ChangelogCorrection,
  type ChangelogItem,
  type ChangelogResult,
  type ChangelogStatus,
  fetchChangelogStatus,
  type RiskAssessment,
  saveChangelogEdits,
  startChangelogJob,
} from '../../api/ai';
import { fetchSubVersions, fetchVersionReadiness } from '../../api/releases';
import { HelpLabel } from '../common/HelpLabel';

import { BlockerWall } from './BlockerWall';
import { ReleaseReport } from './ReleaseReport';
import { RiskFlags } from './RiskFlags';
import { computeHealth, TrafficLight } from './TrafficLight';

const ReadinessGauge: React.FC<{ score: number }> = ({ score }) => {
  const color =
    score >= 80
      ? 'var(--pf-t--global--color--status--success--default)'
      : score >= 50
        ? 'var(--pf-t--global--color--status--warning--default)'
        : 'var(--pf-t--global--color--status--danger--default)';
  return (
    <Tooltip content={`Readiness score: ${score}%`}>
      <div className="app-readiness-gauge">
        <svg height="64" viewBox="0 0 36 36" width="64">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="var(--pf-t--global--border--color--default)"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={color}
            strokeDasharray={`${score}, 100`}
            strokeLinecap="round"
            strokeWidth="3"
          />
          <text fill={color} fontSize="9" fontWeight="700" textAnchor="middle" x="18" y="21">
            {score}%
          </text>
        </svg>
      </div>
    </Tooltip>
  );
};

const MILESTONE_TYPE_COLORS: Record<string, string> = {
  batch: 'var(--pf-t--global--color--brand--default)',
  blockers_only: 'var(--pf-t--global--color--status--danger--default)',
  code_freeze: 'var(--pf-t--global--color--status--warning--default)',
  custom: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
  feature_freeze: 'var(--pf-t--global--color--status--warning--default)',
  ga: 'var(--pf-t--global--color--status--danger--default)',
};

const extractShortName = (name: string): string => {
  const ver = /(\d+\.\d+\.?\d*)/.exec(name);
  if (ver) {
    return ver[1];
  }
  if (name.toLowerCase().includes('feature freeze')) {
    return 'FF';
  }
  if (name.toLowerCase().includes('code freeze')) {
    return 'CF';
  }
  if (name.toLowerCase().includes('blocker')) {
    return 'BO';
  }
  return name.substring(0, 10);
};

const MilestoneTimeline: React.FC<{ release: ReleaseInfo }> = ({ release }) => (
  <div className="app-ms-strip-scroll">
    <div className="app-ms-strip">
      <div className="app-ms-line" />
      {release.milestones.map((m, i) => {
        const color =
          MILESTONE_TYPE_COLORS[m.type] ?? 'var(--pf-t--global--border--color--default)';
        return (
          <Tooltip
            content={`${m.name} — ${new Date(m.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            key={i}
          >
            <div className={`app-ms-point ${m.isPast ? 'app-ms-past' : ''}`}>
              <div className="app-ms-dot" style={{ background: color }} />
              <span className="app-ms-label-top">{extractShortName(m.name)}</span>
              <span className="app-ms-label-bot">
                {new Date(m.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  </div>
);

const WorkloadChart: React.FC<{ tasks: ChecklistTask[] }> = ({ tasks }) => {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === 'Closed') {
        continue;
      }
      const assignee = t.assignee || 'Unassigned';
      counts.set(assignee, (counts.get(assignee) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tasks]);

  if (data.length === 0) {
    return (
      <Content className="app-text-muted" component="p">
        No open items
      </Content>
    );
  }
  const max = data[0][1];

  return (
    <div className="app-comp-chart">
      {data.map(([name, count]) => (
        <div className="app-comp-row" key={name}>
          <span className="app-comp-label app-text-xs">{name.split('@')[0]}</span>
          <div className="app-comp-bar-track">
            <div
              className="app-comp-bar"
              style={{ width: `${Math.max(2, (count / max) * 100)}%` }}
            />
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

export const VersionDashboard: React.FC<VersionDashboardProps> = ({
  checklist,
  onClose,
  release,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const version = release.shortname;

  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryFn: () => fetchVersionReadiness(version),
    queryKey: ['versionReadiness', version],
    staleTime: 5 * 60 * 1000,
  });

  const checklistDone = (checklist ?? []).filter(t => t.status === 'Closed').length;
  const checklistTotal = (checklist ?? []).length;

  const health = computeHealth({
    checklistDone,
    checklistTotal,
    daysUntilNext: release.daysUntilNext,
    passRate: readiness?.passRate ?? undefined,
  });

  const readinessScore = useMemo(() => {
    const checklistPct = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 100;
    const testPct = readiness?.passRate ?? 100;
    return Math.round(checklistPct * 0.5 + testPct * 0.5);
  }, [checklistDone, checklistTotal, readiness]);

  return (
    <Card>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsMd' }}
            >
              <FlexItem>
                <TrafficLight reason={health.reason} size={16} status={health.status} />
              </FlexItem>
              <FlexItem>{release.shortname.replace('cnv-', 'CNV ')} Dashboard</FlexItem>
              <FlexItem>
                <Label
                  isCompact
                  color={
                    release.phase.includes('Maintenance')
                      ? 'green'
                      : release.phase.includes('Development')
                        ? 'blue'
                        : 'purple'
                  }
                >
                  {release.phase}
                </Label>
              </FlexItem>
            </Flex>
          </FlexItem>
          {onClose && (
            <FlexItem>
              <Button aria-label="Close dashboard" variant="plain" onClick={onClose}>
                &times;
              </Button>
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        <Grid hasGutter className="app-mb-md">
          <GridItem md={3} span={12}>
            <div className="app-text-block-center">
              <ReadinessGauge score={readinessScore} />
              <HelpLabel
                help="Composite score combining checklist completion (50%) and test pass rate (50%). Higher is better."
                label="Readiness"
              />
            </div>
          </GridItem>
          <GridItem md={3} span={12}>
            <DescriptionList isCompact isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  <HelpLabel
                    help="Jira release checklist tasks. Shows completed vs total."
                    label="Checklist"
                  />
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {checklistDone}/{checklistTotal} done
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  <HelpLabel
                    help="Test pass rate from ReportPortal launches matching this CNV version in the last 14 days."
                    label="Pass Rate"
                  />
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {readinessLoading ? (
                    <Spinner size="sm" />
                  ) : readiness?.passRate !== null ? (
                    `${readiness?.passRate}%`
                  ) : (
                    '--'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  <HelpLabel
                    help="Days until the next scheduled batch or GA release for this version."
                    label="Next Release"
                  />
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {release.daysUntilNext !== null ? (
                    <Label
                      isCompact
                      color={
                        release.daysUntilNext <= 3
                          ? 'red'
                          : release.daysUntilNext <= 7
                            ? 'orange'
                            : 'green'
                      }
                    >
                      {release.daysUntilNext}d
                    </Label>
                  ) : (
                    '--'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  <HelpLabel
                    help="Number of test launches from ReportPortal for this version in the last 14 days."
                    label="Launches"
                  />
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {readiness?.totalLaunches ?? '--'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </GridItem>
          <GridItem md={6} span={12}>
            {readiness && readiness.trend.length > 0 && (
              <div>
                <HelpLabel
                  help="Daily test pass rate for this version. Green dots are ≥85%, yellow dots are below."
                  label="Pass rate trend (14 days)"
                />
                <svg className="app-trend-chart" viewBox="0 0 200 40">
                  {readiness.trend.map((d, i) => {
                    const x = (i / Math.max(readiness.trend.length - 1, 1)) * 196 + 2;
                    const y = d.passRate !== null ? 38 - (d.passRate / 100) * 36 : 38;
                    const color =
                      d.passRate !== null && d.passRate >= 85
                        ? 'var(--pf-t--global--color--status--success--default)'
                        : 'var(--pf-t--global--color--status--warning--default)';
                    return <circle cx={x} cy={y} fill={color} key={i} r={2.5} />;
                  })}
                  <polyline
                    fill="none"
                    opacity="0.5"
                    points={readiness.trend
                      .map((d, i) => {
                        const x = (i / Math.max(readiness.trend.length - 1, 1)) * 196 + 2;
                        const y = d.passRate !== null ? 38 - (d.passRate / 100) * 36 : 38;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    stroke="var(--pf-t--global--color--brand--default)"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            )}
          </GridItem>
        </Grid>

        <RiskFlags checklist={checklist} readiness={readiness} release={release} />

        <Flex className="app-mb-md" spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <ReleaseReport checklist={checklist} readiness={readiness} release={release} />
          </FlexItem>
        </Flex>

        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>Milestones</TabTitleText>}>
            <div className="app-mt-md">
              <MilestoneTimeline release={release} />
            </div>
          </Tab>
          <Tab
            eventKey={1}
            title={
              <TabTitleText>
                Workload ({(checklist ?? []).filter(t => t.status !== 'Closed').length} open)
              </TabTitleText>
            }
          >
            <div className="app-mt-md">
              <WorkloadChart tasks={checklist ?? []} />
            </div>
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Blockers</TabTitleText>}>
            <div className="app-mt-md">
              <BlockerWall version={version} />
            </div>
          </Tab>
          <Tab
            eventKey={3}
            title={
              <TabTitleText>
                AI Changelog{' '}
                <Tooltip content="AI-generated changelog from Jira issues. Select sub-versions to compare what changed between releases.">
                  <OutlinedQuestionCircleIcon className="app-help-icon" />
                </Tooltip>
              </TabTitleText>
            }
          >
            <ChangelogTab milestones={release.milestones} version={version} />
          </Tab>
          <Tab
            eventKey={4}
            title={
              <TabTitleText>
                AI Risk{' '}
                <Tooltip content="AI evaluates release readiness based on checklist progress, test pass rates, open blockers, and trends. Returns Ship / Hold / Needs Attention verdict.">
                  <OutlinedQuestionCircleIcon className="app-help-icon" />
                </Tooltip>
              </TabTitleText>
            }
          >
            <RiskTab
              checklist={checklist}
              readiness={readiness}
              release={release}
              version={version}
            />
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
};

const CATEGORY_LABELS: Record<
  string,
  { label: string; color: 'green' | 'blue' | 'purple' | 'orange' | 'grey' }
> = {
  bugFixes: { color: 'red' as 'orange', label: 'Bug Fixes' },
  documentation: { color: 'grey', label: 'Documentation' },
  features: { color: 'green', label: 'Features' },
  improvements: { color: 'blue', label: 'Improvements' },
  infrastructure: { color: 'purple', label: 'Infrastructure' },
};

const isVersionReleased = (
  versionName: string,
  milestones: { name: string; date: string; isPast: boolean }[],
): boolean => {
  const ver = /(\d+\.\d+\.?\d*)/.exec(versionName)?.[1];
  if (!ver) {
    return false;
  }
  return milestones.some(m => {
    const mVer = /(\d+\.\d+\.?\d*)/.exec(m.name)?.[1];
    return mVer === ver && m.isPast;
  });
};

const CATEGORY_KEYS = [
  'features',
  'bugFixes',
  'improvements',
  'infrastructure',
  'documentation',
] as const;

const ConfidenceBadge: React.FC<{ confidence?: number; reason?: string }> = ({
  confidence,
  reason,
}) => {
  if (confidence === undefined || confidence === null) {
    return null;
  }
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? 'green' : pct >= 70 ? 'grey' : 'orange';
  return (
    <Tooltip content={reason || `Confidence: ${pct}%`}>
      <Label isCompact className="app-ml-xs" color={color}>
        {pct}%{pct < 70 ? ' ⚠' : ''}
      </Label>
    </Tooltip>
  );
};

const ChangelogTab: React.FC<{
  version: string;
  milestones: { name: string; date: string; isPast: boolean }[];
}> = ({ milestones, version }) => {
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
      const existing = prev.findIndex(
        e => e.key === correction.key && e.field === correction.field,
      );
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = correction;
        return next;
      }
      return [...prev, correction];
    });
  };

  const handleSaveEdits = async () => {
    if (pendingEdits.length === 0) {
      return;
    }
    setSavingEdits(true);
    try {
      await saveChangelogEdits(
        version,
        pendingEdits,
        targetVer,
        compareEnabled && compareFrom ? compareFrom : undefined,
      );
      setPendingEdits([]);
      setEditMode(false);
      const status = await fetchChangelogStatus(
        targetVer,
        compareEnabled && compareFrom ? compareFrom : undefined,
      );
      if (status.status === 'done' && status.changelog) {
        setResult({ changelog: status.changelog, meta: status.meta! } as ChangelogResult);
      }
    } catch {
      /* Save failed */
    }
    setSavingEdits(false);
  };

  const { data: subVersions } = useQuery({
    queryFn: () => fetchSubVersions(version),
    queryKey: ['subVersions', version],
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
    if (!targetVer) {
      return;
    }
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
        return undefined;
      })
      .catch(() => {
        // no-op
      });
  }, [targetVer, compareFrom, compareEnabled, setResult, setIsGenerating, setJobStatus]);

  React.useEffect(() => {
    if (!targetVer) {
      return;
    }
    pollForResult();
    return () => {
      if (pollRef.current) {
        clearTimeout(pollRef.current);
      }
    };
  }, [targetVer, compareFrom, pollForResult]);

  const startGeneration = async () => {
    setIsGenerating(true);
    setResult(null);
    setJobStatus({ progress: 'Starting...', status: 'running', step: 'starting' });
    try {
      await startChangelogJob(
        version,
        targetVer,
        compareEnabled && compareFrom ? compareFrom : undefined,
      );
      pollRef.current = setTimeout(pollForResult, 1000);
    } catch (err) {
      setJobStatus({
        error: err instanceof Error ? err.message : 'Failed to start',
        status: 'error',
      });
      setIsGenerating(false);
    }
  };

  const mutation = {
    error: null,
    isError: false,
    isPending: isGenerating,
    mutate: startGeneration,
  };

  const cl = result?.changelog;
  const hasCategories =
    cl?.categories && Object.values(cl.categories).some(items => items && items.length > 0);
  const totalItems = cl?.categories
    ? Object.values(cl.categories).reduce((sum, items) => sum + (items?.length ?? 0), 0)
    : 0;

  const filterItems = (items: ChangelogItem[]): ChangelogItem[] => {
    let filtered = items;
    if (componentFilter) {
      filtered = filtered.filter(item =>
        item.component?.toLowerCase().includes(componentFilter.toLowerCase()),
      );
    }
    if (showLowConfidence) {
      filtered = filtered.filter(item => item.confidence !== undefined && item.confidence < 0.7);
    }
    return filtered;
  };

  const buildSlackText = (): string => {
    if (!result || !cl) {
      return '';
    }
    const lines: string[] = [];
    lines.push(`:rocket: *${result.meta.label} Changelog*`);
    if (cl.summary) {
      lines.push(`> ${cl.summary}`);
    }
    if (cl.categories) {
      for (const [cat, items] of Object.entries(cl.categories)) {
        if (!items?.length) {
          continue;
        }
        const label = CATEGORY_LABELS[cat]?.label ?? cat;
        lines.push(`\n*${label} (${items.length}):*`);
        items.slice(0, 15).forEach(item => {
          lines.push(
            `• ${item.key ? `<https://issues.redhat.com/browse/${item.key}|${item.key}>` : ''} ${item.title || ''}`,
          );
          if (item.ticketSummary) {
            lines.push(`  _${item.ticketSummary}_`);
          }
        });
        if (items.length > 15) {
          lines.push(`_...and ${items.length - 15} more_`);
        }
      }
    }
    return lines.join('\n');
  };

  const handlePdf = () => {
    if (!reportRef.current) {
      return;
    }
    const w = window.open('', '_blank');
    if (!w) {
      return;
    }
    w.document.write(`<html><head><title>${result?.meta.label ?? ''} Changelog</title>
      <style>body{font-family:RedHatText,-apple-system,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#151515}h1{font-size:22px;border-bottom:2px solid #06c;padding-bottom:8px}h2{font-size:16px;color:#06c;margin-top:20px}.item{padding:3px 0;border-bottom:1px solid #eee;font-size:13px}.key{font-weight:600;min-width:90px;display:inline-block}.badge{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600}.summary{padding:12px;background:#f0f0f0;border-left:4px solid #06c;border-radius:4px;margin:12px 0}.footer{margin-top:24px;font-size:10px;color:#6a6e73;border-top:1px solid #d2d2d2;padding-top:8px}</style></head>
      <body><h1>${result?.meta.label ?? ''} Changelog</h1><p>Generated: ${new Date().toLocaleString()}</p>${reportRef.current.innerHTML}<div class="footer">Generated by CNV Console Monitor</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="app-mt-md">
      <Flex
        alignItems={{ default: 'alignItemsFlexEnd' }}
        className="app-mb-md"
        flexWrap={{ default: 'wrap' }}
        spaceItems={{ default: 'spaceItemsMd' }}
      >
        <FlexItem>
          <Content className="app-text-muted app-mb-xs" component="small">
            Target Version
          </Content>
          <Select
            isOpen={targetOpen}
            // eslint-disable-next-line react/no-unstable-nested-components
            toggle={(ref: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                className="app-max-w-250"
                isExpanded={targetOpen}
                ref={ref}
                onClick={() => setTargetOpen(o => !o)}
              >
                {targetVer || 'Select version'}
              </MenuToggle>
            )}
            onOpenChange={setTargetOpen}
            onSelect={(_e, val) => {
              setTargetVer(val as string);
              setTargetOpen(false);
              setResult(null);
            }}
          >
            <SelectList>
              {(subVersions ?? []).map(v => {
                const released = isVersionReleased(v.name, milestones);
                return (
                  <SelectOption key={v.name} value={v.name}>
                    {v.name}
                    {released ? '' : ' (upcoming)'}
                  </SelectOption>
                );
              })}
            </SelectList>
          </Select>
        </FlexItem>
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            className="app-mb-xs"
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <input
                checked={compareEnabled}
                id="compare-enable"
                type="checkbox"
                onChange={e => {
                  setCompareEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setCompareFrom('');
                    setResult(null);
                  }
                }}
              />
            </FlexItem>
            <FlexItem>
              <Tooltip content="Enable to compare changes between two sub-versions. Shows only what's new in the target version compared to the selected base version.">
                <label
                  className="app-text-xs"
                  htmlFor="compare-enable"
                  style={{ cursor: 'pointer' }}
                >
                  Compare with previous version
                </label>
              </Tooltip>
            </FlexItem>
          </Flex>
          {compareEnabled && (
            <Select
              isOpen={compareOpen}
              // eslint-disable-next-line react/no-unstable-nested-components
              toggle={(ref: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  className="app-max-w-250"
                  isExpanded={compareOpen}
                  ref={ref}
                  onClick={() => setCompareOpen(o => !o)}
                >
                  {compareFrom || 'Select base version'}
                </MenuToggle>
              )}
              onOpenChange={setCompareOpen}
              onSelect={(_e, val) => {
                setCompareFrom(val as string);
                setCompareOpen(false);
                setResult(null);
              }}
            >
              <SelectList>
                {(subVersions ?? [])
                  .filter(v => v.name !== targetVer)
                  .map(v => (
                    <SelectOption key={v.name} value={v.name}>
                      {v.name}
                    </SelectOption>
                  ))}
              </SelectList>
            </Select>
          )}
        </FlexItem>
        <FlexItem>
          <Button
            isDisabled={!targetVer || mutation.isPending}
            isLoading={mutation.isPending}
            variant="primary"
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Generating...' : 'Generate Changelog'}
          </Button>
        </FlexItem>
      </Flex>

      {mutation.isPending && jobStatus?.status === 'running' && (
        <div className="app-changelog-progress app-mb-md">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            className="app-mb-xs"
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <Content component="small">
                <strong>{jobStatus.progress}</strong>
              </Content>
            </FlexItem>
            <FlexItem>
              <Content className="app-text-muted" component="small">
                {jobStatus.totalIssues ? `${jobStatus.totalIssues.toLocaleString()} issues` : ''}
                {jobStatus.totalBatches
                  ? ` · ${jobStatus.currentBatch}/${jobStatus.totalBatches} batches`
                  : ''}
                {jobStatus.elapsedSeconds ? ` · ${jobStatus.elapsedSeconds}s` : ''}
              </Content>
            </FlexItem>
          </Flex>
          {jobStatus.totalBatches && jobStatus.totalBatches > 0 ? (
            <Progress
              aria-label="Changelog generation progress"
              measureLocation={ProgressMeasureLocation.outside}
              size={ProgressSize.sm}
              value={
                jobStatus.step === 'summarizing'
                  ? 95
                  : jobStatus.currentBatch && jobStatus.totalBatches
                    ? Math.round((jobStatus.currentBatch / jobStatus.totalBatches) * 90)
                    : 5
              }
            />
          ) : (
            <Progress aria-label="Loading" size={ProgressSize.sm} value={undefined} />
          )}
          {jobStatus.log && jobStatus.log.length > 0 && (
            <div
              className="app-changelog-log app-mt-sm"
              ref={el => {
                if (el) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              {jobStatus.log.map((entry, i) => (
                <div className={`app-changelog-log-entry app-changelog-log-${entry.type}`} key={i}>
                  <span className="app-changelog-log-time">
                    {new Date(entry.time).toLocaleTimeString()}
                  </span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {jobStatus?.status === 'error' && (
        <Alert
          isInline
          className="app-mb-md"
          title={jobStatus.error || 'Generation failed'}
          variant="danger"
        />
      )}

      {result && (
        <div ref={reportRef}>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            className="app-mb-md"
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <Label isCompact className="app-mr-sm" color="blue">
                {result.meta.label}
              </Label>
              <span className="app-text-xs app-text-muted">
                {result.meta.issueCount} issues
                {result.meta.batches > 1 ? ` (${result.meta.batches} batches)` : ''}
                {' · '}
                {result.meta.tokensUsed} tokens
                {result.meta.cached ? ' · cached' : ''}
                {' · '}
                {result.meta.model}
              </span>
            </FlexItem>
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button
                    aria-label="Download PDF"
                    icon={<DownloadIcon />}
                    size="sm"
                    variant="plain"
                    onClick={handlePdf}
                  />
                </FlexItem>
                <FlexItem>
                  <Button
                    aria-label="Copy Slack"
                    icon={<CopyIcon />}
                    size="sm"
                    variant="plain"
                    onClick={() => navigator.clipboard.writeText(buildSlackText())}
                  />
                </FlexItem>
                <FlexItem>
                  <Tooltip content="Open Jira filter for this version">
                    <Button
                      aria-label="Jira filter"
                      icon={<ExternalLinkAltIcon />}
                      size="sm"
                      variant="plain"
                      onClick={() =>
                        window.open(
                          `https://issues.redhat.com/issues/?jql=project%3DCNV%20AND%20fixVersion%3D%22${encodeURIComponent(result.meta.targetVersion)}%22`,
                          '_blank',
                        )
                      }
                    />
                  </Tooltip>
                </FlexItem>
                <FlexItem>
                  <Tooltip content="Copy shareable link">
                    <Button
                      aria-label="Copy link"
                      icon={<CopyIcon />}
                      size="sm"
                      variant="plain"
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('clTarget', result.meta.targetVersion);
                        if (result.meta.compareFrom) {
                          url.searchParams.set('clFrom', result.meta.compareFrom);
                        }
                        void navigator.clipboard.writeText(url.toString());
                      }}
                    />
                  </Tooltip>
                </FlexItem>
                <FlexItem>
                  <Tooltip
                    content={
                      editMode
                        ? 'Exit edit mode'
                        : 'Edit classifications, impact scores, and risk levels'
                    }
                  >
                    <Button
                      aria-label="Edit"
                      icon={editMode ? <TimesIcon /> : <PencilAltIcon />}
                      size="sm"
                      variant={editMode ? 'secondary' : 'plain'}
                      onClick={() => {
                        if (editMode && pendingEdits.length > 0) {
                          void handleSaveEdits();
                        } else {
                          setEditMode(!editMode);
                          setPendingEdits([]);
                        }
                      }}
                    />
                  </Tooltip>
                </FlexItem>
                <FlexItem>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => {
                      setResult(null);
                      void mutation.mutate();
                    }}
                  >
                    Regenerate
                  </Button>
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>

          {editMode && (
            <Alert
              isInline
              isPlain
              className="app-mb-sm"
              title={`Edit mode: ${pendingEdits.length} pending change${pendingEdits.length !== 1 ? 's' : ''}`}
              variant="info"
            >
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button
                    isDisabled={pendingEdits.length === 0}
                    isLoading={savingEdits}
                    size="sm"
                    variant="primary"
                    onClick={handleSaveEdits}
                  >
                    <CheckIcon className="app-mr-xs" />
                    Save Edits
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => {
                      setEditMode(false);
                      setPendingEdits([]);
                    }}
                  >
                    Cancel
                  </Button>
                </FlexItem>
              </Flex>
            </Alert>
          )}

          {cl?.summary && (
            <div className="app-changelog-summary app-mb-md">
              <Content component="p">
                {typeof cl.summary === 'string' ? cl.summary : JSON.stringify(cl.summary)}
              </Content>
            </div>
          )}

          {cl?.highlights && (
            <div className="app-changelog-highlights app-mb-md">
              <Content className="app-mb-xs" component="h5">
                <InfoCircleIcon className="app-mr-xs" />
                Key Highlights
              </Content>
              {typeof cl.highlights === 'string' ? (
                cl.highlights.includes('\n') ? (
                  <ul className="app-text-sm">
                    {cl.highlights
                      .split('\n')
                      .filter(l => l.trim())
                      .map((line, i) => (
                        <li key={i}>{line.replace(/^[-•*]\s*/, '')}</li>
                      ))}
                  </ul>
                ) : (
                  <Content className="app-text-sm" component="p">
                    {cl.highlights}
                  </Content>
                )
              ) : (
                <Content className="app-text-sm" component="p">
                  {JSON.stringify(cl.highlights)}
                </Content>
              )}
            </div>
          )}

          {cl?.breakingChanges && cl.breakingChanges.length > 0 && (
            <Alert
              isInline
              className="app-mb-md"
              title={`${cl.breakingChanges.length} Breaking Changes`}
              variant="danger"
            >
              <ul className="app-text-xs">
                {cl.breakingChanges.map((bc, i) => (
                  <li key={i}>
                    {typeof bc === 'string'
                      ? bc
                      : bc.title
                        ? `${String(bc.key || '')} — ${String(bc.title)}`
                        : JSON.stringify(bc)}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {hasCategories && (
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              className="app-mb-md"
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
            >
              <FlexItem>
                {Object.entries(cl.categories!).map(([cat, items]) => {
                  if (!items?.length) {
                    return null;
                  }
                  const meta = CATEGORY_LABELS[cat] || { color: 'grey' as const, label: cat };
                  return (
                    <Label isCompact className="app-mr-sm" color={meta.color} key={cat}>
                      {meta.label}: {items.length}
                    </Label>
                  );
                })}
                <span className="app-text-xs app-text-muted app-ml-sm">{totalItems} total</span>
              </FlexItem>
              <FlexItem>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <FlexItem>
                    <input
                      className="app-search-input"
                      placeholder="Filter by component..."
                      style={{ width: 180 }}
                      type="text"
                      value={componentFilter}
                      onChange={e => setComponentFilter(e.target.value)}
                    />
                    {componentFilter && (
                      <Button
                        aria-label="Clear filter"
                        size="sm"
                        variant="plain"
                        onClick={() => setComponentFilter('')}
                      >
                        &times;
                      </Button>
                    )}
                  </FlexItem>
                  <FlexItem>
                    <Tooltip content="Show only items with low AI confidence (<70%) that may need human review">
                      <Button
                        size="sm"
                        variant={showLowConfidence ? 'secondary' : 'plain'}
                        onClick={() => setShowLowConfidence(!showLowConfidence)}
                      >
                        {showLowConfidence ? 'All items' : '⚠ Low confidence'}
                      </Button>
                    </Tooltip>
                  </FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          )}

          {hasCategories &&
            Object.entries(cl.categories!).map(([cat, items]) => {
              if (!items?.length) {
                return null;
              }
              const filtered = filterItems(items);
              if (filtered.length === 0) {
                return null;
              }
              const meta = CATEGORY_LABELS[cat] || { color: 'grey' as const, label: cat };
              return (
                <ExpandableSection
                  isIndented
                  className="app-mb-sm"
                  key={cat}
                  toggleText={`${meta.label} (${filtered.length})`}
                >
                  <div className="app-changelog-list">
                    {filtered.map((item, i) => (
                      <div className="app-changelog-item-wrap" key={i}>
                        <div className="app-changelog-item">
                          {item.key && (
                            <a
                              className="app-changelog-key"
                              href={`https://issues.redhat.com/browse/${item.key}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {item.key} <ExternalLinkAltIcon className="app-text-xs" />
                            </a>
                          )}
                          <Tooltip content={item.reasoning || item.title || ''} maxWidth="400px">
                            <span className="app-changelog-title">{item.title || ''}</span>
                          </Tooltip>
                          {item.component && (
                            <Label isCompact className="app-ml-xs" color="grey">
                              {item.component}
                            </Label>
                          )}
                          {editMode && item.key ? (
                            <>
                              <select
                                className="app-edit-select app-ml-xs"
                                defaultValue={cat}
                                onChange={e =>
                                  addEdit({
                                    context: item.title,
                                    field: 'category',
                                    key: item.key!,
                                    newValue: e.target.value,
                                    oldValue: cat,
                                  })
                                }
                              >
                                {CATEGORY_KEYS.map(c => (
                                  <option key={c} value={c}>
                                    {CATEGORY_LABELS[c]?.label || c}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="app-edit-select app-ml-xs"
                                defaultValue={String(item.impactScore ?? 3)}
                                onChange={e =>
                                  addEdit({
                                    context: item.title,
                                    field: 'impactScore',
                                    key: item.key!,
                                    newValue: e.target.value,
                                    oldValue: String(item.impactScore ?? 3),
                                  })
                                }
                              >
                                {[1, 2, 3, 4, 5].map(n => (
                                  <option key={n} value={String(n)}>
                                    {'★'.repeat(n)}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="app-edit-select app-ml-xs"
                                defaultValue={item.risk || 'low'}
                                onChange={e =>
                                  addEdit({
                                    context: item.title,
                                    field: 'risk',
                                    key: item.key!,
                                    newValue: e.target.value,
                                    oldValue: item.risk || 'low',
                                  })
                                }
                              >
                                <option value="low">low risk</option>
                                <option value="medium">medium risk</option>
                                <option value="high">high risk</option>
                              </select>
                            </>
                          ) : (
                            <>
                              {item.impactScore && (
                                <Tooltip content={`Impact: ${item.impactScore}/5`}>
                                  <Label
                                    isCompact
                                    className="app-ml-xs"
                                    color={
                                      item.impactScore >= 4
                                        ? 'red'
                                        : item.impactScore >= 3
                                          ? 'orange'
                                          : 'grey'
                                    }
                                  >
                                    {'★'.repeat(item.impactScore)}
                                  </Label>
                                </Tooltip>
                              )}
                              {item.risk && item.risk !== 'low' && (
                                <Label
                                  isCompact
                                  className="app-ml-xs"
                                  color={item.risk === 'high' ? 'red' : 'orange'}
                                >
                                  {item.risk} risk
                                </Label>
                              )}
                            </>
                          )}
                          <ConfidenceBadge
                            confidence={item.confidence}
                            reason={item.confidenceReason}
                          />
                          {item.prLinks &&
                            item.prLinks.length > 0 &&
                            item.prLinks
                              .filter((pr): pr is string => typeof pr === 'string')
                              .map((pr, pi) => (
                                <a
                                  className="app-text-xs app-ml-xs"
                                  href={pr}
                                  key={pi}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  PR <ExternalLinkAltIcon />
                                </a>
                              ))}
                        </div>
                        {(item.ticketSummary ||
                          item.status ||
                          item.assignee ||
                          item.availableIn ||
                          item.buildInfo ||
                          item.blockedBy) &&
                          (() => {
                            const avail =
                              typeof item.availableIn === 'object' && item.availableIn
                                ? item.availableIn
                                : null;
                            const availStr =
                              typeof item.availableIn === 'string' ? item.availableIn : null;
                            const availVersion = avail?.version || availStr || null;

                            const availTooltipLines: string[] = [];
                            if (avail) {
                              if (avail.evidence) {
                                availTooltipLines.push(`📋 ${avail.evidence}`);
                              }
                              if (avail.build) {
                                availTooltipLines.push(
                                  `🔧 Build: ${avail.build}${avail.buildDate ? ` (${avail.buildDate})` : ''}`,
                                );
                              }
                              if (avail.prMergedTo) {
                                availTooltipLines.push(
                                  `🔀 PR merged to: ${avail.prMergedTo}${avail.prMergedDate ? ` on ${avail.prMergedDate}` : ''}`,
                                );
                              }
                              if (item.resolvedDate) {
                                availTooltipLines.push(`✅ Resolved: ${item.resolvedDate}`);
                              }
                            } else {
                              if (item.availableInReason) {
                                availTooltipLines.push(item.availableInReason);
                              } else if (item.buildInfo) {
                                availTooltipLines.push(`Build info: ${item.buildInfo}`);
                              }
                              if (item.resolvedDate) {
                                availTooltipLines.push(`Resolved: ${item.resolvedDate}`);
                              }
                              if (availTooltipLines.length === 0) {
                                availTooltipLines.push(
                                  `Version determined from Jira fixVersion field. Regenerate the changelog for detailed evidence.`,
                                );
                              }
                            }
                            const availTooltip = availTooltipLines.join('\n');

                            return (
                              <div className="app-changelog-ticket-detail">
                                {item.ticketSummary && (
                                  <div className="app-changelog-ticket-summary">
                                    {item.ticketSummary}
                                  </div>
                                )}
                                <div className="app-changelog-ticket-meta">
                                  {item.status && (
                                    <Tooltip
                                      content={`Status: ${item.status}${item.resolution ? ` (${item.resolution})` : ''}${item.resolvedDate ? ` — resolved ${item.resolvedDate}` : ''}`}
                                    >
                                      <span className="app-changelog-meta-item">
                                        <Label
                                          isCompact
                                          color={
                                            item.status === 'Closed' || item.status === 'Done'
                                              ? 'green'
                                              : item.status === 'In Progress'
                                                ? 'blue'
                                                : 'grey'
                                          }
                                          variant="outline"
                                        >
                                          {item.status}
                                        </Label>
                                      </span>
                                    </Tooltip>
                                  )}
                                  {item.assignee && (
                                    <Tooltip content={`Assignee: ${item.assignee}`}>
                                      <span className="app-changelog-meta-item">
                                        <UserIcon className="app-text-xs" /> {item.assignee}
                                      </span>
                                    </Tooltip>
                                  )}
                                  {availVersion && (
                                    <Tooltip
                                      content={
                                        <div style={{ whiteSpace: 'pre-line' }}>{availTooltip}</div>
                                      }
                                      maxWidth="450px"
                                    >
                                      <Label
                                        isCompact
                                        className="app-changelog-meta-item app-cursor-help"
                                        color="blue"
                                        variant="outline"
                                      >
                                        {availVersion}
                                        {avail?.build ? ` (${avail.build})` : ''}
                                      </Label>
                                    </Tooltip>
                                  )}
                                  {avail?.prMergedTo && (
                                    <Tooltip
                                      content={`PR merged to branch ${avail.prMergedTo}${avail.prMergedDate ? ` on ${avail.prMergedDate}` : ''}`}
                                    >
                                      <span className="app-changelog-meta-item app-text-xs app-text-muted app-cursor-help">
                                        → {avail.prMergedTo}
                                      </span>
                                    </Tooltip>
                                  )}
                                  {item.buildInfo && !availVersion && (
                                    <Tooltip content={`Build: ${item.buildInfo}`}>
                                      <span className="app-changelog-meta-item">
                                        <WrenchIcon className="app-text-xs" /> {item.buildInfo}
                                      </span>
                                    </Tooltip>
                                  )}
                                  {item.blockedBy && (
                                    <Label
                                      isCompact
                                      className="app-changelog-meta-item"
                                      color="red"
                                      variant="outline"
                                    >
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
            <ExpandableSection
              className="app-mt-md"
              toggleText={`Contributors (${result.meta.contributors.length})`}
            >
              <div className="app-report-workload">
                {result.meta.contributors.map(c => (
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    className="app-mb-xs"
                    key={c.name}
                    spaceItems={{ default: 'spaceItemsSm' }}
                  >
                    <FlexItem style={{ minWidth: 140 }}>
                      <span className="app-text-xs">{c.name}</span>
                    </FlexItem>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <Progress
                        measureLocation={ProgressMeasureLocation.none}
                        size={ProgressSize.sm}
                        value={
                          result.meta.contributors
                            ? (c.count / result.meta.contributors[0].count) * 100
                            : 0
                        }
                      />
                    </FlexItem>
                    <FlexItem>
                      <span className="app-text-xs app-text-muted">{c.count}</span>
                    </FlexItem>
                  </Flex>
                ))}
              </div>
            </ExpandableSection>
          )}

          {cl?.epicStatus && cl.epicStatus.length > 0 && (
            <ExpandableSection
              className="app-mb-sm"
              toggleText={`Epic Status (${cl.epicStatus.length})`}
            >
              {cl.epicStatus.map((epic, i) => (
                <div className="app-changelog-item" key={i}>
                  <a
                    className="app-changelog-key"
                    href={`https://issues.redhat.com/browse/${epic.key}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {epic.key}
                  </a>
                  <span className="app-changelog-title">{epic.title}</span>
                  <Label
                    isCompact
                    className="app-ml-xs"
                    color={
                      epic.status === 'complete'
                        ? 'green'
                        : epic.status === 'blocked'
                          ? 'red'
                          : 'orange'
                    }
                  >
                    {epic.childrenDone}/{epic.childrenTotal} done
                  </Label>
                </div>
              ))}
            </ExpandableSection>
          )}

          {cl?.concerns && cl.concerns.length > 0 && (
            <Alert
              isInline
              className="app-mb-md"
              title={`${cl.concerns.length} Concerns`}
              variant="warning"
            >
              <ul className="app-text-xs">
                {cl.concerns.map((c, i) => (
                  <li key={i}>{typeof c === 'string' ? c : JSON.stringify(c)}</li>
                ))}
              </ul>
            </Alert>
          )}

          {cl?.testImpact && (cl.testImpact.newlyPassing > 0 || cl.testImpact.newlyFailing > 0) && (
            <div className="app-mb-md">
              <Content className="app-mb-xs" component="h5">
                Test Impact
              </Content>
              <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                {cl.testImpact.newlyPassing > 0 && (
                  <FlexItem>
                    <Label isCompact color="green">
                      {cl.testImpact.newlyPassing} newly passing
                    </Label>
                  </FlexItem>
                )}
                {cl.testImpact.newlyFailing > 0 && (
                  <FlexItem>
                    <Label isCompact color="red">
                      {cl.testImpact.newlyFailing} newly failing
                    </Label>
                  </FlexItem>
                )}
              </Flex>
              {cl.testImpact.details && cl.testImpact.details.length > 0 && (
                <ul className="app-text-xs app-mt-xs">
                  {cl.testImpact.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!hasCategories && !cl?.summary && (
            <Alert
              isInline
              className="app-mb-md"
              title="AI response could not be parsed into structured categories"
              variant="warning"
            >
              <Content className="app-text-xs" component="p">
                The AI returned a response that could not be parsed as a structured changelog. This
                usually happens when the AI wraps the response in extra text or the JSON is
                malformed. Try clicking &quot;Regenerate&quot; above.{' '}
                {cl?.raw ? 'The raw AI output is shown below.' : ''}
              </Content>
            </Alert>
          )}

          {cl?.raw && (
            <ExpandableSection className="app-mb-md" toggleText="Raw AI Output">
              <pre
                style={{
                  background: 'var(--pf-t--global--background--color--secondary--default)',
                  border: '1px solid var(--pf-t--global--border--color--default)',
                  borderRadius: 6,
                  fontSize: 12,
                  maxHeight: 400,
                  overflow: 'auto',
                  padding: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {cl.raw}
              </pre>
            </ExpandableSection>
          )}
        </div>
      )}
    </div>
  );
};

const RiskTab: React.FC<{
  version: string;
  release: ReleaseInfo;
  checklist?: ChecklistTask[];
  readiness?: {
    passRate: number | null;
    totalLaunches: number;
    trend: { day: string; passRate: number | null }[];
  } | null;
}> = ({ checklist, readiness, release, version }) => {
  const [result, setResult] = useLocalState<RiskAssessment | null>(null);
  const openItems = (checklist ?? []).filter(t => t.status !== 'Closed');
  const closedItems = (checklist ?? []).filter(t => t.status === 'Closed');

  const mutation = useMutation({
    mutationFn: () =>
      assessRisk({
        checklistDone: closedItems.length,
        checklistPct:
          (checklist ?? []).length > 0
            ? Math.round((closedItems.length / (checklist ?? []).length) * 100)
            : 100,
        checklistTotal: (checklist ?? []).length,
        daysUntilRelease: release.daysUntilNext,
        openBlockers: 0,
        openItems: openItems.slice(0, 20).map(t => ({
          assignee: t.assignee,
          key: t.key,
          priority: t.priority,
          summary: t.summary,
        })),
        passRate: readiness?.passRate ?? 0,
        totalLaunches: readiness?.totalLaunches ?? 0,
        trend: readiness?.trend?.slice(-7) ?? [],
        version: version.replace('cnv-', ''),
      }),
    onSuccess: setResult,
  });

  const verdictColor = (v?: string) => (v === 'Ship' ? 'green' : v === 'Hold' ? 'red' : 'orange');

  return (
    <div className="app-mt-md">
      {!result && (
        <div className="app-text-block-center app-p-lg">
          <Content className="app-text-muted app-mb-md" component="p">
            AI will analyze checklist progress, pass rates, open blockers, and trends to assess
            release readiness.
          </Content>
          <Button
            isLoading={mutation.isPending}
            variant="primary"
            onClick={() => mutation.mutate()}
          >
            Assess Release Risk
          </Button>
          {mutation.isError && (
            <Alert
              isInline
              className="app-mt-md"
              title={mutation.error instanceof Error ? mutation.error.message : 'Failed'}
              variant="danger"
            />
          )}
        </div>
      )}
      {result && (
        <div>
          <Flex className="app-mb-md" justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <Label className="app-mr-sm" color={verdictColor(result.assessment.verdict)}>
                {result.assessment.verdict || 'Unknown'}
              </Label>
              <Label
                isCompact
                color={
                  result.assessment.overallRisk === 'Low'
                    ? 'green'
                    : result.assessment.overallRisk === 'High' ||
                        result.assessment.overallRisk === 'Critical'
                      ? 'red'
                      : 'orange'
                }
              >
                Risk: {result.assessment.overallRisk}
              </Label>
              <span className="app-text-xs app-text-muted app-ml-sm">
                {result.model}
                {result.cached ? ' (cached)' : ''}
              </span>
            </FlexItem>
            <FlexItem>
              <Button
                size="sm"
                variant="link"
                onClick={() => {
                  setResult(null);
                  mutation.mutate();
                }}
              >
                Re-assess
              </Button>
            </FlexItem>
          </Flex>
          {result.assessment.summary && (
            <Content className="app-mb-md" component="p">
              {result.assessment.summary}
            </Content>
          )}
          {result.assessment.concerns && result.assessment.concerns.length > 0 && (
            <div className="app-mb-md">
              <Content component="h5">Concerns</Content>
              {result.assessment.concerns.map((c, i) => (
                <Alert
                  isInline
                  isPlain
                  className="app-mb-xs"
                  key={i}
                  title={`${c.area}: ${c.detail}`}
                  variant={c.severity === 'high' ? 'danger' : 'warning'}
                />
              ))}
            </div>
          )}
          {result.assessment.recommendations && result.assessment.recommendations.length > 0 && (
            <div>
              <Content component="h5">Recommendations</Content>
              <ul className="app-text-xs">
                {result.assessment.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {result.assessment.raw && !result.assessment.verdict && (
            <pre className="app-ack-notes">{result.assessment.raw}</pre>
          )}
        </div>
      )}
    </div>
  );
};
