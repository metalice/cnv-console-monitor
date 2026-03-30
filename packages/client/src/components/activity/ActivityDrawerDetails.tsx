import { type ActivityEntry } from '@cnv-monitor/shared';

import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';

type ActivityDrawerDetailsProps = {
  entry: ActivityEntry;
  isAck: boolean;
};

export const ActivityDrawerDetails = ({ entry, isAck }: ActivityDrawerDetailsProps) => (
  <DescriptionList isCompact isHorizontal>
    {entry.component && (
      <DescriptionListGroup>
        <DescriptionListTerm>Component</DescriptionListTerm>
        <DescriptionListDescription>
          <Label isCompact color="grey">
            {entry.component}
          </Label>
        </DescriptionListDescription>
      </DescriptionListGroup>
    )}
    {!isAck && entry.test_name && (
      <DescriptionListGroup>
        <DescriptionListTerm>Test</DescriptionListTerm>
        <DescriptionListDescription>
          <span className="app-text-xs">{entry.test_name}</span>
        </DescriptionListDescription>
      </DescriptionListGroup>
    )}
    {entry.old_value && entry.new_value && entry.old_value !== entry.new_value && (
      <DescriptionListGroup>
        <DescriptionListTerm>Change</DescriptionListTerm>
        <DescriptionListDescription>
          <span className="app-diff-badge">
            <Label isCompact color="red">
              {entry.old_value}
            </Label>
            <ArrowRightIcon className="app-diff-arrow" />
            <Label isCompact color="green">
              {entry.new_value}
            </Label>
          </span>
        </DescriptionListDescription>
      </DescriptionListGroup>
    )}
    {!entry.old_value && entry.new_value && (
      <DescriptionListGroup>
        <DescriptionListTerm>Value</DescriptionListTerm>
        <DescriptionListDescription>{entry.new_value}</DescriptionListDescription>
      </DescriptionListGroup>
    )}
    {entry.performed_by && (
      <DescriptionListGroup>
        <DescriptionListTerm>By</DescriptionListTerm>
        <DescriptionListDescription>{entry.performed_by}</DescriptionListDescription>
      </DescriptionListGroup>
    )}
    {entry.notes && (
      <DescriptionListGroup>
        <DescriptionListTerm>Notes</DescriptionListTerm>
        <DescriptionListDescription>
          <pre className="app-ack-notes">{entry.notes}</pre>
        </DescriptionListDescription>
      </DescriptionListGroup>
    )}
    {entry.pin_note && (
      <DescriptionListGroup>
        <DescriptionListTerm>Pin Note</DescriptionListTerm>
        <DescriptionListDescription>{entry.pin_note}</DescriptionListDescription>
      </DescriptionListGroup>
    )}
  </DescriptionList>
);
