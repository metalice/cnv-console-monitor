import { HEADER_HEIGHT } from './ganttConstants';

type Marker = { x: number; label: string };

type GanttGridProps = {
  monthMarkers: Marker[];
  dayMarkers: Marker[];
  todayPos: number;
  svgHeight: number;
};

export const GanttGrid = ({ dayMarkers, monthMarkers, svgHeight, todayPos }: GanttGridProps) => (
  <>
    {monthMarkers.map((marker, idx) => (
      // eslint-disable-next-line react/no-array-index-key
      <g key={`month-${idx}`}>
        <line className="app-gantt-month-line" x1={marker.x} x2={marker.x} y1={0} y2={svgHeight} />
        <text className="app-gantt-month-text" x={marker.x + 4} y={14}>
          {marker.label}
        </text>
      </g>
    ))}
    {dayMarkers.map((marker, idx) => (
      // eslint-disable-next-line react/no-array-index-key
      <g key={`day-${idx}`}>
        <line
          className="app-gantt-day-tick"
          x1={marker.x}
          x2={marker.x}
          y1={HEADER_HEIGHT - 8}
          y2={HEADER_HEIGHT}
        />
        <text className="app-gantt-day-text" textAnchor="middle" x={marker.x} y={HEADER_HEIGHT - 2}>
          {marker.label}
        </text>
      </g>
    ))}
    <line className="app-gantt-today-line" x1={todayPos} x2={todayPos} y1={0} y2={svgHeight} />
    <text className="app-gantt-today-text" x={todayPos + 3} y={14}>
      Today
    </text>
  </>
);
