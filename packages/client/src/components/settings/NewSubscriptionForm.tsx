import React from 'react';

import { type SubscriptionType } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { PlusCircleIcon, TimesIcon } from '@patternfly/react-icons';

import { NewSubscriptionExtras } from './NewSubscriptionExtras';
import { NewSubscriptionFields } from './NewSubscriptionFields';
import { NewSubscriptionFooter } from './NewSubscriptionFooter';
import { ScheduleEditor } from './ScheduleEditor';
import type { AlertMessage } from './types';

export type NewRowState = {
  name: string;
  type: SubscriptionType;
  components: string[];
  slackWebhook: string;
  jiraWebhook: string;
  emailRecipients: string;
  schedule: string;
  enabled: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  aiDigest?: boolean;
  teamReportSlackWebhook: string;
  teamReportEmailRecipients: string;
  teamReportSchedule: string;
};

type NewSubscriptionFormProps = {
  newRow: NewRowState;
  setNewRow: React.Dispatch<React.SetStateAction<NewRowState | null>>;
  setNewRowTested: (v: boolean) => void;
  newRowTested: boolean;
  availableComponents: string[];
  testingSubId: number | string | null;
  subTestMessages: Record<number | string, AlertMessage[]>;
  userEmail: string;
  onTest: () => void;
  onSave: () => void;
  onCancel: () => void;
  isCreatePending: boolean;
};

export const NewSubscriptionForm = ({
  availableComponents,
  isCreatePending,
  newRow,
  newRowTested,
  onCancel,
  onSave,
  onTest,
  setNewRow,
  setNewRowTested,
  subTestMessages,
  testingSubId,
  userEmail: _userEmail,
}: NewSubscriptionFormProps) => {
  const updateField = <K extends keyof NewRowState>(field: K, value: NewRowState[K]) => {
    setNewRow(prev => (prev ? { ...prev, [field]: value } : prev));
    setNewRowTested(false);
  };

  const hasDestination =
    newRow.type === 'team_report'
      ? Boolean(newRow.teamReportSlackWebhook || newRow.teamReportEmailRecipients)
      : Boolean(newRow.slackWebhook || newRow.emailRecipients);

  return (
    <Card isCompact className="app-sub-card app-sub-card--new">
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <PlusCircleIcon className="app-sub-new-icon" />
              </FlexItem>
              <FlexItem>New Subscription</FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Button aria-label="Cancel" size="sm" variant="plain" onClick={onCancel}>
              <TimesIcon />
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content className="app-text-muted app-mb-md" component="small">
          Set up a new notification channel. You must test delivery before saving.
        </Content>

        <NewSubscriptionFields
          availableComponents={availableComponents}
          newRow={newRow}
          onFieldChange={updateField}
        />

        <ScheduleEditor
          schedule={
            newRow.type === 'team_report'
              ? newRow.teamReportSchedule || '0 9 * * 1'
              : newRow.schedule
          }
          subId={0}
          timezone="Asia/Jerusalem"
          onScheduleChange={schedule =>
            updateField(newRow.type === 'team_report' ? 'teamReportSchedule' : 'schedule', schedule)
          }
          onTimezoneChange={() => {
            // no-op
          }}
        />

        {newRow.type !== 'team_report' && (
          <NewSubscriptionExtras newRow={newRow} onFieldChange={updateField} />
        )}

        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
        {subTestMessages.new?.map((msg, idx) => (
          <Alert
            isInline
            isPlain
            className="app-mt-sm"
            // eslint-disable-next-line react/no-array-index-key -- static list from test result
            key={idx}
            title={msg.text}
            variant={msg.type}
          />
        ))}

        <NewSubscriptionFooter
          canSave={newRowTested}
          canTest={Boolean(newRow.name.trim()) && hasDestination}
          isSaveLoading={isCreatePending}
          isTestLoading={testingSubId === 'new'}
          showHint={!newRowTested && Boolean(newRow.name.trim()) && hasDestination}
          onCancel={onCancel}
          onSave={onSave}
          onTest={onTest}
        />
      </CardBody>
    </Card>
  );
};
