import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

import { apiFetch } from '../../api/client';
import { useToast } from '../../context/ToastContext';

type DangerAction = {
  label: string;
  description: string;
  confirmWord: string;
  action: () => Promise<unknown>;
};

const DANGER_ACTIONS: Record<string, DangerAction> = {
  clearData: {
    action: () => apiFetch('/poll/backfill', { method: 'POST' }),
    confirmWord: 'DELETE',
    description:
      'This will delete all launches, test items, and trends. Settings and users are preserved.',
    label: 'Clear All Data',
  },
  resetSettings: {
    action: () => apiFetch('/settings/reset', { method: 'POST' }),
    confirmWord: 'RESET',
    description: 'This will remove all custom settings and revert to environment/default values.',
    label: 'Reset All Settings',
  },
};

export const DangerZone = () => {
  const { addToast } = useToast();
  const [dangerModal, setDangerModal] = useState<string | null>(null);
  const [dangerConfirm, setDangerConfirm] = useState('');

  const activeDanger = dangerModal ? DANGER_ACTIONS[dangerModal] : null;

  const handleConfirm = () => {
    if (!dangerModal) return;
    const action = DANGER_ACTIONS[dangerModal];
    if (dangerConfirm !== action.confirmWord) return;
    setDangerModal(null);
    setDangerConfirm('');
    addToast('info', `${action.label} started...`);
    action
      .action()
      .catch(e => addToast('danger', e instanceof Error ? e.message : 'Operation failed'));
  };

  return (
    <>
      <Card className="app-mb-lg app-danger-zone">
        <CardTitle>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <ExclamationTriangleIcon />
            </FlexItem>
            <FlexItem>Danger Zone</FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <Content className="app-text-muted app-mb-md" component="small">
            These actions are destructive and cannot be undone. Proceed with caution.
          </Content>
          <Flex flexWrap={{ default: 'wrap' }} spaceItems={{ default: 'spaceItemsMd' }}>
            {Object.entries(DANGER_ACTIONS).map(([key, { label }]) => (
              <FlexItem key={key}>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDangerModal(key);
                    setDangerConfirm('');
                  }}
                >
                  {label}
                </Button>
              </FlexItem>
            ))}
          </Flex>
        </CardBody>
      </Card>

      {activeDanger && (
        <Modal isOpen variant="small" onClose={() => setDangerModal(null)}>
          <ModalHeader title={activeDanger.label} />
          <ModalBody>
            <Alert
              isInline
              className="app-mb-md"
              title={activeDanger.description}
              variant="danger"
            />
            <Form>
              <FormGroup
                fieldId="danger-confirm"
                label={`Type "${activeDanger.confirmWord}" to confirm`}
              >
                <TextInput
                  id="danger-confirm"
                  placeholder={activeDanger.confirmWord}
                  value={dangerConfirm}
                  onChange={(_event, confirmValue) => setDangerConfirm(confirmValue)}
                />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={dangerConfirm !== activeDanger.confirmWord}
              variant="danger"
              onClick={handleConfirm}
            >
              {activeDanger.label}
            </Button>
            <Button variant="link" onClick={() => setDangerModal(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};
