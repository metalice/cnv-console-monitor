import { Alert, Button, Flex, FlexItem } from '@patternfly/react-core';
import { CheckIcon } from '@patternfly/react-icons';

type EditModeAlertProps = {
  pendingEditsCount: number;
  savingEdits: boolean;
  onSaveEdits: () => void;
  onCancelEdit: () => void;
};

export const EditModeAlert = ({
  onCancelEdit,
  onSaveEdits,
  pendingEditsCount,
  savingEdits,
}: EditModeAlertProps) => (
  <Alert
    isInline
    isPlain
    className="app-mb-sm"
    title={`Edit mode: ${pendingEditsCount} pending change${pendingEditsCount !== 1 ? 's' : ''}`}
    variant="info"
  >
    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>
        <Button
          isDisabled={pendingEditsCount === 0}
          isLoading={savingEdits}
          size="sm"
          variant="primary"
          onClick={onSaveEdits}
        >
          <CheckIcon className="app-mr-xs" />
          Save Edits
        </Button>
      </FlexItem>
      <FlexItem>
        <Button size="sm" variant="link" onClick={onCancelEdit}>
          Cancel
        </Button>
      </FlexItem>
    </Flex>
  </Alert>
);
