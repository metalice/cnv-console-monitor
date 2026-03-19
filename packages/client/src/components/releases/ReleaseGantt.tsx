import React, { useMemo, useState, useRef } from 'react';
import {
  Card, CardBody, CardTitle,
  Bullseye, Spinner, Popover, Tooltip,
  ToggleGroup, ToggleGroupItem,
  Flex, FlexItem, Label, Content,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import type { ReleaseInfo, MilestoneType } from '@cnv-monitor/shared';

type ZoomLevel = '3m' | '6m' | '1y' | '2y';

const ZOOM_DAYS: Record<ZoomLevel, number> = { '3m': 90, '6m': 180, '1y': 365, '2y': 730 };

const PHASE_COLORS: Record<string, string> = {
  'Concept': 'var(--pf-t--global--color--status--purple--default, #6753ac)',
  'Planning / Development / Testing': 'var(--pf-t--global--color--status--info--default, #2b9af3)',
  'Maintenance': 'var(--pf-t--global--color--status--success--default, #3e8635)',
};

const MILESTONE_SHAPES: Record<MilestoneType, { color: string; symbol: string }> = {
  ga: { color: '#c9190b', symbol: '★' },
  batch: { color: '#2b9af3', symbol: '●' },
  feature_freeze: { color: '#f0ab00', symbol: '◆' },
  code_freeze: { color: '#ec7a08', symbol: '■' },
  blockers_only: { color: '#c9190b', symbol: '▲' },
  custom: { color: '#6753ac', symbol: '◆' },
};

const extractShortVersion = (name: string): string => {
  const match = name.match(/(\d+\.\d+\.?\d*)/);
  return match ? match[1] : name.replace(/^Batch\s+/, '').replace(/GA.*$/, '').trim();
};

const formatShortDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toDay = (d: string | Date): number => {
  const date = typeof d === 'string' ? new Date(d) : d;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const formatMonth = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

type ReleaseGanttProps = {
  releases: ReleaseInfo[] | undefined;
  isLoading: boolean;
  selectedVersion?: string | null;
  onSelectVersion: (shortname: string) => void;
};

export const ReleaseGantt: React.FC<ReleaseGanttProps> = ({
  releases, isLoading, selectedVersion, onSelectVersion,
}) => {
  const [zoom, setZoom] = useState<ZoomLevel>('1y');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeReleases = useMemo(() =>
    (releases ?? []).filter(r => r.phase !== 'Unsupported' && r.startDate),
    [releases],
  );

  const { timelineStart, timelineEnd, todayPos, pxPerDay, totalWidth, monthMarkers, dayMarkers } = useMemo(() => {
    const today = toDay(new Date());
    const zoomDays = ZOOM_DAYS[zoom];
    const start = today - Math.floor(zoomDays * 0.3) * DAY_MS;
    const end = today + Math.ceil(zoomDays * 0.7) * DAY_MS;
    const px = 1200 / zoomDays;
    const width = Math.max(1200, zoomDays * px);

    const months: Array<{ x: number; label: string }> = [];
    const d = new Date(start);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    while (d.getTime() < end) {
      months.push({ x: ((d.getTime() - start) / DAY_MS) * px, label: formatMonth(d.getTime()) });
      d.setMonth(d.getMonth() + 1);
    }

    const dayInterval = zoomDays <= 90 ? 7 : zoomDays <= 180 ? 14 : 28;
    const days: Array<{ x: number; label: string }> = [];
    const dayStart = new Date(start);
    const dayOfWeek = dayStart.getDay();
    dayStart.setDate(dayStart.getDate() + (dayOfWeek === 0 ? 1 : 8 - dayOfWeek));
    while (dayStart.getTime() < end) {
      const dayNum = dayStart.getDate();
      if (dayInterval <= 7 || dayNum === 1 || dayNum === 15) {
        const x = ((dayStart.getTime() - start) / DAY_MS) * px;
        days.push({ x, label: `${dayStart.getDate()}` });
      }
      dayStart.setDate(dayStart.getDate() + dayInterval);
    }

    return {
      timelineStart: start,
      timelineEnd: end,
      todayPos: ((today - start) / DAY_MS) * px,
      pxPerDay: px,
      totalWidth: width,
      monthMarkers: months,
      dayMarkers: days,
    };
  }, [zoom]);

  const ROW_HEIGHT = 62;
  const HEADER_HEIGHT = 40;
  const BAR_HEIGHT = 20;
  const svgHeight = HEADER_HEIGHT + activeReleases.length * ROW_HEIGHT + 10;

  const posX = (dateStr: string): number => {
    const day = toDay(dateStr);
    return ((day - timelineStart) / DAY_MS) * pxPerDay;
  };

  if (isLoading) return <Card><CardBody><Bullseye className="app-card-spinner"><Spinner /></Bullseye></CardBody></Card>;

  return (
    <Card>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            Release Timeline{' '}
            <Tooltip content="Visual timeline of CNV version lifecycles. Each bar represents a version, colored by phase. Markers show GA releases, batch releases, and milestones. Click a row to see the version dashboard. Hover over markers for details.">
              <OutlinedQuestionCircleIcon className="app-help-icon" />
            </Tooltip>
          </FlexItem>
          <FlexItem>
            <ToggleGroup aria-label="Zoom level">
              {(['3m', '6m', '1y', '2y'] as ZoomLevel[]).map(z => (
                <ToggleGroupItem key={z} text={z.toUpperCase()} isSelected={zoom === z} onChange={() => setZoom(z)} />
              ))}
            </ToggleGroup>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <div className="app-gantt-scroll" ref={scrollRef}>
          <svg width={totalWidth} height={svgHeight} className="app-gantt-svg">
            {monthMarkers.map((m, i) => (
              <g key={`m-${i}`}>
                <line x1={m.x} y1={0} x2={m.x} y2={svgHeight} className="app-gantt-month-line" />
                <text x={m.x + 4} y={14} className="app-gantt-month-text">{m.label}</text>
              </g>
            ))}

            {dayMarkers.map((d, i) => (
              <g key={`d-${i}`}>
                <line x1={d.x} y1={HEADER_HEIGHT - 8} x2={d.x} y2={HEADER_HEIGHT} className="app-gantt-day-tick" />
                <text x={d.x} y={HEADER_HEIGHT - 2} textAnchor="middle" className="app-gantt-day-text">{d.label}</text>
              </g>
            ))}

            <line x1={todayPos} y1={0} x2={todayPos} y2={svgHeight} className="app-gantt-today-line" />
            <text x={todayPos + 3} y={14} className="app-gantt-today-text">Today</text>

            {activeReleases.map((release, idx) => {
              const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
              const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
              const startX = release.startDate ? posX(release.startDate) : 0;
              const endX = release.endDate ? posX(release.endDate) : totalWidth;
              const barWidth = Math.max(4, endX - startX);
              const phaseColor = PHASE_COLORS[release.phase] ?? '#8a8d90';
              const isSelected = selectedVersion === release.shortname;
              const versionLabel = release.shortname.replace('cnv-', '');

              return (
                <g key={release.shortname} className="app-gantt-row" onClick={() => onSelectVersion(release.shortname)}>
                  <rect x={0} y={y} width={totalWidth} height={ROW_HEIGHT} className={`app-gantt-row-bg ${isSelected ? 'app-gantt-row-selected' : ''}`} />

                  <text x={8} y={barY + BAR_HEIGHT / 2 + 4} className="app-gantt-version-label">{versionLabel}</text>

                  <rect x={startX} y={barY} width={barWidth} height={BAR_HEIGHT} rx={4} fill={phaseColor} opacity={0.9} className="app-gantt-bar" />

                  {release.milestones
                    .filter(m => {
                      const mx = posX(m.date);
                      return mx >= 0 && mx <= totalWidth;
                    })
                    .map((m, mi) => {
                      const mx = posX(m.date);
                      const shape = MILESTONE_SHAPES[m.type] || MILESTONE_SHAPES.batch;
                      const shortVer = extractShortVersion(m.name);
                      const isBatchOrGa = m.type === 'batch' || m.type === 'ga';
                      const fmtDate = new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      return (
                        <g key={mi}>
                          {isBatchOrGa && (
                            <line x1={mx} y1={barY - 2} x2={mx} y2={barY + BAR_HEIGHT + 2} stroke={shape.color} strokeWidth={1.5} opacity={0.8} />
                          )}
                          <Popover
                            headerContent={<strong>{shortVer}</strong>}
                            bodyContent={
                              <div>
                                <Content component="p" className="app-mb-xs">{m.name}</Content>
                                <Content component="small" className="app-text-muted">{fmtDate}</Content>
                                {m.type !== 'batch' && <Label color={m.type === 'ga' ? 'red' : m.type === 'feature_freeze' ? 'orange' : 'blue'} isCompact className="app-ml-sm">{m.type.replace('_', ' ')}</Label>}
                              </div>
                            }
                            triggerAction="hover"
                            position="top"
                          >
                            <text
                              x={mx} y={barY + BAR_HEIGHT / 2 + 5}
                              textAnchor="middle" fill={shape.color}
                              fontSize={m.type === 'ga' ? 16 : 12}
                              fontWeight={m.type === 'ga' ? 700 : 600}
                              className="app-gantt-milestone"
                            >
                              {shape.symbol}
                            </text>
                          </Popover>
                          {isBatchOrGa && (
                            <g className="app-gantt-date-label-group">
                              <text x={mx} y={barY + BAR_HEIGHT + 13} textAnchor="middle" className="app-gantt-date-label app-gantt-date-ver">
                                {shortVer}
                              </text>
                              <text x={mx} y={barY + BAR_HEIGHT + 25} textAnchor="middle" className="app-gantt-date-label app-gantt-date-day">
                                {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                </g>
              );
            })}
          </svg>
        </div>

        <Flex className="app-mt-sm" spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }}>
          {Object.entries(MILESTONE_SHAPES).filter(([t]) => t !== 'custom').map(([type, { color, symbol }]) => (
            <FlexItem key={type}>
              <span style={{ color }} className="app-text-xs">{symbol}</span>
              <span className="app-text-xs app-text-muted app-ml-xs">{type.replace('_', ' ')}</span>
            </FlexItem>
          ))}
          <FlexItem><span className="app-text-xs app-text-muted">|</span></FlexItem>
          {Object.entries(PHASE_COLORS).map(([phase, color]) => (
            <FlexItem key={phase}>
              <span style={{ display: 'inline-block', width: 12, height: 8, background: color, borderRadius: 2, verticalAlign: 'middle' }} />
              <span className="app-text-xs app-text-muted app-ml-xs">{phase.split('/')[0].trim()}</span>
            </FlexItem>
          ))}
        </Flex>
      </CardBody>
    </Card>
  );
};
