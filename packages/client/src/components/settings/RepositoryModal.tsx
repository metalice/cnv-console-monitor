import type { Repository } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Form,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';

import { AdvancedSection } from './AdvancedSection';
import { ConnectionSection } from './ConnectionSection';
import { TrackingSection } from './TrackingSection';
import { useRepositoryForm } from './useRepositoryForm';

type RepositoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  existing?: Repository;
};

export const RepositoryModal = ({ existing, isOpen, onClose }: RepositoryModalProps) => {
  const form = useRepositoryForm(isOpen, existing);

  const handleSubmit = () => {
    form.mutation.mutate(undefined, { onSuccess: onClose });
  };

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.large} onClose={onClose}>
      <ModalHeader
        description="Connect a GitLab or GitHub repository for test documentation and quarantine management."
        title={existing ? `Edit Repository: ${existing.name}` : 'Add Repository'}
      />
      <ModalBody>
        <Form isHorizontal>
          <ConnectionSection form={form} />
          <TrackingSection form={form} />
          <AdvancedSection form={form} />

          {form.mutation.isError && (
            <Alert
              isInline
              className="app-mt-md"
              title="Failed to save repository"
              variant="danger"
            >
              {form.mutation.error.message}
            </Alert>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!form.canSubmit || form.mutation.isPending}
          isLoading={form.mutation.isPending}
          variant="primary"
          onClick={handleSubmit}
        >
          {existing ? 'Save Changes' : 'Add Repository'}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
