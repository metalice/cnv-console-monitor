import {
  Content,
  Grid,
  GridItem,
  PageSection,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';

import { DeadlineBanner } from '../components/releases/DeadlineBanner';
import { ReleaseCalendar } from '../components/releases/ReleaseCalendar';
import { ReleaseChecklist } from '../components/releases/ReleaseChecklist';
import { ReleaseGantt } from '../components/releases/ReleaseGantt';
import { ReleaseTimeline } from '../components/releases/ReleaseTimeline';
import { VelocityChart } from '../components/releases/VelocityChart';
import { VersionDashboard } from '../components/releases/VersionDashboard';

import { useReleasePage } from './useReleasePage';

export const ReleasePage = () => {
  const page = useReleasePage();

  return (
    <>
      <PageSection>
        <Content component="h1">Release Management</Content>
        <Content component="small">
          CNV version lifecycle, release schedule, and checklist tracking
        </Content>
      </PageSection>

      {page.releases && page.releases.length > 0 && (
        <PageSection style={{ paddingTop: 0 }}>
          <DeadlineBanner releases={page.releases} />
        </PageSection>
      )}

      <PageSection>
        <Grid hasGutter>
          <GridItem span={12}>
            <Tabs
              activeKey={page.viewMode}
              onSelect={(_e, key) => page.setViewMode(key as 'gantt' | 'calendar' | 'table')}
            >
              <Tab eventKey="gantt" title={<TabTitleText>Timeline</TabTitleText>} />
              <Tab eventKey="calendar" title={<TabTitleText>Calendar</TabTitleText>} />
              <Tab eventKey="table" title={<TabTitleText>Table</TabTitleText>} />
            </Tabs>
          </GridItem>

          <GridItem span={12}>
            {page.viewMode === 'gantt' && (
              <ReleaseGantt
                isLoading={page.relLoading}
                releases={page.releases}
                selectedVersion={page.selectedVersion}
                onSelectVersion={page.toggleVersion}
              />
            )}
            {page.viewMode === 'calendar' && page.releases && (
              <ReleaseCalendar releases={page.releases} onSelectVersion={page.toggleVersion} />
            )}
            {page.viewMode === 'table' && (
              <ReleaseTimeline
                isLoading={page.relLoading}
                releases={page.releases}
                selectedVersion={page.selectedVersion}
                onSelectVersion={page.toggleVersion}
              />
            )}
          </GridItem>

          {page.selectedRelease && (
            <GridItem span={12}>
              <VersionDashboard
                checklist={page.checklist}
                release={page.selectedRelease}
                onClose={() => page.setSelectedVersionRaw(null)}
              />
            </GridItem>
          )}

          <GridItem span={12}>
            <ReleaseChecklist
              activeVersion={page.selectedVersion}
              checklist={page.checklist}
              checklistStatus={page.checklistStatus}
              error={page.clError}
              isLoading={page.clLoading || page.clFetching}
              releases={page.releases}
              onStatusChange={page.setChecklistStatus}
            />
          </GridItem>

          <GridItem span={12}>
            <VelocityChart />
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
