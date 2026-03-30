import {
  Alert,
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextArea,
  Tooltip,
} from '@patternfly/react-core';
import { MagicIcon } from '@patternfly/react-icons';

import { SearchableSelect } from '../common/SearchableSelect';

import { useTriageForm } from './useTriageForm';

type TriageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  itemIds: number[];
  testContext?: {
    testName: string;
    component?: string;
    errorMessage?: string;
    consecutiveFailures?: number;
  };
};

export const TriageModal = ({ isOpen, itemIds, onClose, testContext }: TriageModalProps) => {
  const {
    aiMutation,
    aiSuggestion,
    comment,
    defectType,
    mutation,
    options,
    setComment,
    setDefectType,
  } = useTriageForm(itemIds, onClose, testContext);

  const isBulk = itemIds.length > 1;

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={onClose}>
      <ModalHeader title={isBulk ? `Classify ${itemIds.length} Items` : 'Classify Defect'} />
      <ModalBody>
        <Form>
          {testContext && !isBulk && (
            <FormGroup>
              <Tooltip content="AI analyzes the error message and test context to suggest the most likely defect classification (Product Bug, Automation Bug, System Issue, etc.)">
                <Button
                  icon={<MagicIcon />}
                  isDisabled={aiMutation.isPending}
                  isLoading={aiMutation.isPending}
                  size="sm"
                  variant="secondary"
                  onClick={() => aiMutation.mutate()}
                >
                  AI Suggest
                </Button>
              </Tooltip>
              {aiSuggestion && (
                <Alert
                  isInline
                  isPlain
                  className="app-mt-sm"
                  title={`AI suggests: ${aiSuggestion.suggestedLabel ?? aiSuggestion.suggestedType} (${aiSuggestion.confidence} confidence)`}
                  variant="info"
                />
              )}
            </FormGroup>
          )}
          <FormGroup isRequired label="Defect Type">
            <SearchableSelect
              id="defect-type"
              noResultsText="No defect types"
              options={options}
              placeholder="Select a defect type..."
              value={defectType}
              onChange={setDefectType}
            />
          </FormGroup>
          <FormGroup label="Comment">
            <TextArea
              placeholder="Reason for classification..."
              value={comment}
              onChange={(_e, val) => setComment(val)}
            />
          </FormGroup>
          {mutation.isError && (
            <HelperText>
              <HelperTextItem variant="error">{mutation.error.message}</HelperTextItem>
            </HelperText>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!defectType}
          isLoading={mutation.isPending}
          variant="primary"
          onClick={() => mutation.mutate()}
        >
          Classify
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
