import React, { useMemo, useRef, useState } from 'react';

import type { MilestoneType, ReleaseInfo } from '@cnv-monitor/shared';

import {
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Label,
  Popover,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

type ZoomLevel = '3m' | '6m' | '1y' | '2y';

const ZOOM_DAYS: Record<ZoomLevel, number> = { '1y': 365, '2y': 730, '3m': 90, '6m': 180 };

const PHASE_COLORS: Record<string, string> = {
  Concept: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
  Maintenance: 'var(--pf-t--global--color--status--success--default, #3e8635)',
  'Planning / Development / Testing': 'var(--pf-t--global--color--status--info--default, #2b9af3)',
};

const MILESTONE_SHAPES: Record<MilestoneType, { color: string; symbol: string }> = {
  batch: { color: '#2b9af3', symbol: '●' },
  blockers_only: { color: '#c9190b', symbol: '▲' },
  code_freeze: { color: '#ec7a08', symbol: '■' },
  custom: { color: '#6753ac', symbol: '◆' },
  feature_freeze: { color: '#f0ab00', symbol: '◆' },
  ga: { color: '#c9190b', symbol: '★' },
};

const extractShortVersion = (name: string): string => {
  const match = /(\d{1,20}\.\d{1,20}(?:\.\d{1,20})?)/.exec(name);
  return match
    ? match[1]
    : name
        .replace(/^Batch\s+/, '')
        .replace(/GA.*$/, '')
        .trim();
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

// eslint-disable-next-line max-lines-per-function
export const ReleaseGantt: React.FC<ReleaseGanttProps> = ({
  isLoading,
  onSelectVersion,
  releases,
  selectedVersion,
}) => {
  const [zoom, setZoom] = useState<ZoomLevel>('1y');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeReleases = useMemo(
    () => (releases ?? []).filter(r => r.phase !== 'Unsupported' && r.startDate),
    [releases],
  );

  const { dayMarkers, monthMarkers, pxPerDay, timelineStart, todayPos, totalWidth } =
    useMemo(() => {
      const today = toDay(new Date());
      const zoomDays = ZOOM_DAYS[zoom];
      const start = today - Math.floor(zoomDays * 0.3) * DAY_MS;
      const end = today + Math.ceil(zoomDays * 0.7) * DAY_MS;
      const px = 1200 / zoomDays;
      const width = Math.max(1200, zoomDays * px);

      const months: { x: number; label: string }[] = [];
      const d = new Date(start);
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      while (d.getTime() < end) {
        months.push({ label: formatMonth(d.getTime()), x: ((d.getTime() - start) / DAY_MS) * px });
        d.setMonth(d.getMonth() + 1);
      }

      const dayInterval = zoomDays <= 90 ? 7 : zoomDays <= 180 ? 14 : 28;
      const days: { x: number; label: string }[] = [];
      const dayStart = new Date(start);
      const dayOfWeek = dayStart.getDay();
      dayStart.setDate(dayStart.getDate() + (dayOfWeek === 0 ? 1 : 8 - dayOfWeek));
      while (dayStart.getTime() < end) {
        const dayNum = dayStart.getDate();
        if (dayInterval <= 7 || dayNum === 1 || dayNum === 15) {
          const x = ((dayStart.getTime() - start) / DAY_MS) * px;
          days.push({ label: `${dayStart.getDate()}`, x });
        }
        dayStart.setDate(dayStart.getDate() + dayInterval);
      }

      return {
        dayMarkers: days,
        monthMarkers: months,
        pxPerDay: px,
        timelineEnd: end,
        timelineStart: start,
        todayPos: ((today - start) / DAY_MS) * px,
        totalWidth: width,
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

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <Bullseye className="app-card-spinner">
            <Spinner />
          </Bullseye>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            Release Timeline{' '}
            <Tooltip content="Visual timeline of CNV version lifecycles. Each bar represents a version, colored by phase. Markers show GA releases, batch releases, and milestones. Click a row to see the version dashboard. Hover over markers for details.">
              <OutlinedQuestionCircleIcon className="app-help-icon" />
            </Tooltip>
          </FlexItem>
          <FlexItem>
            <ToggleGroup aria-label="Zoom level">
              {(['3m', '6m', '1y', '2y'] as ZoomLevel[]).map(z => (
                <ToggleGroupItem
                  isSelected={zoom === z}
                  key={z}
                  text={z.toUpperCase()}
                  onChange={() => setZoom(z)}
                />
              ))}
            </ToggleGroup>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <div className="app-gantt-scroll" ref={scrollRef}>
          <svg className="app-gantt-svg" height={svgHeight} width={totalWidth}>
            {monthMarkers.map((m, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <g key={`m-${i}`}>
                <line className="app-gantt-month-line" x1={m.x} x2={m.x} y1={0} y2={svgHeight} />
                <text className="app-gantt-month-text" x={m.x + 4} y={14}>
                  {m.label}
                </text>
              </g>
            ))}

            {dayMarkers.map((d, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <g key={`d-${i}`}>
                <line
                  className="app-gantt-day-tick"
                  x1={d.x}
                  x2={d.x}
                  y1={HEADER_HEIGHT - 8}
                  y2={HEADER_HEIGHT}
                />
                <text
                  className="app-gantt-day-text"
                  textAnchor="middle"
                  x={d.x}
                  y={HEADER_HEIGHT - 2}
                >
                  {d.label}
                </text>
              </g>
            ))}

            <line
              className="app-gantt-today-line"
              x1={todayPos}
              x2={todayPos}
              y1={0}
              y2={svgHeight}
            />
            <text className="app-gantt-today-text" x={todayPos + 3} y={14}>
              Today
            </text>

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
                <g
                  className="app-gantt-row"
                  key={release.shortname}
                  onClick={() => onSelectVersion(release.shortname)}
                >
                  <rect
                    className={`app-gantt-row-bg ${isSelected ? 'app-gantt-row-selected' : ''}`}
                    height={ROW_HEIGHT}
                    width={totalWidth}
                    x={0}
                    y={y}
                  />

                  <text className="app-gantt-version-label" x={8} y={barY + BAR_HEIGHT / 2 + 4}>
                    {versionLabel}
                  </text>

                  <rect
                    className="app-gantt-bar"
                    fill={phaseColor}
                    height={BAR_HEIGHT}
                    opacity={0.9}
                    rx={4}
                    width={barWidth}
                    x={startX}
                    y={barY}
                  />

                  {release.milestones
                    .filter(m => {
                      const mx = posX(m.date);
                      return mx >= 0 && mx <= totalWidth;
                    })
                    .map((m, mi) => {
                      const mx = posX(m.date);
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
                      const shape = MILESTONE_SHAPES[m.type] || MILESTONE_SHAPES.batch;
                      const shortVer = extractShortVersion(m.name);
                      const isBatchOrGa = m.type === 'batch' || m.type === 'ga';
                      const fmtDate = new Date(m.date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                      return (
                        // eslint-disable-next-line react/no-array-index-key
                        <g key={mi}>
                          {isBatchOrGa && (
                            <line
                              opacity={0.8}
                              stroke={shape.color}
                              strokeWidth={1.5}
                              x1={mx}
                              x2={mx}
                              y1={barY - 2}
                              y2={barY + BAR_HEIGHT + 2}
                            />
                          )}
                          <Popover
                            bodyContent={
                              <div>
                                <Content className="app-mb-xs" component="p">
                                  {m.name}
                                </Content>
                                <Content className="app-text-muted" component="small">
                                  {fmtDate}
                                </Content>
                                {m.type !== 'batch' && (
                                  <Label
                                    isCompact
                                    className="app-ml-sm"
                                    color={
                                      m.type === 'ga'
                                        ? 'red'
                                        : m.type === 'feature_freeze'
                                          ? 'orange'
                                          : 'blue'
                                    }
                                  >
                                    {m.type.replace('_', ' ')}
                                  </Label>
                                )}
                              </div>
                            }
                            headerContent={<strong>{shortVer}</strong>}
                            position="top"
                            triggerAction="hover"
                          >
                            <text
                              className="app-gantt-milestone"
                              fill={shape.color}
                              fontSize={m.type === 'ga' ? 16 : 12}
                              fontWeight={m.type === 'ga' ? 700 : 600}
                              textAnchor="middle"
                              x={mx}
                              y={barY + BAR_HEIGHT / 2 + 5}
                            >
                              {shape.symbol}
                            </text>
                          </Popover>
                          {isBatchOrGa && (
                            <g className="app-gantt-date-label-group">
                              <text
                                className="app-gantt-date-label app-gantt-date-ver"
                                textAnchor="middle"
                                x={mx}
                                y={barY + BAR_HEIGHT + 13}
                              >
                                {shortVer}
                              </text>
                              <text
                                className="app-gantt-date-label app-gantt-date-day"
                                textAnchor="middle"
                                x={mx}
                                y={barY + BAR_HEIGHT + 25}
                              >
                                {new Date(m.date).toLocaleDateString('en-US', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
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

        <Flex
          className="app-mt-sm"
          flexWrap={{ default: 'wrap' }}
          spaceItems={{ default: 'spaceItemsMd' }}
        >
          {Object.entries(MILESTONE_SHAPES)
            .filter(([t]) => t !== 'custom')
            .map(([type, { color, symbol }]) => (
              <FlexItem key={type}>
                <span className="app-text-xs" style={{ color }}>
                  {symbol}
                </span>
                <span className="app-text-xs app-text-muted app-ml-xs">
                  {type.replace('_', ' ')}
                </span>
              </FlexItem>
            ))}
          <FlexItem>
            <span className="app-text-xs app-text-muted">|</span>
          </FlexItem>
          {Object.entries(PHASE_COLORS).map(([phase, color]) => (
            <FlexItem key={phase}>
              <span
                style={{
                  background: color,
                  borderRadius: 2,
                  display: 'inline-block',
                  height: 8,
                  verticalAlign: 'middle',
                  width: 12,
                }}
              />
              <span className="app-text-xs app-text-muted app-ml-xs">
                {phase.split('/')[0].trim()}
              </span>
            </FlexItem>
          ))}
        </Flex>
      </CardBody>
    </Card>
  );
};
