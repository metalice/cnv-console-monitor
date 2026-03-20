import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection, Content, Grid, GridItem,
  Tabs, Tab, TabTitleText,
} from '@patternfly/react-core';
import { fetchReleases, fetchChecklist } from '../api/releases';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { ReleaseGantt } from '../components/releases/ReleaseGantt';
import { DeadlineBanner } from '../components/releases/DeadlineBanner';
import { VersionDashboard } from '../components/releases/VersionDashboard';
import { ReleaseChecklist } from '../components/releases/ReleaseChecklist';
import { ReleaseTimeline } from '../components/releases/ReleaseTimeline';
import { ReleaseCalendar } from '../components/releases/ReleaseCalendar';
import { VelocityChart } from '../components/releases/VelocityChart';
import type { ReleaseInfo } from '@cnv-monitor/shared';

type ViewMode = 'gantt' | 'calendar' | 'table';

export const ReleasePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const v = searchParams.get('view');
    return (v === 'gantt' || v === 'calendar' || v === 'table') ? v : 'gantt';
  });
  const [selectedVersion, setSelectedVersionRaw] = useState<string | null>(() => searchParams.get('version'));

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (viewMode !== 'gantt') params.set('view', viewMode); else params.delete('view');
    if (selectedVersion) params.set('version', selectedVersion); else params.delete('version');
    setSearchParams(params, { replace: true });
  }, [viewMode, selectedVersion, searchParams, setSearchParams]);

  const toggleVersion = (shortname: string) => setSelectedVersionRaw(prev => prev === shortname ? null : shortname);

  useEffect(() => { document.title = 'Releases | CNV Console Monitor'; }, []);

  const { data: releases, isLoading: relLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: fetchReleases,
    staleTime: 5 * 60 * 1000,
  });

  const { selectedComponent: checklistComponent } = useComponentFilter();
  const [checklistStatus, setChecklistStatus] = useState<'open' | 'all'>('open');

  const checklistVersion = useMemo(() => {
    if (!selectedVersion) return undefined;
    return selectedVersion.replace('cnv-', '');
  }, [selectedVersion]);

  const { data: checklist, isLoading: clLoading, isFetching: clFetching, error: clError } = useQuery({
    queryKey: ['checklist', checklistComponent, checklistStatus, checklistVersion],
    queryFn: () => fetchChecklist(checklistComponent, checklistStatus, checklistVersion),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const selectedRelease = useMemo(() => {
    if (!selectedVersion || !releases) return null;
    return releases.find(r => r.shortname === selectedVersion) ?? null;
  }, [selectedVersion, releases]);

  return (
    <>
      <PageSection>
        <Content component="h1">Release Management</Content>
        <Content component="small">CNV version lifecycle, release schedule, and checklist tracking</Content>
      </PageSection>

      {releases && releases.length > 0 && (
        <PageSection style={{ paddingTop: 0 }}>
          <DeadlineBanner releases={releases} />
        </PageSection>
      )}

      <PageSection>
        <Grid hasGutter>
          <GridItem span={12}>
            <Tabs activeKey={viewMode} onSelect={(_e, key) => setViewMode(key as ViewMode)}>
              <Tab eventKey="gantt" title={<TabTitleText>Timeline</TabTitleText>} />
              <Tab eventKey="calendar" title={<TabTitleText>Calendar</TabTitleText>} />
              <Tab eventKey="table" title={<TabTitleText>Table</TabTitleText>} />
            </Tabs>
          </GridItem>

          <GridItem span={12}>
            {viewMode === 'gantt' && (
              <ReleaseGantt
                releases={releases}
                isLoading={relLoading}
                selectedVersion={selectedVersion}
                onSelectVersion={toggleVersion}
              />
            )}
            {viewMode === 'calendar' && releases && (
              <ReleaseCalendar releases={releases} onSelectVersion={toggleVersion} />
            )}
            {viewMode === 'table' && (
              <ReleaseTimeline
                releases={releases}
                isLoading={relLoading}
                selectedVersion={selectedVersion}
                onSelectVersion={toggleVersion}
              />
            )}
          </GridItem>

          {selectedRelease && (
            <GridItem span={12}>
              <VersionDashboard release={selectedRelease} checklist={checklist} onClose={() => setSelectedVersionRaw(null)} />
            </GridItem>
          )}

          <GridItem span={12}>
            <ReleaseChecklist
              checklist={checklist}
              isLoading={clLoading || clFetching}
              error={clError as Error | null}
              checklistStatus={checklistStatus}
              onStatusChange={setChecklistStatus}
              releases={releases}
              activeVersion={selectedVersion}
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
