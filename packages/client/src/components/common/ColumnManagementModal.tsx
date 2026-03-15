import React, { useState } from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListCheck,
  DataListItemCells,
  DataListCell,
  Content,
} from '@patternfly/react-core';
import type { ColumnDef } from '../../hooks/useColumnManagement';

type ColumnManagementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  allColumns: ColumnDef[];
  visibleIds: string[];
  onSave: (ids: string[]) => void;
  onReset: () => void;
};

export const ColumnManagementModal: React.FC<ColumnManagementModalProps> = ({
  isOpen,
  onClose,
  allColumns,
  visibleIds,
  onSave,
  onReset,
}) => {
  const [checkedColumns, setCheckedColumns] = useState<Set<string>>(new Set(visibleIds));

  React.useEffect(() => {
    if (isOpen) setCheckedColumns(new Set(visibleIds));
  }, [isOpen, visibleIds]);

  const onColumnChange = (id: string) => {
    setCheckedColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave([...checkedColumns]);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const selectAll = () => {
    setCheckedColumns(new Set(allColumns.map(c => c.id)));
  };

  return (
    <Modal variant={ModalVariant.small} isOpen={isOpen} onClose={onClose} position="top">
      <ModalHeader title="Manage columns" />
      <ModalBody>
        <Content component="p" className="app-mb-md">Selected columns will appear in the table.</Content>
        <div className="app-mb-sm app-flex-gap-md">
          <Button variant="link" size="sm" isInline onClick={selectAll}>Select all</Button>
          <Button variant="link" size="sm" isInline onClick={handleReset}>Restore defaults</Button>
        </div>
        <DataList aria-label="Column list" isCompact>
          {allColumns.map(col => {
            const inputId = `col-mgmt-${col.id}`;
            return (
              <DataListItem key={col.id} aria-labelledby={`col-label-${col.id}`}>
                <DataListItemRow>
                  <DataListCheck
                    aria-labelledby={`col-label-${col.id}`}
                    id={inputId}
                    isChecked={checkedColumns.has(col.id)}
                    name={col.title}
                    onChange={() => onColumnChange(col.id)}
                    isDisabled={checkedColumns.has(col.id) && checkedColumns.size <= 1}
                  />
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="name" id={`col-label-${col.id}`}>
                        <label htmlFor={inputId} className="app-cursor-pointer">{col.title}</label>
                      </DataListCell>,
                    ]}
                  />
                </DataListItemRow>
              </DataListItem>
            );
          })}
        </DataList>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleSave}>Save</Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
