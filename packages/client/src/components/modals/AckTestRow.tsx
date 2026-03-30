import { Label, TextInput } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';

export type FailingTest = {
  name: string;
  shortName: string;
  jiraKey?: string;
  polarionId?: string;
};

type AckTestRowProps = {
  test: FailingTest;
  note: string;
  onNoteChange: (value: string) => void;
};

export const AckTestRow = ({ note, onNoteChange, test }: AckTestRowProps) => (
  <Tr key={test.name}>
    <Td dataLabel="Test">
      <span className="app-font-13">{test.shortName}</span>
      {test.polarionId && (
        <div>
          <Label isCompact color="blue">
            {test.polarionId}
          </Label>
        </div>
      )}
    </Td>
    <Td dataLabel="Jira">
      {test.jiraKey && (
        <Label isCompact color="blue">
          {test.jiraKey}
        </Label>
      )}
    </Td>
    <Td dataLabel="Note">
      <TextInput
        aria-label={`Note for ${test.shortName}`}
        placeholder="Why is this failing? What action is being taken?"
        validated={!note.trim() ? 'error' : 'default'}
        value={note}
        onChange={(_e, noteValue) => onNoteChange(noteValue)}
      />
    </Td>
  </Tr>
);
