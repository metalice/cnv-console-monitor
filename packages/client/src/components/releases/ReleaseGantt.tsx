import { useMemo, useRef, useState } from 'react';

import {
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

import { HEADER_HEIGHT, type ReleaseGanttProps, type ZoomLevel } from './ganttConstants';
import { GanttGrid } from './GanttGrid';
import { GanttLegend } from './GanttLegend';
import { GanttRow } from './GanttRow';
import { useGanttTimeline } from './useGanttTimeline';

const ZOOM_LEVELS: ZoomLevel[] = ['3m', '6m', '1y', '2y'];

export const ReleaseGantt = ({
  isLoading,
  onSelectVersion,
  releases,
  selectedVersion,
}: ReleaseGanttProps) => {
  const [zoom, setZoom] = useState<ZoomLevel>('1y');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeReleases = useMemo(
    () => (releases ?? []).filter(rel => rel.phase !== 'Unsupported' && rel.startDate),
    [releases],
  );

  const { dayMarkers, monthMarkers, posX, svgHeight, todayPos, totalWidth } = useGanttTimeline(
    zoom,
    activeReleases,
  );

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
              {ZOOM_LEVELS.map(zoomLevel => (
                <ToggleGroupItem
                  isSelected={zoom === zoomLevel}
                  key={zoomLevel}
                  text={zoomLevel.toUpperCase()}
                  onChange={() => setZoom(zoomLevel)}
                />
              ))}
            </ToggleGroup>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <div className="app-gantt-scroll" ref={scrollRef}>
          <svg className="app-gantt-svg" height={svgHeight} width={totalWidth}>
            <GanttGrid
              dayMarkers={dayMarkers}
              monthMarkers={monthMarkers}
              svgHeight={svgHeight}
              todayPos={todayPos}
            />
            {activeReleases.map((release, idx) => (
              <GanttRow
                headerHeight={HEADER_HEIGHT}
                index={idx}
                isSelected={selectedVersion === release.shortname}
                key={release.shortname}
                posX={posX}
                release={release}
                totalWidth={totalWidth}
                onSelect={() => onSelectVersion(release.shortname)}
              />
            ))}
          </svg>
        </div>
        <GanttLegend />
      </CardBody>
    </Card>
  );
};
