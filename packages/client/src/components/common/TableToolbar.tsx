import React, { useState } from 'react';

import {
  Button,
  Content,
  InputGroup,
  InputGroupItem,
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { ColumnsIcon, SearchIcon, TimesIcon } from '@patternfly/react-icons';

import type { ColumnDef } from '../../hooks/useColumnManagement';

import { ColumnManagementModal } from './ColumnManagementModal';

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
  children,
  columns,
  onResetColumns,
  onSaveColumns,
  onSearchChange,
  resultCount,
  searchPlaceholder = 'Search...',
  searchValue,
  totalCount,
  visibleIds,
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
                    aria-label="Search table"
                    customIcon={<SearchIcon />}
                    placeholder={searchPlaceholder}
                    type="search"
                    value={searchValue}
                    onChange={(_e, v) => onSearchChange(v)}
                  />
                </InputGroupItem>
                {searchValue && (
                  <InputGroupItem>
                    <Button
                      aria-label="Clear search"
                      icon={<TimesIcon />}
                      variant="plain"
                      onClick={() => onSearchChange('')}
                    />
                  </InputGroupItem>
                )}
              </InputGroup>
            </ToolbarItem>
          </ToolbarGroup>

          {children && <ToolbarGroup>{children}</ToolbarGroup>}

          <ToolbarGroup align={{ default: 'alignEnd' }}>
            {searchValue && (
              <ToolbarItem>
                <Content className="app-text-muted" component="small">
                  {resultCount === totalCount
                    ? `${totalCount} items`
                    : `${resultCount} of ${totalCount}`}
                </Content>
              </ToolbarItem>
            )}
            {hasColumnManagement && (
              <ToolbarItem>
                <Button
                  aria-label="Manage columns"
                  icon={<ColumnsIcon />}
                  variant="plain"
                  onClick={() => setColModalOpen(true)}
                />
              </ToolbarItem>
            )}
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>

      {hasColumnManagement && (
        <ColumnManagementModal
          allColumns={columns}
          isOpen={colModalOpen}
          visibleIds={visibleIds}
          onClose={() => setColModalOpen(false)}
          onReset={onResetColumns}
          onSave={onSaveColumns}
        />
      )}
    </>
  );
};
