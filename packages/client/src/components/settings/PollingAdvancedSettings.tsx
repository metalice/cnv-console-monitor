import { Content, Form, FormGroup, TextInput } from '@patternfly/react-core';

import { HelpLabel } from '../common/HelpLabel';

import { type SettingsSectionProps } from './types';

type PollingAdvancedSettingsProps = Pick<SettingsSectionProps, 'set' | 'val'> & {
  adminOnly: boolean;
};

export const PollingAdvancedSettings = ({ adminOnly, set, val }: PollingAdvancedSettingsProps) => (
  <>
    <Content className="app-text-muted app-mb-md" component="small">
      Control parallel connections and batch sizes. Higher values are faster but may trigger rate
      limiting.
    </Content>
    <Form>
      <FormGroup
        fieldId="rp-page-size"
        label={
          <HelpLabel
            help="Number of launches fetched per API call to ReportPortal. Larger pages = fewer requests, smoother progress. Range: 10–1000."
            label="RP Page Size"
          />
        }
      >
        <div className="app-max-w-120">
          <TextInput
            id="rp-page-size"
            isDisabled={adminOnly}
            max={1000}
            min={10}
            type="number"
            value={val('schedule.rpPageSize') || '100'}
            onChange={(_e, value) => set('schedule.rpPageSize', value)}
          />
        </div>
      </FormGroup>
      <FormGroup
        fieldId="rp-concurrency"
        label={
          <HelpLabel
            help="Number of parallel requests to ReportPortal when fetching test items and logs. Range: 1–100."
            label="RP Concurrency"
          />
        }
      >
        <div className="app-max-w-120">
          <TextInput
            id="rp-concurrency"
            isDisabled={adminOnly}
            max={100}
            min={1}
            type="number"
            value={val('schedule.rpConcurrency') || '20'}
            onChange={(_e, value) => set('schedule.rpConcurrency', value)}
          />
        </div>
      </FormGroup>
      <FormGroup
        fieldId="jenkins-concurrency"
        label={
          <HelpLabel
            help="Number of parallel requests to Jenkins when enriching launches. Range: 1–100."
            label="Jenkins Concurrency"
          />
        }
      >
        <div className="app-max-w-120">
          <TextInput
            id="jenkins-concurrency"
            isDisabled={adminOnly}
            max={100}
            min={1}
            type="number"
            value={val('schedule.jenkinsConcurrency') || '20'}
            onChange={(_e, value) => set('schedule.jenkinsConcurrency', value)}
          />
        </div>
      </FormGroup>
    </Form>
  </>
);
