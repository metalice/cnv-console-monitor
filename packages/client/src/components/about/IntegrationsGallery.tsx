import { type PublicConfig } from '@cnv-monitor/shared';

import { Gallery, GalleryItem } from '@patternfly/react-core';
import {
  BellIcon,
  BugIcon,
  CalendarAltIcon,
  EnvelopeIcon,
  RobotIcon,
  ServerIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';

import { type AIStatus } from '../../api/ai';
import { type PollStatusResponse } from '../../api/poll';

import { IntegrationCard } from './IntegrationCard';

type IntegrationsGalleryProps = {
  config: PublicConfig | undefined;
  pollStatus: PollStatusResponse | undefined;
  aiStatus: AIStatus | undefined;
};

export const IntegrationsGallery = ({ aiStatus, config, pollStatus }: IntegrationsGalleryProps) => (
  <Gallery hasGutter minWidths={{ default: '250px' }}>
    <GalleryItem>
      <IntegrationCard
        connected={Boolean(config?.reportportalUrl)}
        description="Test execution data source. Launches, test items, defect types, and logs."
        icon={<ServerIcon />}
        name="ReportPortal"
        settingsPath="/settings?tab=reportportal"
      />
    </GalleryItem>
    <GalleryItem>
      <IntegrationCard
        connected={pollStatus != null && pollStatus.enrichment.success > 0}
        description="Build enrichment. Maps launches to teams, components, and tiers."
        icon={<SyncAltIcon />}
        name="Jenkins"
        settingsPath="/settings?tab=jenkins"
      />
    </GalleryItem>
    <GalleryItem>
      <IntegrationCard
        connected={Boolean(config?.jiraEnabled)}
        description="Bug tracking. Create and link issues directly from test failures."
        icon={<BugIcon />}
        name="Jira"
        settingsPath="/settings?tab=jira"
      />
    </GalleryItem>
    <GalleryItem>
      <IntegrationCard
        connected={Boolean(config?.slackEnabled)}
        description="Team notifications. Daily digests, reminders, and pipeline alerts."
        icon={<BellIcon />}
        name="Slack"
        settingsPath="/settings?tab=notifications"
      />
    </GalleryItem>
    <GalleryItem>
      <IntegrationCard
        connected={Boolean(config?.emailEnabled)}
        description="Email digests. HTML reports sent on schedule."
        icon={<EnvelopeIcon />}
        name="Email"
        settingsPath="/settings?tab=email"
      />
    </GalleryItem>
    <GalleryItem>
      <IntegrationCard
        connected={Boolean(aiStatus?.enabled)}
        description="Intelligent analysis. Failure analysis, smart triage, changelogs, and natural language search."
        icon={<RobotIcon />}
        name="AI"
        settingsPath="/settings?tab=ai"
      />
    </GalleryItem>
    <GalleryItem>
      <IntegrationCard
        connected
        description="Release milestones and GA dates for CNV versions."
        icon={<CalendarAltIcon />}
        name="Product Pages"
        settingsPath="/releases"
      />
    </GalleryItem>
  </Gallery>
);
