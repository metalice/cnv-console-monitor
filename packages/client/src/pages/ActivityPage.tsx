import { useState } from 'react';

import { type ActivityEntry } from '@cnv-monitor/shared';

import {
  Button,
  Content,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Grid,
  GridItem,
  PageSection,
} from '@patternfly/react-core';
import { ExchangeAltIcon } from '@patternfly/react-icons';

import { ActivityDigestGrid } from '../components/activity/ActivityDigestGrid';
import { ActivityDrawerPanel } from '../components/activity/ActivityDrawer';
import { ActivityTable } from '../components/activity/ActivityTable';
import { ActivityToolbar } from '../components/activity/ActivityToolbar';
import { ComponentChart } from '../components/activity/ComponentChart';
import { ReviewCalendar } from '../components/activity/ReviewCalendar';
import { ReviewerStatsSection } from '../components/activity/ReviewerStatsSection';
import { useActivityPageData } from '../components/activity/useActivityPageData';

export const ActivityPage = () => {
  const [selectedEntry, setSelectedEntry] = useState<ActivityEntry | null>(null);
  const data = useActivityPageData();

  const drawerContent = (
    <>
      <PageSection>
        <Content component="h1">
          Activity Feed
          <Button
            className="app-ml-md"
            icon={<ExchangeAltIcon />}
            size="sm"
            variant={data.showComparison ? 'primary' : 'secondary'}
            onClick={() => data.setShowComparison(prev => !prev)}
          >
            Compare
          </Button>
        </Content>
        <Content component="small">
          {data.summary ? `${data.summary.total.toLocaleString()} actions` : 'Loading...'}
        </Content>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {data.ackStats && (
            <GridItem span={12}>
              <ReviewCalendar days={data.calendarDays} history={data.ackStats.history} />
            </GridItem>
          )}

          {data.summary && (
            <GridItem span={12}>
              <ActivityDigestGrid
                prevSummary={data.prevSummary}
                showComparison={data.showComparison}
                summary={data.summary}
              />
            </GridItem>
          )}

          {data.ackStats && data.sortedApprovers.length > 0 && (
            <ReviewerStatsSection
              getApproverSortParams={data.getApproverSortParams}
              sortedApprovers={data.sortedApprovers}
            />
          )}

          {data.summary && data.summary.byComponent.length > 0 && (
            <GridItem md={6} span={12}>
              <ComponentChart
                data={data.summary.byComponent}
                onComponentClick={comp =>
                  data.setLocalFilters(prev => ({ ...prev, component: comp }))
                }
              />
            </GridItem>
          )}

          <GridItem span={12}>
            <ActivityTable
              entries={data.activityData?.entries}
              isLoading={data.isLoading}
              page={data.page}
              pageSize={data.pageSize}
              pinnedEntries={data.pinnedEntries}
              selectedId={selectedEntry?.id}
              toolbar={
                <ActivityToolbar
                  currentUser={data.user.name}
                  entries={data.activityData?.entries}
                  filters={data.localFilters}
                  hasActiveFilters={data.hasActiveLocalFilters}
                  presets={data.presets}
                  users={data.meta?.users ?? []}
                  onClearAll={() => {
                    data.clearAll();
                    data.setPage(1);
                  }}
                  onFiltersChange={nextFilters => {
                    data.setLocalFilters(nextFilters);
                    data.setPage(1);
                  }}
                  onLoadPreset={data.handleLoadPreset}
                  onSavePreset={data.handleSavePreset}
                />
              }
              total={data.activityData?.total ?? 0}
              onPageChange={data.setPage}
              onRowClick={setSelectedEntry}
            />
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );

  return (
    <Drawer isExpanded={Boolean(selectedEntry)} onExpand={() => undefined}>
      <DrawerContent
        panelContent={
          selectedEntry ? (
            <ActivityDrawerPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
          ) : undefined
        }
      >
        <DrawerContentBody>{drawerContent}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
