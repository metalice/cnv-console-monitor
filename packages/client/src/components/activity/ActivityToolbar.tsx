import { type ActivityEntry, type ActivityFilterPreset } from '@cnv-monitor/shared';

import { Label, LabelGroup, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';

import { ActivityFilterSelects } from './ActivityFilterSelects';
import { ActivityToolbarActions } from './ActivityToolbarActions';
import { ACTION_OPTIONS, exportActivityCsv, type LocalFilters } from './activityToolbarHelpers';

type ActivityToolbarProps = {
  filters: LocalFilters;
  onFiltersChange: (filters: LocalFilters) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  users: string[];
  currentUser?: string;
  entries?: ActivityEntry[];
  presets?: ActivityFilterPreset[];
  onSavePreset?: (name: string) => void;
  onLoadPreset?: (preset: ActivityFilterPreset) => void;
};

export const ActivityToolbar = ({
  currentUser,
  entries,
  filters,
  hasActiveFilters,
  onClearAll,
  onFiltersChange,
  onLoadPreset,
  onSavePreset,
  presets,
  users,
}: ActivityToolbarProps) => {
  const selectedActions = filters.action ? filters.action.split(',') : [];
  const isMyActivity = Boolean(currentUser && filters.user === currentUser);

  const updateFilter = (key: keyof LocalFilters, value: string | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleAction = (action: string) => {
    const current = new Set(selectedActions);
    if (current.has(action)) {
      current.delete(action);
    } else {
      current.add(action);
    }
    updateFilter('action', current.size > 0 ? [...current].join(',') : undefined);
  };

  return (
    <Toolbar clearAllFilters={onClearAll}>
      <ToolbarContent>
        <ActivityFilterSelects
          filters={filters}
          selectedActions={selectedActions}
          users={users}
          onToggleAction={toggleAction}
          onUpdateFilter={updateFilter}
        />

        <ActivityToolbarActions
          currentUser={currentUser}
          hasActiveFilters={hasActiveFilters}
          hasEntries={Boolean(entries?.length)}
          isMyActivity={isMyActivity}
          presets={presets}
          onClearAll={onClearAll}
          onExport={() => entries && exportActivityCsv(entries)}
          onLoadPreset={onLoadPreset}
          onSavePreset={onSavePreset}
          onToggleMyActivity={() => updateFilter('user', isMyActivity ? undefined : currentUser)}
        />

        {hasActiveFilters && (
          <ToolbarItem>
            <LabelGroup numLabels={5}>
              {selectedActions.map(actionValue => (
                <Label key={actionValue} onClose={() => toggleAction(actionValue)}>
                  {ACTION_OPTIONS.find(opt => opt.value === actionValue)?.label ?? actionValue}
                </Label>
              ))}
              {filters.user && (
                <Label onClose={() => updateFilter('user', undefined)}>{filters.user}</Label>
              )}
              {filters.search && (
                <Label onClose={() => updateFilter('search', undefined)}>
                  &quot;{filters.search}&quot;
                </Label>
              )}
            </LabelGroup>
          </ToolbarItem>
        )}
      </ToolbarContent>
    </Toolbar>
  );
};
