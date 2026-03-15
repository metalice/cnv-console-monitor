import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Breadcrumb,
  BreadcrumbItem,
  Spinner,
} from '@patternfly/react-core';
import type { PublicConfig } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';
import { fetchTestProfile, type TestProfile } from '../api/testProfile';
import { TestProfileDetails } from '../components/testprofile/TestProfileDetails';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { JiraLinkModal } from '../components/modals/JiraLinkModal';

export const TestProfilePage: React.FC = () => {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const navigate = useNavigate();
  const [triageItem, setTriageItem] = useState<number[] | null>(null);
  const [jiraCreateName, setJiraCreateName] = useState<{ rpId: number; name: string; polarionId?: string } | null>(null);
  const [jiraLinkItem, setJiraLinkItem] = useState<number | null>(null);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  const { data: profile, isLoading } = useQuery<TestProfile>({
    queryKey: ['testProfile', uniqueId],
    queryFn: () => fetchTestProfile(uniqueId!),
    enabled: !!uniqueId,
  });

  useEffect(() => {
    if (profile) document.title = `${profile.identity.name.split('.').pop() || profile.identity.name} | CNV Console Monitor`;
    else document.title = 'Test Profile | CNV Console Monitor';
  }, [profile]);

  const shortName = useMemo(() => {
    if (!profile) return '';
    return profile.identity.name.split('.').pop() || profile.identity.name;
  }, [profile]);

  const latestFailedRpId = useMemo(() => {
    if (!profile?.history.length) return null;
    const failed = profile.history.find(h => h.status === 'FAILED');
    return failed?.rp_id ?? null;
  }, [profile]);

  if (isLoading || !profile) {
    return <PageSection isFilled><div className="app-page-spinner"><Spinner aria-label="Loading test profile" /></div></PageSection>;
  }

  return (
    <>
      <PageSection>
        <Breadcrumb className="app-breadcrumb">
          <BreadcrumbItem onClick={() => navigate('/failures')} className="app-cursor-pointer">Failures</BreadcrumbItem>
          <BreadcrumbItem isActive>{shortName}</BreadcrumbItem>
        </Breadcrumb>
        <Content component="h1">{shortName}</Content>
        <Content component="small" className="app-text-muted app-word-break-all">{profile.identity.name}</Content>
      </PageSection>

      <PageSection>
        <TestProfileDetails
          profile={profile}
          config={config}
          latestFailedRpId={latestFailedRpId}
          onClassify={setTriageItem}
          onCreateBug={setJiraCreateName}
          onLinkJira={setJiraLinkItem}
        />
      </PageSection>

      {triageItem && <TriageModal isOpen onClose={() => setTriageItem(null)} itemIds={triageItem} />}
      {jiraCreateName && (
        <JiraCreateModal isOpen onClose={() => setJiraCreateName(null)} testItemId={jiraCreateName.rpId} testName={jiraCreateName.name} polarionId={jiraCreateName.polarionId} />
      )}
      {jiraLinkItem && <JiraLinkModal isOpen onClose={() => setJiraLinkItem(null)} testItemId={jiraLinkItem} />}
    </>
  );
};
