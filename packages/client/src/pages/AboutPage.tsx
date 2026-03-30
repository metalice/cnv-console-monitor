import { useEffect, useState } from 'react';

import { type PublicConfig } from '@cnv-monitor/shared';

import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { type AIStatus, fetchAIStatus } from '../api/ai';
import { apiFetch } from '../api/client';
import { fetchPollStatus, type PollStatusResponse } from '../api/poll';
import { FeaturesTab } from '../components/about/FeaturesTab';
import { HeroSection } from '../components/about/HeroSection';
import { OverviewTab } from '../components/about/OverviewTab';
import { QuickStartTab } from '../components/about/QuickStartTab';
import { TipsTab } from '../components/about/TipsTab';

const FIVE_MINUTES_MS = 5 * 60_000;

export const AboutPage = () => {
  const [activeTab, setActiveTab] = useState<string | number>('overview');

  useEffect(() => {
    document.title = 'About | CNV Console Monitor';
  }, []);

  const { data: config } = useQuery({
    queryFn: () => apiFetch<PublicConfig>('/config'),
    queryKey: ['config'],
    staleTime: Infinity,
  });
  const { data: pollStatus } = useQuery<PollStatusResponse>({
    queryFn: fetchPollStatus,
    queryKey: ['pollStatus'],
    staleTime: 30_000,
  });
  const { data: aiStatus } = useQuery<AIStatus>({
    queryFn: fetchAIStatus,
    queryKey: ['aiStatus'],
    staleTime: 60_000,
  });
  const { data: stats } = useQuery({
    queryFn: () =>
      apiFetch<{ launches: number; testItems: number; days: number }>('/launches/stats'),
    queryKey: ['aboutStats'],
    staleTime: FIVE_MINUTES_MS,
  });

  return (
    <>
      <HeroSection pollStatus={pollStatus} stats={stats} />

      <PageSection>
        <Tabs isFilled activeKey={activeTab} onSelect={(_e, k) => setActiveTab(k)}>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <OverviewTab aiStatus={aiStatus} config={config} pollStatus={pollStatus} />
          </Tab>

          <Tab eventKey="features" title={<TabTitleText>Features</TabTitleText>}>
            <FeaturesTab />
          </Tab>

          <Tab eventKey="quickstart" title={<TabTitleText>Quick Start</TabTitleText>}>
            <QuickStartTab />
          </Tab>

          <Tab eventKey="tips" title={<TabTitleText>Tips & Shortcuts</TabTitleText>}>
            <TipsTab />
          </Tab>
        </Tabs>
      </PageSection>
    </>
  );
};
