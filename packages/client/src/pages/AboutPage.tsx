import React, { useEffect, useState } from 'react';

import type { PublicConfig } from '@cnv-monitor/shared';

import {
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Grid,
  GridItem,
  Label,
  List,
  ListItem,
  PageSection,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import {
  ArrowRightIcon,
  BellIcon,
  BugIcon,
  CalendarAltIcon,
  ChartLineIcon,
  CheckCircleIcon,
  CodeBranchIcon,
  CogIcon,
  CubesIcon,
  DatabaseIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  HomeIcon,
  KeyIcon,
  OutlinedClockIcon,
  RobotIcon,
  SearchIcon,
  ServerIcon,
  ShieldAltIcon,
  SyncAltIcon,
  UserIcon,
  WrenchIcon,
} from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { type AIStatus, fetchAIStatus } from '../api/ai';
import { apiFetch } from '../api/client';
import { fetchPollStatus, type PollStatusResponse } from '../api/poll';
import { FeatureGroup, type FeatureGroupProps } from '../components/about/FeatureCard';
import { IntegrationCard } from '../components/about/IntegrationCard';
import { QuickStartGuide } from '../components/about/QuickStartGuide';

export const AboutPage: React.FC = () => {
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
    staleTime: 5 * 60_000,
  });

  const featureGroups: FeatureGroupProps[] = [
    {
      features: [
        {
          capabilities: [
            'Status matrix by version, tier, and component',
            'Health indicators (green/yellow/red)',
            'Real-time progress for in-progress launches',
            'Export results to CSV',
          ],
          description:
            'Central status matrix showing all launch groups with health indicators, pass rates, and live progress tracking.',
          icon: <HomeIcon />,
          path: '/',
          title: 'Dashboard',
        },
        {
          capabilities: [
            'Per-component or global acknowledgment',
            'Notes field for review comments',
            'Reviewer streak and coverage tracking',
            'History calendar with heatmap',
          ],
          description: 'Daily sign-off workflow for QE to confirm they reviewed test results.',
          icon: <CheckCircleIcon />,
          path: '/',
          title: 'Acknowledgment',
        },
        {
          capabilities: [
            'Recent triage actions and comments',
            'Jira bugs assigned to you',
            'Quick links to items needing attention',
          ],
          description: 'Personal dashboard showing your recent activity and assigned Jira bugs.',
          icon: <UserIcon />,
          path: '/my-work',
          title: 'My Work',
        },
      ],
      icon: <HomeIcon />,
      title: 'Daily Monitoring',
    },
    {
      features: [
        {
          capabilities: [
            'Failed test items table with triage actions',
            'Error log viewer per test item',
            'Artifacts panel (screenshots, videos)',
            'Auto, pattern, and unique error analysis',
            'Similar failures panel',
          ],
          description:
            'Deep-dive into a single launch or group of launches, with test items, logs, and artifacts.',
          icon: <DatabaseIcon />,
          path: '/',
          title: 'Launch Detail',
        },
        {
          capabilities: [
            'Aggregated view by unique test ID',
            'Bulk triage (select multiple, classify at once)',
            'New failure detection (first-time failures highlighted)',
            'Failure streak indicators',
          ],
          description: 'View and triage all untriaged failures across launches.',
          icon: <ExclamationCircleIcon />,
          path: '/failures',
          title: 'Failures',
        },
        {
          capabilities: [
            'Flip count and flip rate per test',
            'Sortable by flakiness',
            'Links to test profile for history',
          ],
          description: 'Identify tests that flip between pass and fail across runs.',
          icon: <ExclamationTriangleIcon />,
          path: '/flaky',
          title: 'Flaky Tests',
        },
        {
          capabilities: [
            'Consecutive failure streak',
            'Pass/fail history across launches',
            'Triage log for this specific test',
            'Links to affected launches',
          ],
          description: 'Per-test deep-dive showing history, streak, and triage timeline.',
          title: 'Test Profile',
        },
        {
          capabilities: [
            'Pick two launch groups (A vs B)',
            'Regressions: tests that passed in A but fail in B',
            'Fixes: tests that failed in A but pass in B',
            'Persistent failures across both',
          ],
          description:
            'Side-by-side comparison of two launch groups to find regressions and fixes.',
          icon: <CodeBranchIcon />,
          path: '/compare',
          title: 'Compare',
        },
      ],
      icon: <SearchIcon />,
      title: 'Test Analysis',
    },
    {
      features: [
        {
          capabilities: [
            '30-day trend charts',
            'Per-version trend breakdown',
            'Component-filtered views',
          ],
          description: 'Track pass rates over time by launch name or CNV version.',
          icon: <ChartLineIcon />,
          path: '/trends',
          title: 'Pass Rate Trends',
        },
        {
          capabilities: [
            'Color-coded cells (pass/fail/skip)',
            'Identify consistently failing tests',
            'Spot intermittent patterns',
          ],
          description: 'Visual grid showing failure patterns by test and date.',
          path: '/trends',
          title: 'Heatmap',
        },
        {
          capabilities: [
            'Top failing tests ranked by frequency',
            'Cluster reliability comparison',
            'Error message pattern grouping',
            'Defect type trends over time',
            'Failures by hour of day',
          ],
          description:
            'Top failures, cluster reliability, error patterns, defect trends, and hourly distribution.',
          path: '/trends',
          title: 'Advanced Analytics',
        },
      ],
      icon: <ChartLineIcon />,
      title: 'Trends & Analytics',
    },
    {
      features: [
        {
          capabilities: [
            'Product Bug, Automation Bug, System Issue, No Defect, To Investigate',
            'Single or bulk classification',
            'Updates reflected in ReportPortal immediately',
            'AI-powered triage suggestions',
          ],
          description: 'Classify test failures with ReportPortal defect types.',
          icon: <FlagIcon />,
          title: 'Defect Classification',
        },
        {
          capabilities: [
            'Create Jira bug with pre-filled description',
            'Link existing Jira issues',
            'Search Jira from the dashboard',
            'AI-generated bug reports',
          ],
          description: 'Create bugs or link existing Jira issues directly from failures.',
          title: 'Jira Integration',
        },
        {
          capabilities: [
            'Comments synced to ReportPortal',
            'Visible in activity feed',
            'Acknowledgment notes for daily reviews',
          ],
          description: 'Add comments to test items for team communication.',
          title: 'Comments & Notes',
        },
      ],
      icon: <BugIcon />,
      title: 'Triage & Jira',
    },
    {
      features: [
        {
          capabilities: [
            'Timeline, calendar, and Gantt views',
            'Product Pages integration for milestones',
            'Z-stream tracking',
          ],
          description: 'Track all CNV releases with milestones, GA dates, and current phase.',
          icon: <CalendarAltIcon />,
          path: '/releases',
          title: 'Release Timeline',
        },
        {
          capabilities: [
            'Per-version readiness score',
            'Blocking failures list',
            'Risk flags and traffic light indicators',
          ],
          description: 'Assess version readiness with test results and blocking issues.',
          path: '/releases',
          title: 'Readiness & Blockers',
        },
        {
          capabilities: [
            'Tasks pulled from Jira',
            'Status transitions from the dashboard',
            'Comments and notes per task',
          ],
          description: 'Jira-driven per-version task checklist for release preparation.',
          path: '/releases',
          title: 'Checklist',
        },
        {
          aiPowered: true,
          capabilities: [
            'Compares two versions',
            'Pulls GitHub PRs and commit data',
            'AI-structured changelog output',
          ],
          description:
            'Generate release changelogs using AI analysis of merged PRs and test results.',
          path: '/releases',
          title: 'AI Changelog',
        },
      ],
      icon: <CalendarAltIcon />,
      title: 'Releases',
    },
    {
      features: [
        {
          capabilities: [
            'Health cards per component',
            'AI-generated health narrative',
            'AI standup summary',
          ],
          description: 'Per-component pass rate and health overview.',
          icon: <CubesIcon />,
          path: '/components',
          title: 'Component Health',
        },
        {
          adminOnly: true,
          capabilities: [
            'Pattern-based mapping rules',
            'Auto-generate mappings from Jenkins teams',
            'Preview matched launches per pattern',
            'Unmapped launch detection',
          ],
          description: 'Map Jenkins job names to logical components using regex patterns.',
          path: '/settings',
          title: 'Component Mappings',
        },
        {
          capabilities: [
            'Multi-select component filter',
            'Persisted across page navigation',
            'Synced to URL for shareable links',
          ],
          description: 'Filter all pages by component using the masthead dropdown.',
          title: 'Global Component Filter',
        },
      ],
      icon: <CubesIcon />,
      title: 'Components',
    },
    {
      features: [
        {
          aiPowered: true,
          capabilities: [
            'Root cause analysis',
            'Suggested fix actions',
            'Pattern recognition across failures',
          ],
          description: 'AI analyzes error messages and test context to explain why tests failed.',
          title: 'Failure Analysis',
        },
        {
          aiPowered: true,
          capabilities: [
            'Based on error message and history',
            'Confidence score',
            'One-click apply suggestion',
          ],
          description: 'AI suggests the most likely defect classification for a failure.',
          title: 'Smart Triage',
        },
        {
          aiPowered: true,
          capabilities: [
            'Daily digest summary',
            'Standup summary per component',
            'Health narrative',
            'Risk assessment',
          ],
          description: 'AI-generated daily digests, standup summaries, and risk assessments.',
          title: 'Report Generation',
        },
        {
          aiPowered: true,
          capabilities: ['Powered by AI chat', 'Searches across launches, tests, and activity'],
          description: 'Search test data using natural language queries from the masthead.',
          title: 'Natural Language Search',
        },
        {
          adminOnly: true,
          capabilities: [
            'Per-provider API key configuration',
            'Model selection per provider',
            'Usage tracking and cache management',
            'Vertex AI auto-refresh via ADC',
          ],
          description:
            'Choose between Gemini, OpenAI, Anthropic, Vertex AI Claude, or local Ollama.',
          path: '/settings',
          title: 'Multi-Provider Support',
        },
      ],
      icon: <RobotIcon />,
      title: 'AI Features',
    },
    {
      features: [
        {
          adminOnly: true,
          capabilities: [
            'Slack webhooks',
            'Email distribution lists',
            'Per-component filtering',
            'Custom cron schedules with timezone',
          ],
          description:
            'Create notification subscriptions with custom schedules and component filters.',
          icon: <BellIcon />,
          path: '/settings',
          title: 'Subscriptions',
        },
        {
          capabilities: [
            'Configurable reminder time',
            'Sent via Slack to subscription channels',
            'Weekday-only option',
          ],
          description: 'Automated reminders when daily acknowledgment is missing.',
          title: 'Daily Reminders',
        },
        {
          capabilities: ['Phase-level failure details', 'Sent to all active subscriptions'],
          description:
            'Automatic Slack notification when a data pipeline run fails or is cancelled.',
          title: 'Pipeline Alerts',
        },
      ],
      icon: <BellIcon />,
      title: 'Notifications',
    },
    {
      features: [
        {
          adminOnly: true,
          capabilities: [
            'ReportPortal, Jira, Jenkins, Email connections',
            'Polling schedule and concurrency',
            'Dashboard links and preferences',
            'Export/import settings',
          ],
          description: 'Configure all integrations, polling, and system behavior.',
          icon: <CogIcon />,
          path: '/settings',
          title: 'Settings',
        },
        {
          adminOnly: true,
          capabilities: [
            'View all users',
            'Promote/demote admin roles',
            'Admin bootstrap for first-time setup',
          ],
          description: 'Manage user roles and admin access.',
          icon: <UserIcon />,
          path: '/settings',
          title: 'User Management',
        },
        {
          adminOnly: true,
          capabilities: [
            'Phase progress with ETA',
            'Cancel and resume individual phases',
            'Retry failed items',
            'Activity log with error details',
            'Health check and dry run',
          ],
          description: 'Monitor and control the data sync pipeline.',
          icon: <SyncAltIcon />,
          path: '/settings',
          title: 'Data Pipeline',
        },
      ],
      icon: <ShieldAltIcon />,
      title: 'Administration',
    },
  ];

  return (
    <>
      <PageSection className="app-about-hero">
        <Grid hasGutter>
          <GridItem md={8} span={12}>
            <Content component="h1">CNV Console Monitor</Content>
            <Content className="app-about-subtitle" component="p">
              Daily monitoring dashboard for CNV (Container-Native Virtualization) Console test runs
              from ReportPortal. Track test health, triage failures, manage releases, and get
              AI-powered insights — all in one place.
            </Content>
          </GridItem>
          <GridItem md={4} span={12}>
            <Flex
              flexWrap={{ default: 'wrap' }}
              justifyContent={{ default: 'justifyContentFlexEnd' }}
              spaceItems={{ default: 'spaceItemsMd' }}
            >
              {stats && (
                <>
                  <FlexItem>
                    <div className="app-about-stat">
                      <span className="app-about-stat-value">
                        {stats.launches.toLocaleString()}
                      </span>
                      <span className="app-about-stat-label">Launches</span>
                    </div>
                  </FlexItem>
                  <FlexItem>
                    <div className="app-about-stat">
                      <span className="app-about-stat-value">
                        {stats.testItems.toLocaleString()}
                      </span>
                      <span className="app-about-stat-label">Test Items</span>
                    </div>
                  </FlexItem>
                  <FlexItem>
                    <div className="app-about-stat">
                      <span className="app-about-stat-value">{stats.days}</span>
                      <span className="app-about-stat-label">Days of Data</span>
                    </div>
                  </FlexItem>
                </>
              )}
              {pollStatus?.lastPollAt && (
                <FlexItem>
                  <Label isCompact color="blue" icon={<OutlinedClockIcon />}>
                    Last sync: {new Date(pollStatus.lastPollAt).toLocaleString()}
                  </Label>
                </FlexItem>
              )}
            </Flex>
          </GridItem>
        </Grid>
      </PageSection>

      <PageSection>
        <Tabs isFilled activeKey={activeTab} onSelect={(_e, k) => setActiveTab(k)}>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <div className="app-mt-lg">
              <Content className="app-mb-md" component="h2">
                How It Works
              </Content>
              <Card className="app-mb-lg">
                <CardBody>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    className="app-about-flow"
                    flexWrap={{ default: 'wrap' }}
                    justifyContent={{ default: 'justifyContentCenter' }}
                    spaceItems={{ default: 'spaceItemsMd' }}
                  >
                    <FlexItem>
                      <div className="app-about-flow-node">
                        <ServerIcon className="app-about-flow-icon" />
                        <strong>ReportPortal</strong>
                        <Content className="app-text-muted" component="small">
                          Test data source
                        </Content>
                      </div>
                    </FlexItem>
                    <FlexItem>
                      <ArrowRightIcon className="app-about-flow-arrow" />
                    </FlexItem>
                    <FlexItem>
                      <div className="app-about-flow-pipeline">
                        <Content className="app-about-flow-pipeline-label" component="small">
                          Data Pipeline
                        </Content>
                        <Flex
                          alignItems={{ default: 'alignItemsCenter' }}
                          spaceItems={{ default: 'spaceItemsSm' }}
                        >
                          <FlexItem>
                            <div className="app-about-flow-phase">
                              <SyncAltIcon className="app-about-flow-phase-icon" />
                              <strong>1. Fetch Launches</strong>
                              <Content className="app-text-muted" component="small">
                                Pull from RP API
                              </Content>
                            </div>
                          </FlexItem>
                          <FlexItem>
                            <ArrowRightIcon className="app-about-flow-arrow-sm" />
                          </FlexItem>
                          <FlexItem>
                            <div className="app-about-flow-phase">
                              <ExclamationCircleIcon className="app-about-flow-phase-icon" />
                              <strong>2. Fetch Failed Items</strong>
                              <Content className="app-text-muted" component="small">
                                Test items + errors
                              </Content>
                            </div>
                          </FlexItem>
                          <FlexItem>
                            <ArrowRightIcon className="app-about-flow-arrow-sm" />
                          </FlexItem>
                          <FlexItem>
                            <div className="app-about-flow-phase">
                              <WrenchIcon className="app-about-flow-phase-icon" />
                              <strong>3. Jenkins Enrichment</strong>
                              <Content className="app-text-muted" component="small">
                                Component, team, tier
                              </Content>
                            </div>
                          </FlexItem>
                        </Flex>
                      </div>
                    </FlexItem>
                    <FlexItem>
                      <ArrowRightIcon className="app-about-flow-arrow" />
                    </FlexItem>
                    <FlexItem>
                      <div className="app-about-flow-node">
                        <DatabaseIcon className="app-about-flow-icon" />
                        <strong>PostgreSQL</strong>
                        <Content className="app-text-muted" component="small">
                          Persistent storage
                        </Content>
                      </div>
                    </FlexItem>
                    <FlexItem>
                      <ArrowRightIcon className="app-about-flow-arrow" />
                    </FlexItem>
                    <FlexItem>
                      <Flex
                        direction={{ default: 'column' }}
                        spaceItems={{ default: 'spaceItemsSm' }}
                      >
                        <FlexItem>
                          <div className="app-about-flow-node">
                            <HomeIcon className="app-about-flow-icon" />
                            <strong>Dashboard</strong>
                            <Content className="app-text-muted" component="small">
                              Web UI
                            </Content>
                          </div>
                        </FlexItem>
                        <FlexItem>
                          <div className="app-about-flow-node">
                            <BellIcon className="app-about-flow-icon" />
                            <strong>Notifications</strong>
                            <Content className="app-text-muted" component="small">
                              Slack & Email
                            </Content>
                          </div>
                        </FlexItem>
                      </Flex>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>

              <Content className="app-mb-md" component="h2">
                Integrations
              </Content>
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
                    connected={
                      pollStatus?.enrichment?.success != null && pollStatus.enrichment.success > 0
                    }
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
            </div>
          </Tab>

          <Tab eventKey="features" title={<TabTitleText>Features</TabTitleText>}>
            <div className="app-mt-lg">
              <Content className="app-text-muted app-mb-md" component="p">
                Expand each section to see detailed capabilities. Click "Open" to navigate directly
                to a feature.
              </Content>
              <Grid hasGutter>
                {featureGroups.map(group => (
                  <GridItem key={group.title} md={6} span={12}>
                    <FeatureGroup {...group} />
                  </GridItem>
                ))}
              </Grid>
            </div>
          </Tab>

          <Tab eventKey="quickstart" title={<TabTitleText>Quick Start</TabTitleText>}>
            <div className="app-mt-lg">
              <Content className="app-text-muted app-mb-md" component="p">
                Step-by-step guides for common workflows. Follow the steps and use the links to jump
                to the right page.
              </Content>
              <Grid hasGutter>
                <GridItem md={6} span={12}>
                  <QuickStartGuide
                    defaultExpanded
                    icon={<KeyIcon />}
                    steps={[
                      {
                        description: 'Enter your ReportPortal URL, API token, and project name.',
                        link: { label: 'Go to Settings', path: '/settings' },
                        title: 'Configure ReportPortal',
                      },
                      {
                        description:
                          'Click "Sync Now" in the masthead or start a full backfill from Settings to import historical data.',
                        link: { label: 'Go to Settings', path: '/settings' },
                        title: 'Run initial poll',
                      },
                      {
                        description:
                          'Map Jenkins job names to logical components so launches are grouped correctly.',
                        link: { label: 'Go to Settings', path: '/settings' },
                        title: 'Set up component mappings',
                      },
                      {
                        description:
                          'Add Jira credentials to enable bug creation and linking from failures.',
                        title: 'Configure Jira (optional)',
                      },
                      {
                        description:
                          'Create a Slack or email subscription for automated daily digests.',
                        title: 'Set up notifications (optional)',
                      },
                    ]}
                    title="First-Time Setup"
                  />
                </GridItem>
                <GridItem md={6} span={12}>
                  <QuickStartGuide
                    icon={<CheckCircleIcon />}
                    steps={[
                      {
                        description:
                          "Open the Dashboard to see today's launch status matrix. Red groups need attention.",
                        link: { label: 'Go to Dashboard', path: '/' },
                        title: 'Check the Dashboard',
                      },
                      {
                        description:
                          'Click a red group to see failed test items. Use the Failures page for a cross-launch view.',
                        link: { label: 'Go to Failures', path: '/failures' },
                        title: 'Review failures',
                      },
                      {
                        description:
                          'Classify defects (Product Bug, Automation Bug, etc.) and create/link Jira issues.',
                        title: 'Triage untriaged items',
                      },
                      {
                        description:
                          'Click the "Acknowledge" button on the Dashboard to sign off that you reviewed today\'s results.',
                        title: 'Acknowledge the review',
                      },
                    ]}
                    title="Daily Review Workflow"
                  />
                </GridItem>
                <GridItem md={6} span={12}>
                  <QuickStartGuide
                    icon={<BellIcon />}
                    steps={[
                      {
                        description:
                          'Go to Settings > Notification Subscriptions and click "New Subscription".',
                        link: { label: 'Go to Settings', path: '/settings' },
                        title: 'Create a subscription',
                      },
                      {
                        description:
                          'Select which components this subscription covers, or leave empty for all.',
                        title: 'Pick components',
                      },
                      {
                        description: 'Enter a Slack webhook URL and/or email recipients.',
                        title: 'Add channels',
                      },
                      {
                        description: 'Choose when digests are sent (e.g., 7:00 AM on weekdays).',
                        title: 'Set schedule',
                      },
                      {
                        description: 'Use the "Test" button to send a preview notification.',
                        title: 'Test it',
                      },
                    ]}
                    title="Setting Up Notifications"
                  />
                </GridItem>
                <GridItem md={6} span={12}>
                  <QuickStartGuide
                    icon={<BugIcon />}
                    steps={[
                      {
                        description:
                          'Use the Failures page or click into a launch group from the Dashboard.',
                        link: { label: 'Go to Failures', path: '/failures' },
                        title: 'Find the failure',
                      },
                      {
                        description:
                          'Click a test item to expand it and see the error message and logs.',
                        title: 'View error details',
                      },
                      {
                        description:
                          'Click "Classify" and select the defect type. AI can suggest a classification.',
                        title: 'Classify the defect',
                      },
                      {
                        description:
                          'Click "Create Jira" to file a new bug, or "Link Jira" to associate an existing one.',
                        title: 'Create or link a Jira bug',
                      },
                      {
                        description: 'Add a comment to explain your analysis for the team.',
                        title: 'Add a comment (optional)',
                      },
                    ]}
                    title="Triaging a Failure"
                  />
                </GridItem>
                <GridItem md={6} span={12}>
                  <QuickStartGuide
                    icon={<CalendarAltIcon />}
                    steps={[
                      {
                        description: 'View all CNV releases with their GA dates and current phase.',
                        link: { label: 'Go to Releases', path: '/releases' },
                        title: 'Open the Releases page',
                      },
                      {
                        description:
                          'Click a version to see its dashboard with test readiness and blockers.',
                        title: 'Select a version',
                      },
                      {
                        description: 'Check Jira-driven tasks for release preparation status.',
                        title: 'Review the checklist',
                      },
                      {
                        description: 'Use AI to generate a changelog comparing two versions.',
                        title: 'Generate a changelog',
                      },
                    ]}
                    title="Tracking a Release"
                  />
                </GridItem>
                <GridItem md={6} span={12}>
                  <QuickStartGuide
                    icon={<RobotIcon />}
                    steps={[
                      {
                        description:
                          'Go to Settings > AI Configuration and select a provider (Gemini, OpenAI, Vertex Claude, etc.).',
                        link: { label: 'Go to Settings', path: '/settings' },
                        title: 'Configure AI provider',
                      },
                      {
                        description:
                          'Toggle "Enable AI" on and save. Enter the API key or configure ADC for Vertex AI.',
                        title: 'Enable AI',
                      },
                      {
                        description:
                          'On any failure, click the AI button to get an automated root cause analysis.',
                        title: 'Analyze failures',
                      },
                      {
                        description:
                          'On the Component Health page, use AI buttons for health narratives and standup summaries.',
                        link: { label: 'Go to Components', path: '/components' },
                        title: 'Generate reports',
                      },
                    ]}
                    title="Using AI Features"
                  />
                </GridItem>
              </Grid>
            </div>
          </Tab>

          <Tab eventKey="tips" title={<TabTitleText>Tips & Shortcuts</TabTitleText>}>
            <div className="app-mt-lg">
              <Grid hasGutter>
                <GridItem md={6} span={12}>
                  <Card>
                    <CardTitle>Keyboard Shortcuts</CardTitle>
                    <CardBody>
                      <DescriptionList isHorizontal>
                        <DescriptionListGroup>
                          <DescriptionListTerm>
                            <Label isCompact>Cmd/Ctrl + S</Label>
                          </DescriptionListTerm>
                          <DescriptionListDescription>
                            Save settings when on the Settings page
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem md={6} span={12}>
                  <Card>
                    <CardTitle>URL Parameters</CardTitle>
                    <CardBody>
                      <DescriptionList isCompact isHorizontal>
                        <DescriptionListGroup>
                          <DescriptionListTerm>
                            <Label isCompact>?components=a,b</Label>
                          </DescriptionListTerm>
                          <DescriptionListDescription>
                            Filter by components
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>
                            <Label isCompact>?version=4.18</Label>
                          </DescriptionListTerm>
                          <DescriptionListDescription>
                            Filter dashboard by CNV version
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>
                            <Label isCompact>?tiers=TIER-1,TIER-2</Label>
                          </DescriptionListTerm>
                          <DescriptionListDescription>
                            Filter by test tiers
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem md={6} span={12}>
                  <Card>
                    <CardTitle>Pro Tips</CardTitle>
                    <CardBody>
                      <List>
                        <ListItem>
                          The <strong>global component filter</strong> in the masthead persists
                          across all pages — set it once and every page filters accordingly.
                        </ListItem>
                        <ListItem>
                          Use the <strong>date range selector</strong> in the masthead to control
                          the lookback window. Custom date ranges are supported.
                        </ListItem>
                        <ListItem>
                          Copy any page URL to share a <strong>filtered view</strong> with your team
                          — filters are encoded in the URL.
                        </ListItem>
                        <ListItem>
                          <strong>Bulk triage</strong> on the Failures page: select multiple items
                          with checkboxes, then classify them all at once.
                        </ListItem>
                        <ListItem>
                          Click a <strong>test name</strong> anywhere to open its Test Profile with
                          full history and streak data.
                        </ListItem>
                        <ListItem>
                          The <strong>Activity</strong> nav item shows a badge when there is new
                          activity since your last visit.
                        </ListItem>
                      </List>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem md={6} span={12}>
                  <Card>
                    <CardTitle>Data & Sync</CardTitle>
                    <CardBody>
                      <List>
                        <ListItem>
                          Data is synced from ReportPortal on a schedule (default: every 15
                          minutes). You can trigger a manual sync from the masthead.
                        </ListItem>
                        <ListItem>
                          A <strong>full backfill</strong> re-fetches all historical data (up to 180
                          days). Use this after first setup or when data seems stale.
                        </ListItem>
                        <ListItem>
                          Jenkins enrichment adds component, team, and tier metadata from build
                          parameters. It runs automatically after each sync.
                        </ListItem>
                        <ListItem>
                          The <strong>pipeline activity log</strong> in Settings shows detailed
                          progress and error messages for each sync run.
                        </ListItem>
                      </List>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </div>
          </Tab>
        </Tabs>
      </PageSection>
    </>
  );
};
