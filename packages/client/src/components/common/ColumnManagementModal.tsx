import React, { useState } from 'react';

import {
  Button,
  Content,
  DataList,
  DataListCell,
  DataListCheck,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
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
  allColumns,
  isOpen,
  onClose,
  onReset,
  onSave,
  visibleIds,
}) => {
  const [checkedColumns, setCheckedColumns] = useState(new Set(visibleIds));

  React.useEffect(() => {
    if (isOpen) {
      setCheckedColumns(new Set(visibleIds));
    }
  }, [isOpen, visibleIds]);

  const onColumnChange = (id: string) => {
    setCheckedColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) {
          return prev;
        }
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
    setCheckedColumns(new Set(allColumns.map(col => col.id)));
  };

  return (
    <Modal isOpen={isOpen} position="top" variant={ModalVariant.small} onClose={onClose}>
      <ModalHeader title="Manage columns" />
      <ModalBody>
        <Content className="app-mb-md" component="p">
          Selected columns will appear in the table.
        </Content>
        <div className="app-mb-sm app-flex-gap-md">
          <Button isInline size="sm" variant="link" onClick={selectAll}>
            Select all
          </Button>
          <Button isInline size="sm" variant="link" onClick={handleReset}>
            Restore defaults
          </Button>
        </div>
        <DataList isCompact aria-label="Column list">
          {allColumns.map(col => {
            const inputId = `col-mgmt-${col.id}`;
            return (
              <DataListItem aria-labelledby={`col-label-${col.id}`} key={col.id}>
                <DataListItemRow>
                  <DataListCheck
                    aria-labelledby={`col-label-${col.id}`}
                    id={inputId}
                    isChecked={checkedColumns.has(col.id)}
                    isDisabled={checkedColumns.has(col.id) && checkedColumns.size <= 1}
                    name={col.title}
                    onChange={() => onColumnChange(col.id)}
                  />
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell id={`col-label-${col.id}`} key="name">
                        <label className="app-cursor-pointer" htmlFor={inputId}>
                          {col.title}
                        </label>
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
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
