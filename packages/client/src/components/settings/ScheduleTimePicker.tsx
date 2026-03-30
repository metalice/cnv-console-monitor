import { Content, Flex, FlexItem } from '@patternfly/react-core';

type ScheduleTimePickerProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const ScheduleTimePicker = ({ onChange, value }: ScheduleTimePickerProps) => (
  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
    <FlexItem>
      <Content className="app-text-muted" component="small">
        Time
      </Content>
    </FlexItem>
    <FlexItem>
      <input className="app-time-input" type="time" value={value} onChange={onChange} />
    </FlexItem>
  </Flex>
);
