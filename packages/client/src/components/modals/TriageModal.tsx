import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  TextArea,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { fetchDefectTypes } from '../../api/defectTypes';
import { classifyDefect, bulkClassifyDefect } from '../../api/triage';
import { SearchableSelect } from '../common/SearchableSelect';

type TriageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  itemIds: number[];
};

export const TriageModal: React.FC<TriageModalProps> = ({ isOpen, onClose, itemIds }) => {
  const queryClient = useQueryClient();
  const [defectType, setDefectType] = useState('');
  const [comment, setComment] = useState('');

  const { data: defectTypes } = useQuery({
    queryKey: ['defectTypes'],
    queryFn: fetchDefectTypes,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (itemIds.length === 1) {
        return classifyDefect(itemIds[0], { defectType, comment });
      }
      return bulkClassifyDefect({ itemIds, defectType, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['untriaged'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['testItems'] });
      queryClient.invalidateQueries({ queryKey: ['testProfile'] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['flakyTests'] });
      onClose();
      setDefectType('');
      setComment('');
    },
  });

  const options: Array<{ value: string; label: string }> = [];
  if (defectTypes) {
    for (const [category, types] of Object.entries(defectTypes)) {
      for (const dt of types) {
        if (!category.startsWith('TO_INVESTIGATE') || dt.locator === 'ti001') {
          options.push({ value: dt.locator, label: `${dt.longName} (${dt.shortName})` });
        }
      }
    }
  }

  const isBulk = itemIds.length > 1;

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalHeader title={isBulk ? `Classify ${itemIds.length} Items` : 'Classify Defect'} />
      <ModalBody>
        <Form>
          <FormGroup label="Defect Type" isRequired>
            <SearchableSelect
              id="defect-type"
              value={defectType}
              options={options}
              onChange={setDefectType}
              placeholder="Select a defect type..."
              noResultsText="No defect types"
            />
          </FormGroup>
          <FormGroup label="Comment">
            <TextArea value={comment} onChange={(_e, val) => setComment(val)} placeholder="Reason for classification..." />
          </FormGroup>
          {mutation.isError && (
            <HelperText>
              <HelperTextItem variant="error">{(mutation.error as Error).message}</HelperTextItem>
            </HelperText>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!defectType} isLoading={mutation.isPending}>
          Classify
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
