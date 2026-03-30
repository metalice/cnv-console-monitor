import {
  Checkbox,
  Content,
  Flex,
  FlexItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';

import { type DayPreset, DAYS } from '../../utils/cronHelpers';

type ScheduleDaySelectorProps = {
  subId: number;
  dayPreset: DayPreset;
  selectedDays: Set<string>;
  onPreset: (preset: DayPreset) => void;
  onToggleDay: (dayId: string) => void;
};

export const ScheduleDaySelector = ({
  dayPreset,
  onPreset,
  onToggleDay,
  selectedDays,
  subId,
}: ScheduleDaySelectorProps) => (
  <>
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
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
            onChange={() => onPreset('every-day')}
          />
          <ToggleGroupItem
            isSelected={dayPreset === 'weekdays'}
            text="Weekdays"
            onChange={() => onPreset('weekdays')}
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
    <Flex spaceItems={{ default: 'spaceItemsMd' }}>
      {DAYS.map(day => (
        <FlexItem key={day.id}>
          <Checkbox
            id={`sub-day-${subId}-${day.id}`}
            isChecked={selectedDays.has(day.id)}
            isDisabled={selectedDays.has(day.id) && selectedDays.size <= 1}
            label={day.label}
            onChange={() => onToggleDay(day.id)}
          />
        </FlexItem>
      ))}
    </Flex>
  </>
);
