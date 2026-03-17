import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Grid,
  GridItem,
  Spinner,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import type { PublicConfig } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';
import { fetchMyWork } from '../api/myWork';
import { useAuth } from '../context/AuthContext';
import { MyRecentActivityCard } from '../components/mywork/MyRecentActivityCard';
import { MyJiraBugsCard } from '../components/mywork/MyJiraBugsCard';

export const MyWorkPage: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => { document.title = 'My Work | CNV Console Monitor'; }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['myWork'],
    queryFn: fetchMyWork,
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  if (isLoading) {
    return <div className="app-page-spinner"><Spinner aria-label="Loading my work" /></div>;
  }

  if (!data) {
    return (
      <PageSection>
        <EmptyState headingLevel="h4" titleText="Unable to load data">
          <EmptyStateBody>Could not fetch your personalized work data.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Content component="h1">My Work</Content>
        <Content component="small">Personalized view for {user.name}</Content>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          <GridItem span={6}>
            <MyRecentActivityCard activities={data.myRecentActivity} />
          </GridItem>
          <GridItem span={6}>
            <MyJiraBugsCard bugs={data.myJiraBugs} jiraUrl={config?.jiraUrl} />
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
