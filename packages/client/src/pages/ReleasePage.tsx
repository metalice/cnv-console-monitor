import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { apiFetch } from '../api/client';
import { fetchReleases, fetchChecklist } from '../api/releases';
import { usePreferences } from '../context/PreferencesContext';
import { ReleaseTimeline } from '../components/releases/ReleaseTimeline';
import { ReleaseChecklist } from '../components/releases/ReleaseChecklist';
import type { ReleaseInfo } from '@cnv-monitor/shared';

export const ReleasePage: React.FC = () => {
  useEffect(() => { document.title = 'Releases | CNV Console Monitor'; }, []);

  const { data: releases, isLoading: relLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: fetchReleases,
    staleTime: 5 * 60 * 1000,
  });

  const { data: jiraComponents } = useQuery({
    queryKey: ['jiraComponents'],
    queryFn: async () => {
      const meta = await apiFetch<{ components: string[] }>('/settings/jira-meta');
      return meta.components || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (prefsLoaded && preferences.dashboardComponents?.length) {
      setSelectedComponentsState(new Set(preferences.dashboardComponents));
    }
  }, [prefsLoaded, preferences.dashboardComponents]);

  const setSelectedComponents = (value: Set<string>) => {
    setSelectedComponentsState(value);
    setPreference('dashboardComponents', [...value]);
  };

  const checklistComponent = selectedComponents.size === 1 ? [...selectedComponents][0] : undefined;
  const [checklistStatus, setChecklistStatus] = useState<'open' | 'all'>('open');

  const { data: checklist, isLoading: clLoading, error: clError } = useQuery({
    queryKey: ['checklist', checklistComponent, checklistStatus],
    queryFn: () => fetchChecklist(checklistComponent, checklistStatus),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const upcomingReleases = useMemo(() => {
    if (!releases) return [];
    return releases
      .filter((release: ReleaseInfo) => release.daysUntilNext !== null && release.daysUntilNext <= 14)
      .sort((releaseA: ReleaseInfo, releaseB: ReleaseInfo) => (releaseA.daysUntilNext ?? Infinity) - (releaseB.daysUntilNext ?? Infinity));
  }, [releases]);

  return (
    <>
      <PageSection>
        <Content component="h1">Release Schedule</Content>
        <Content component="small">CNV version lifecycle, z-stream schedule, and release checklist tasks</Content>
      </PageSection>

      {upcomingReleases.length > 0 && (
        <PageSection>
          <Card>
            <CardTitle>Upcoming Releases (next 14 days)</CardTitle>
            <CardBody>
              <Flex spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }}>
                {upcomingReleases.map(release => (
                  <FlexItem key={release.shortname}>
                    <Label color={release.daysUntilNext! <= 3 ? 'red' : release.daysUntilNext! <= 7 ? 'orange' : 'yellow'}>
                      {release.shortname} &mdash; {release.nextRelease?.name} &mdash; {release.nextRelease?.date} ({release.daysUntilNext}d)
                    </Label>
                  </FlexItem>
                ))}
              </Flex>
            </CardBody>
          </Card>
        </PageSection>
      )}

      <PageSection><ReleaseTimeline releases={releases} isLoading={relLoading} /></PageSection>

      <PageSection>
        <ReleaseChecklist
          checklist={checklist}
          isLoading={clLoading}
          error={clError as Error | null}
          checklistStatus={checklistStatus}
          onStatusChange={setChecklistStatus}
          selectedComponents={selectedComponents}
          jiraComponents={jiraComponents ?? []}
          onComponentsChange={setSelectedComponents}
        />
      </PageSection>
    </>
  );
};
