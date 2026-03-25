import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { PublicConfig } from '@cnv-monitor/shared';

import { Breadcrumb, BreadcrumbItem, Content, PageSection, Spinner } from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { fetchTestProfile, type TestProfile } from '../api/testProfile';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { JiraLinkModal } from '../components/modals/JiraLinkModal';
import { TriageModal } from '../components/modals/TriageModal';
import { TestProfileDetails } from '../components/testprofile/TestProfileDetails';

export const TestProfilePage: React.FC = () => {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const navigate = useNavigate();
  const [triageItem, setTriageItem] = useState<number[] | null>(null);
  const [jiraCreateName, setJiraCreateName] = useState<{
    rpId: number;
    name: string;
    polarionId?: string;
  } | null>(null);
  const [jiraLinkItem, setJiraLinkItem] = useState<number | null>(null);

  const { data: config } = useQuery({
    queryFn: () => apiFetch<PublicConfig>('/config'),
    queryKey: ['config'],
    staleTime: Infinity,
  });

  const { data: profile, isLoading } = useQuery<TestProfile>({
    enabled: Boolean(uniqueId),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => fetchTestProfile(uniqueId!),
    queryKey: ['testProfile', uniqueId],
  });

  useEffect(() => {
    if (profile) {
      document.title = `${profile.identity.name.split('.').pop() || profile.identity.name} | CNV Console Monitor`;
    } else {
      document.title = 'Test Profile | CNV Console Monitor';
    }
  }, [profile]);

  const shortName = useMemo(() => {
    if (!profile) {
      return '';
    }
    return profile.identity.name.split('.').pop() || profile.identity.name;
  }, [profile]);

  const latestFailedRpId = useMemo(() => {
    if (!profile?.history.length) {
      return null;
    }
    const failed = profile.history.find(historyEntry => historyEntry.status === 'FAILED');
    return failed?.rp_id ?? null;
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <div className="app-page-spinner">
        <Spinner aria-label="Loading test profile" />
      </div>
    );
  }

  return (
    <>
      <PageSection>
        <Breadcrumb className="app-breadcrumb">
          <BreadcrumbItem className="app-cursor-pointer" onClick={() => navigate('/failures')}>
            Failures
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{shortName}</BreadcrumbItem>
        </Breadcrumb>
        <Content component="h1">{shortName}</Content>
        <Content className="app-text-muted app-word-break-all" component="small">
          {profile.identity.name}
        </Content>
      </PageSection>

      <PageSection>
        <TestProfileDetails
          config={config}
          latestFailedRpId={latestFailedRpId}
          profile={profile}
          onClassify={setTriageItem}
          onCreateBug={setJiraCreateName}
          onLinkJira={setJiraLinkItem}
        />
      </PageSection>

      {triageItem && (
        <TriageModal isOpen itemIds={triageItem} onClose={() => setTriageItem(null)} />
      )}
      {jiraCreateName && (
        <JiraCreateModal
          isOpen
          polarionId={jiraCreateName.polarionId}
          testItemId={jiraCreateName.rpId}
          testName={jiraCreateName.name}
          onClose={() => setJiraCreateName(null)}
        />
      )}
      {jiraLinkItem && (
        <JiraLinkModal isOpen testItemId={jiraLinkItem} onClose={() => setJiraLinkItem(null)} />
      )}
    </>
  );
};
