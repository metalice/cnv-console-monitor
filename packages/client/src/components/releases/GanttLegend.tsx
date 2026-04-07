import { MILESTONE_SHAPES, PHASE_COLORS } from './ganttConstants';

export const GanttLegend = () => (
  <div className="app-gantt-legend">
    <div className="app-gantt-legend-group">
      <span className="app-gantt-legend-title">Milestones</span>
      <div className="app-gantt-legend-items">
        {Object.entries(MILESTONE_SHAPES).map(([type, { color, label, symbol }]) => (
          <span className="app-gantt-legend-item" key={type}>
            <span className="app-gantt-legend-symbol" style={{ color }}>
              {symbol}
            </span>
            <span className="app-gantt-legend-text">{label}</span>
          </span>
        ))}
      </div>
    </div>
    <div className="app-gantt-legend-divider" />
    <div className="app-gantt-legend-group">
      <span className="app-gantt-legend-title">Phase</span>
      <div className="app-gantt-legend-items">
        {Object.entries(PHASE_COLORS).map(([phase, color]) => (
          <span className="app-gantt-legend-item" key={phase}>
            <span className="app-gantt-legend-swatch" style={{ background: color }} />
            <span className="app-gantt-legend-text">{phase}</span>
          </span>
        ))}
      </div>
    </div>
  </div>
);
