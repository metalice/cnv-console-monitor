import type { ThProps } from '@patternfly/react-table';
import { Th, Thead, Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

type TestItemsTableHeadProps = {
  isGroupMode: boolean;
  isColumnVisible: (id: string) => boolean;
  getSortParams: (index: number) => ThProps['sort'];
};

export const TestItemsTableHead = ({
  getSortParams,
  isColumnVisible,
  isGroupMode,
}: TestItemsTableHeadProps) => (
  <Thead>
    <Tr>
      <Th />
      {isColumnVisible('testName') && (
        <ThWithHelp help="Short name of the test case." label="Test Name" sort={getSortParams(1)} />
      )}
      {isGroupMode && (
        <ThWithHelp
          help="Number of times this test failed across the launches in this group."
          label="Occurrences"
          sort={getSortParams(2)}
        />
      )}
      {isColumnVisible('status') && (
        <ThWithHelp
          help="Test result: FAILED, PASSED, or SKIPPED."
          label="Status"
          sort={getSortParams(isGroupMode ? 3 : 2)}
        />
      )}
      {isColumnVisible('error') && (
        <ThWithHelp help="First line of the error log. Expand row for full logs." label="Error" />
      )}
      {isColumnVisible('polarion') && (
        <ThWithHelp
          help="Polarion test case ID."
          label="Polarion"
          sort={getSortParams(isGroupMode ? 5 : 4)}
        />
      )}
      {isColumnVisible('defect') && (
        <ThWithHelp
          help="AI prediction of defect type with confidence %."
          label="AI Prediction"
          sort={getSortParams(isGroupMode ? 6 : 5)}
        />
      )}
      {isColumnVisible('jira') && (
        <ThWithHelp
          help="Linked Jira issue key and status."
          label="Jira"
          sort={getSortParams(isGroupMode ? 7 : 6)}
        />
      )}
      {isColumnVisible('actions') && (
        <ThWithHelp
          help="Classify: set defect type. Bug: create Jira. Link: associate existing Jira."
          label="Actions"
        />
      )}
    </Tr>
  </Thead>
);
