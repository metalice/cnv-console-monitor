import React, { useState } from 'react';
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  InputGroup,
  InputGroupItem,
  TextInput,
  Button,
  Content,
} from '@patternfly/react-core';
import { SearchIcon, TimesIcon, ColumnsIcon } from '@patternfly/react-icons';
import { ColumnManagementModal } from './ColumnManagementModal';
import type { ColumnDef } from '../../hooks/useColumnManagement';

type TableToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  resultCount: number;
  totalCount: number;
  columns?: ColumnDef[];
  visibleIds?: string[];
  onSaveColumns?: (ids: string[]) => void;
  onResetColumns?: () => void;
  children?: React.ReactNode;
};

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  resultCount,
  totalCount,
  columns,
  visibleIds,
  onSaveColumns,
  onResetColumns,
  children,
}) => {
  const [colModalOpen, setColModalOpen] = useState(false);
  const hasColumnManagement = columns && visibleIds && onSaveColumns && onResetColumns;

  return (
    <>
      <Toolbar className="app-table-toolbar" clearAllFilters={() => onSearchChange('')}>
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <InputGroup>
                <InputGroupItem>
                  <TextInput
                    type="search"
                    aria-label="Search table"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(_e, v) => onSearchChange(v)}
                    customIcon={<SearchIcon />}
                  />
                </InputGroupItem>
                {searchValue && (
                  <InputGroupItem>
                    <Button variant="plain" aria-label="Clear search" onClick={() => onSearchChange('')} icon={<TimesIcon />} />
                  </InputGroupItem>
                )}
              </InputGroup>
            </ToolbarItem>
          </ToolbarGroup>

          {children && <ToolbarGroup>{children}</ToolbarGroup>}

          <ToolbarGroup align={{ default: 'alignEnd' }}>
            {searchValue && (
              <ToolbarItem>
                <Content component="small" className="app-text-muted">
                  {resultCount === totalCount ? `${totalCount} items` : `${resultCount} of ${totalCount}`}
                </Content>
              </ToolbarItem>
            )}
            {hasColumnManagement && (
              <ToolbarItem>
                <Button variant="plain" aria-label="Manage columns" onClick={() => setColModalOpen(true)} icon={<ColumnsIcon />} />
              </ToolbarItem>
            )}
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>

      {hasColumnManagement && (
        <ColumnManagementModal
          isOpen={colModalOpen}
          onClose={() => setColModalOpen(false)}
          allColumns={columns}
          visibleIds={visibleIds}
          onSave={onSaveColumns}
          onReset={onResetColumns}
        />
      )}
    </>
  );
};
