import { type ThProps } from '@patternfly/react-table';
import { Th, Thead, Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

type FailuresTableHeadProps = {
  isColumnVisible: (id: string) => boolean;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  getSortParams: (index: number) => ThProps['sort'];
};

export const FailuresTableHead = ({
  allSelected,
  getSortParams,
  isColumnVisible,
  onSelectAll,
}: FailuresTableHeadProps) => (
  <Thead>
    <Tr>
      {isColumnVisible('select') && (
        <Th
          select={{
            isSelected: allSelected,
            onSelect: (_event, checked) => onSelectAll(checked),
          }}
        />
      )}
      {isColumnVisible('testName') && (
        <ThWithHelp
          help="Short name of the failed test case."
          label="Test Name"
          sort={getSortParams(1)}
        />
      )}
      {isColumnVisible('occurrences') && (
        <ThWithHelp
          help="Times this test failed across launches in the selected window."
          label="Occurrences"
          sort={getSortParams(2)}
        />
      )}
      {isColumnVisible('status') && (
        <ThWithHelp
          help="Test item status (untriaged failures only)."
          label="Status"
          sort={getSortParams(3)}
        />
      )}
      {isColumnVisible('error') && <ThWithHelp help="First line of the error log." label="Error" />}
      {isColumnVisible('polarion') && (
        <ThWithHelp help="Polarion test case ID." label="Polarion" sort={getSortParams(5)} />
      )}
      {isColumnVisible('aiPrediction') && (
        <ThWithHelp
          help="AI defect type prediction with confidence %."
          label="AI Prediction"
          sort={getSortParams(6)}
        />
      )}
      {isColumnVisible('jira') && (
        <ThWithHelp help="Linked Jira issue key and status." label="Jira" sort={getSortParams(7)} />
      )}
      {isColumnVisible('actions') && (
        <ThWithHelp help="Classify or create Jira bugs." label="Actions" />
      )}
    </Tr>
  </Thead>
);
