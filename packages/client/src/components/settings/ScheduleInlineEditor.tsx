import React, { useMemo } from 'react';
import { Button } from '@patternfly/react-core';

const SCHED_DAYS = [
  { id: '1', label: 'M' },
  { id: '2', label: 'T' },
  { id: '3', label: 'W' },
  { id: '4', label: 'T' },
  { id: '5', label: 'F' },
  { id: '6', label: 'S' },
  { id: '0', label: 'S' },
];

type ScheduleInlineEditorProps = {
  schedule: string;
  onChange: (cron: string) => void;
};

export const ScheduleInlineEditor: React.FC<ScheduleInlineEditorProps> = ({ schedule, onChange }) => {
  const parts = schedule.split(' ');
  const minute = parseInt(parts[0]) || 0;
  const hour = parseInt(parts[1]) || 7;
  const daysPart = parts[4] || '*';

  const days = useMemo(() => {
    if (daysPart === '*') return new Set(SCHED_DAYS.map(day => day.id));
    const ids = daysPart.split(',').flatMap(seg => {
      const match = seg.match(/^(\d)-(\d)$/);
      if (match) { const result: string[] = []; for (let idx = parseInt(match[1]); idx <= parseInt(match[2]); idx++) result.push(String(idx)); return result; }
      return [seg];
    });
    return new Set(ids);
  }, [daysPart]);

  const rebuild = (newHour: number, newMinute: number, selectedDays: Set<string>) => {
    const dayString = selectedDays.size === 0 || selectedDays.size === 7 ? '*' : [...selectedDays].sort((a, b) => parseInt(a) - parseInt(b)).join(',');
    onChange(`${newMinute} ${newHour} * * ${dayString}`);
  };

  return (
    <div className="app-schedule-editor">
      <input
        type="time"
        value={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
        onChange={(e) => { const [newHour, newMinute] = e.target.value.split(':').map(Number); if (!isNaN(newHour) && !isNaN(newMinute)) rebuild(newHour, newMinute, days); }}
        className="app-time-input-sm"
      />
      <div className="app-schedule-days">
        {SCHED_DAYS.map((day, i) => (
          <Button
            key={`${day.id}-${i}`}
            variant={days.has(day.id) ? 'primary' : 'plain'}
            size="sm"
            onClick={() => { const next = new Set(days); if (next.has(day.id)) { if (next.size > 1) next.delete(day.id); } else next.add(day.id); rebuild(hour, minute, next); }}
            className="app-day-button"
          >
            {day.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
