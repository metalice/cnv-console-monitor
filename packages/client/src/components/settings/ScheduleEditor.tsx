import { useMemo } from 'react';

import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
} from '@patternfly/react-core';

import {
  ALL_DAY_IDS,
  buildCron,
  type DayPreset,
  getDayPreset,
  parseCron,
  TIMEZONE_LIST,
  WEEKDAY_IDS,
} from '../../utils/cronHelpers';
import { HelpLabel } from '../common/HelpLabel';
import type { SearchableSelectOption } from '../common/SearchableSelect';
import { SearchableSelect } from '../common/SearchableSelect';

import { ScheduleDaySelector } from './ScheduleDaySelector';
import { ScheduleTimePicker } from './ScheduleTimePicker';

const TZ_OPTIONS: SearchableSelectOption[] = TIMEZONE_LIST.map(timezone => ({
  label: timezone,
  value: timezone,
}));

type ScheduleEditorProps = {
  subId: number;
  schedule: string;
  timezone: string | null;
  onScheduleChange: (schedule: string) => void;
  onTimezoneChange: (tz: string) => void;
};

export const ScheduleEditor = ({
  onScheduleChange,
  onTimezoneChange,
  schedule,
  subId,
  timezone,
}: ScheduleEditorProps) => {
  const cronParsed = useMemo(() => parseCron(schedule), [schedule]);
  const dayPreset = useMemo(() => getDayPreset(cronParsed.days), [cronParsed.days]);

  const timezoneOptions = useMemo(() => {
    if (timezone && !TIMEZONE_LIST.includes(timezone)) {
      return [{ label: timezone, value: timezone }, ...TZ_OPTIONS];
    }
    return TZ_OPTIONS;
  }, [timezone]);

  const update = (hour: number, minute: number, days: Set<string>) => {
    onScheduleChange(buildCron(hour, minute, days));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      update(hours, minutes, cronParsed.days);
    }
  };

  const handlePreset = (preset: DayPreset) => {
    if (preset === 'every-day') {
      update(cronParsed.hour, cronParsed.minute, new Set(ALL_DAY_IDS));
    } else if (preset === 'weekdays') {
      update(cronParsed.hour, cronParsed.minute, new Set(WEEKDAY_IDS));
    }
  };

  const toggleDay = (dayId: string) => {
    const next = new Set(cronParsed.days);
    if (next.has(dayId)) {
      if (next.size <= 1) {
        return;
      }
      next.delete(dayId);
    } else {
      next.add(dayId);
    }
    update(cronParsed.hour, cronParsed.minute, next);
  };

  const timeValue = `${String(cronParsed.hour).padStart(2, '0')}:${String(cronParsed.minute).padStart(2, '0')}`;

  return (
    <DescriptionList
      isCompact
      isHorizontal
      className="app-mt-sm"
      columnModifier={{ default: '1Col' }}
    >
      <DescriptionListGroup>
        <DescriptionListTerm>
          <HelpLabel
            help="When to send the daily report. Choose a time, select which days, and pick a timezone."
            label="Schedule"
          />
        </DescriptionListTerm>
        <DescriptionListDescription>
          <Stack hasGutter>
            <StackItem>
              <ScheduleTimePicker value={timeValue} onChange={handleTimeChange} />
            </StackItem>
            <StackItem>
              <ScheduleDaySelector
                dayPreset={dayPreset}
                selectedDays={cronParsed.days}
                subId={subId}
                onPreset={handlePreset}
                onToggleDay={toggleDay}
              />
            </StackItem>
          </Stack>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>
          <HelpLabel
            help="The timezone used for scheduling. The report and reminder will trigger at the configured time in this timezone."
            label="Timezone"
          />
        </DescriptionListTerm>
        <DescriptionListDescription>
          <div className="app-max-w-250">
            <SearchableSelect
              id={`sub-tz-${subId}`}
              options={timezoneOptions}
              placeholder="Select timezone"
              value={timezone || 'Asia/Jerusalem'}
              onChange={onTimezoneChange}
            />
          </div>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};
