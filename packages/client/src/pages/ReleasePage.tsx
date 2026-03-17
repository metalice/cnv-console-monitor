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
import { fetchReleases, fetchChecklist } from '../api/releases';
import { useComponentFilter } from '../context/ComponentFilterContext';
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

  const { selectedComponent: checklistComponent } = useComponentFilter();
  const [checklistStatus, setChecklistStatus] = useState<'open' | 'all'>('open');

  const { data: checklist, isLoading: clLoading, isFetching: clFetching, error: clError } = useQuery({
    queryKey: ['checklist', checklistComponent, checklistStatus],
    queryFn: () => fetchChecklist(checklistComponent, checklistStatus),
    staleTime: 60 * 1000,
    retry: 1,
    placeholderData: undefined,
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
          isLoading={clLoading || clFetching}
          error={clError as Error | null}
          checklistStatus={checklistStatus}
          onStatusChange={setChecklistStatus}
          releases={releases}
        />
      </PageSection>
    </>
  );
};
