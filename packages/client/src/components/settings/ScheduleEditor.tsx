import React, { useMemo } from 'react';

import {
  Checkbox,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';

import {
  ALL_DAY_IDS,
  buildCron,
  type DayPreset,
  DAYS,
  getDayPreset,
  parseCron,
  TIMEZONE_LIST,
  WEEKDAY_IDS,
} from '../../utils/cronHelpers';
import { HelpLabel } from '../common/HelpLabel';
import type { SearchableSelectOption } from '../common/SearchableSelect';
import { SearchableSelect } from '../common/SearchableSelect';

const TZ_OPTIONS: SearchableSelectOption[] = TIMEZONE_LIST.map(tz => ({ label: tz, value: tz }));

type ScheduleEditorProps = {
  subId: number;
  schedule: string;
  timezone: string | null;
  onScheduleChange: (schedule: string) => void;
  onTimezoneChange: (tz: string) => void;
};

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  onScheduleChange,
  onTimezoneChange,
  schedule,
  subId,
  timezone,
}) => {
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
    const [h, m] = e.target.value.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      update(h, m, cronParsed.days);
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
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsMd' }}
              >
                <FlexItem>
                  <Content className="app-text-muted" component="small">
                    Time
                  </Content>
                </FlexItem>
                <FlexItem>
                  <input
                    className="app-time-input"
                    type="time"
                    value={timeValue}
                    onChange={handleTimeChange}
                  />
                </FlexItem>
              </Flex>
            </StackItem>
            <StackItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsMd' }}
              >
                <FlexItem>
                  <Content className="app-text-muted" component="small">
                    Days
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ToggleGroup>
                    <ToggleGroupItem
                      isSelected={dayPreset === 'every-day'}
                      text="Every day"
                      onChange={() => handlePreset('every-day')}
                    />
                    <ToggleGroupItem
                      isSelected={dayPreset === 'weekdays'}
                      text="Weekdays"
                      onChange={() => handlePreset('weekdays')}
                    />
                    <ToggleGroupItem
                      isSelected={dayPreset === 'custom'}
                      text="Custom"
                      onChange={() => {
                        // no-op
                      }}
                    />
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
                      isChecked={cronParsed.days.has(day.id)}
                      isDisabled={cronParsed.days.has(day.id) && cronParsed.days.size <= 1}
                      label={day.label}
                      onChange={() => toggleDay(day.id)}
                    />
                  </FlexItem>
                ))}
              </Flex>
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
