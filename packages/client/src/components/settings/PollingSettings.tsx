import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  Content,
} from '@patternfly/react-core';
import { SearchableSelect } from '../common/SearchableSelect';
import type { SettingsSectionProps } from './types';
import { POLL_INTERVAL_OPTIONS, LOOKBACK_OPTIONS } from './types';

export const PollingSettings: React.FC<SettingsSectionProps> = ({
  val,
  set,
  sourceLabel,
  adminOnly,
}) => (
  <Card>
    <CardTitle>Polling</CardTitle>
    <CardBody>
      <Content component="small" className="app-text-muted app-mb-md">
        How often the server fetches new data from ReportPortal. Initial History controls how far back to look when the database is empty.
      </Content>
      <Form>
        <FormGroup label={<>Poll Interval {sourceLabel('schedule.pollIntervalMinutes')}</>} fieldId="poll-interval">
          <SearchableSelect
            id="poll-interval"
            value={val('schedule.pollIntervalMinutes')}
            options={POLL_INTERVAL_OPTIONS}
            onChange={(selected) => set('schedule.pollIntervalMinutes', selected)}
            placeholder="Select interval"
            isDisabled={adminOnly}
          />
        </FormGroup>
        <FormGroup label={<>Initial History {sourceLabel('schedule.initialLookbackDays')}</>} fieldId="lookback">
          <SearchableSelect
            id="lookback"
            value={val('schedule.initialLookbackDays')}
            options={LOOKBACK_OPTIONS}
            onChange={(selected) => set('schedule.initialLookbackDays', selected)}
            placeholder="Select range"
            isDisabled={adminOnly}
          />
        </FormGroup>
      </Form>
    </CardBody>
  </Card>
);
