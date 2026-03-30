import { Flex, FlexItem } from '@patternfly/react-core';

import { MILESTONE_SHAPES, PHASE_COLORS } from './ganttConstants';

export const GanttLegend = () => (
  <Flex
    className="app-mt-sm"
    flexWrap={{ default: 'wrap' }}
    spaceItems={{ default: 'spaceItemsMd' }}
  >
    {Object.entries(MILESTONE_SHAPES)
      .filter(([shapeType]) => shapeType !== 'custom')
      .map(([type, { color, symbol }]) => (
        <FlexItem key={type}>
          <span className="app-text-xs" style={{ color }}>
            {symbol}
          </span>
          <span className="app-text-xs app-text-muted app-ml-xs">{type.replace('_', ' ')}</span>
        </FlexItem>
      ))}
    <FlexItem>
      <span className="app-text-xs app-text-muted">|</span>
    </FlexItem>
    {Object.entries(PHASE_COLORS).map(([phase, color]) => (
      <FlexItem key={phase}>
        <span className="app-gantt-legend-swatch" style={{ background: color }} />
        <span className="app-text-xs app-text-muted app-ml-xs">{phase.split('/')[0].trim()}</span>
      </FlexItem>
    ))}
  </Flex>
);
