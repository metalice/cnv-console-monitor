import React, { useMemo } from 'react';
import {
  Checkbox,
  Content,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { HelpLabel } from '../common/HelpLabel';
import type { SearchableSelectOption } from '../common/SearchableSelect';
import { SearchableSelect } from '../common/SearchableSelect';
import {
  DAYS, ALL_DAY_IDS, WEEKDAY_IDS, TIMEZONE_LIST,
  parseCron, buildCron, getDayPreset,
  type CronParsed, type DayPreset,
} from '../../utils/cronHelpers';

const TZ_OPTIONS: SearchableSelectOption[] = TIMEZONE_LIST.map(tz => ({ value: tz, label: tz }));

type ScheduleEditorProps = {
  subId: number;
  schedule: string;
  timezone: string | null;
  onScheduleChange: (schedule: string) => void;
  onTimezoneChange: (tz: string) => void;
};

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  subId, schedule, timezone, onScheduleChange, onTimezoneChange,
}) => {
  const cronParsed = useMemo(() => parseCron(schedule), [schedule]);
  const dayPreset = useMemo(() => getDayPreset(cronParsed.days), [cronParsed.days]);

  const timezoneOptions = useMemo(() => {
    if (timezone && !TIMEZONE_LIST.includes(timezone)) {
      return [{ value: timezone, label: timezone }, ...TZ_OPTIONS];
    }
    return TZ_OPTIONS;
  }, [timezone]);

  const update = (hour: number, minute: number, days: Set<string>) => {
    onScheduleChange(buildCron(hour, minute, days));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) update(h, m, cronParsed.days);
  };

  const handlePreset = (preset: DayPreset) => {
    if (preset === 'every-day') update(cronParsed.hour, cronParsed.minute, new Set(ALL_DAY_IDS));
    else if (preset === 'weekdays') update(cronParsed.hour, cronParsed.minute, new Set(WEEKDAY_IDS));
  };

  const toggleDay = (dayId: string) => {
    const next = new Set(cronParsed.days);
    if (next.has(dayId)) { if (next.size <= 1) return; next.delete(dayId); } else { next.add(dayId); }
    update(cronParsed.hour, cronParsed.minute, next);
  };

  const timeValue = `${String(cronParsed.hour).padStart(2, '0')}:${String(cronParsed.minute).padStart(2, '0')}`;

  return (
    <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }} className="app-mt-sm">
      <DescriptionListGroup>
        <DescriptionListTerm><HelpLabel label="Schedule" help="When to send the daily report. Choose a time, select which days, and pick a timezone." /></DescriptionListTerm>
        <DescriptionListDescription>
          <Stack hasGutter>
            <StackItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem><Content component="small" className="app-text-muted">Time</Content></FlexItem>
                <FlexItem>
                  <input type="time" value={timeValue} onChange={handleTimeChange} className="app-time-input" />
                </FlexItem>
              </Flex>
            </StackItem>
            <StackItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem><Content component="small" className="app-text-muted">Days</Content></FlexItem>
                <FlexItem>
                  <ToggleGroup>
                    <ToggleGroupItem text="Every day" isSelected={dayPreset === 'every-day'} onChange={() => handlePreset('every-day')} />
                    <ToggleGroupItem text="Weekdays" isSelected={dayPreset === 'weekdays'} onChange={() => handlePreset('weekdays')} />
                    <ToggleGroupItem text="Custom" isSelected={dayPreset === 'custom'} onChange={() => {}} />
                  </ToggleGroup>
                </FlexItem>
              </Flex>
            </StackItem>
            <StackItem>
              <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                {DAYS.map(day => (
                  <FlexItem key={day.id}>
                    <Checkbox
                      id={`sub-day-${subId}-${day.id}`}
                      label={day.label}
                      isChecked={cronParsed.days.has(day.id)}
                      onChange={() => toggleDay(day.id)}
                      isDisabled={cronParsed.days.has(day.id) && cronParsed.days.size <= 1}
                    />
                  </FlexItem>
                ))}
              </Flex>
            </StackItem>
          </Stack>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm><HelpLabel label="Timezone" help="The timezone used for scheduling. The report and reminder will trigger at the configured time in this timezone." /></DescriptionListTerm>
        <DescriptionListDescription>
          <div className="app-max-w-250">
            <SearchableSelect
              id={`sub-tz-${subId}`}
              value={timezone || 'Asia/Jerusalem'}
              options={timezoneOptions}
              onChange={onTimezoneChange}
              placeholder="Select timezone"
            />
          </div>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};
