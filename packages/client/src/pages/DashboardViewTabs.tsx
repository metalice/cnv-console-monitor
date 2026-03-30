import React from 'react';

import type { LaunchGroup, PublicConfig } from '@cnv-monitor/shared';

import { Skeleton, Tab, Tabs, TabTitleText } from '@patternfly/react-core';

import { LaunchTable } from '../components/dashboard/LaunchTable';

import { type DashboardView } from './dashboardHelpers';

const LaunchStatusMatrix = React.lazy(() =>
  import('../components/dashboard/LaunchStatusMatrix').then(mod => ({
    default: mod.LaunchStatusMatrix,
  })),
);

type VersionOption = { label: string; value: string };

type DashboardViewTabsProps = {
  viewMode: DashboardView;
  onViewChange: (_event: unknown, key: string | number) => void;
  config: PublicConfig | undefined;
  groups: LaunchGroup[];
  availableComponents: string[];
  availableTiers: string[];
  selectedTiers: Set<string>;
  tableSearch: string;
  versionFilter: string;
  versionOptions: VersionOption[];
  onSearchChange: (value: string) => void;
  onTiersChange: (value: Set<string>) => void;
  onVersionChange: (value: string) => void;
};

export const DashboardViewTabs = ({
  availableComponents,
  availableTiers,
  config,
  groups,
  onSearchChange,
  onTiersChange,
  onVersionChange,
  onViewChange,
  selectedTiers,
  tableSearch,
  versionFilter,
  versionOptions,
  viewMode,
}: DashboardViewTabsProps) => (
  <>
    <Tabs activeKey={viewMode} className="app-mb-md" onSelect={onViewChange}>
      <Tab eventKey="table" title={<TabTitleText>Table</TabTitleText>} />
      <Tab eventKey="matrix" title={<TabTitleText>Matrix</TabTitleText>} />
    </Tabs>
    {viewMode === 'table' && (
      <LaunchTable
        availableComponents={availableComponents}
        availableTiers={availableTiers}
        config={config}
        groups={groups}
        selectedTiers={selectedTiers}
        tableSearch={tableSearch}
        versionFilter={versionFilter}
        versionOptions={versionOptions}
        onSearchChange={onSearchChange}
        onTiersChange={onTiersChange}
        onVersionChange={onVersionChange}
      />
    )}
    {viewMode === 'matrix' && (
      <React.Suspense fallback={<Skeleton height="200px" screenreaderText="Loading matrix" />}>
        <LaunchStatusMatrix groups={groups} />
      </React.Suspense>
    )}
  </>
);
