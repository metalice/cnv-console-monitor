import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection, Content, Tabs, Tab, TabTitleText,
  Gallery, GalleryItem, Grid, GridItem,
  Card, CardBody, CardTitle,
  Label, Flex, FlexItem, Divider,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  List, ListItem,
} from '@patternfly/react-core';
import {
  HomeIcon, ExclamationCircleIcon, ChartLineIcon,
  ExclamationTriangleIcon, CubesIcon, CodeBranchIcon,
  CalendarAltIcon, ListIcon, CogIcon, UserIcon,
  SearchIcon, BellIcon, EnvelopeIcon, RobotIcon,
  BugIcon, FlagIcon, ShieldAltIcon, SyncAltIcon,
  DatabaseIcon, ServerIcon, KeyIcon, WrenchIcon,
  ArrowRightIcon, CheckCircleIcon, OutlinedClockIcon,
} from '@patternfly/react-icons';
import type { PublicConfig } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';
import { fetchPollStatus, type PollStatusResponse } from '../api/poll';
import { fetchAIStatus, type AIStatus } from '../api/ai';
import { IntegrationCard } from '../components/about/IntegrationCard';
import { FeatureGroup, type FeatureGroupProps } from '../components/about/FeatureCard';
import { QuickStartGuide } from '../components/about/QuickStartGuide';

export const AboutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | number>('overview');

  useEffect(() => { document.title = 'About | CNV Console Monitor'; }, []);

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => apiFetch<PublicConfig>('/config'), staleTime: Infinity });
  const { data: pollStatus } = useQuery<PollStatusResponse>({ queryKey: ['pollStatus'], queryFn: fetchPollStatus, staleTime: 30_000 });
  const { data: aiStatus } = useQuery<AIStatus>({ queryKey: ['aiStatus'], queryFn: fetchAIStatus, staleTime: 60_000 });
  const { data: stats } = useQuery({ queryKey: ['aboutStats'], queryFn: () => apiFetch<{ launches: number; testItems: number; days: number }>('/launches/stats'), staleTime: 5 * 60_000 });

  const featureGroups: FeatureGroupProps[] = [
    {
      title: 'Daily Monitoring',
      icon: <HomeIcon />,
      features: [
        { title: 'Dashboard', description: 'Central status matrix showing all launch groups with health indicators, pass rates, and live progress tracking.', path: '/', capabilities: ['Status matrix by version, tier, and component', 'Health indicators (green/yellow/red)', 'Real-time progress for in-progress launches', 'Export results to CSV'], icon: <HomeIcon /> },
        { title: 'Acknowledgment', description: 'Daily sign-off workflow for QE to confirm they reviewed test results.', path: '/', capabilities: ['Per-component or global acknowledgment', 'Notes field for review comments', 'Reviewer streak and coverage tracking', 'History calendar with heatmap'], icon: <CheckCircleIcon /> },
        { title: 'My Work', description: 'Personal dashboard showing your recent activity and assigned Jira bugs.', path: '/my-work', capabilities: ['Recent triage actions and comments', 'Jira bugs assigned to you', 'Quick links to items needing attention'], icon: <UserIcon /> },
      ],
    },
    {
      title: 'Test Analysis',
      icon: <SearchIcon />,
      features: [
        { title: 'Launch Detail', description: 'Deep-dive into a single launch or group of launches, with test items, logs, and artifacts.', path: '/', capabilities: ['Failed test items table with triage actions', 'Error log viewer per test item', 'Artifacts panel (screenshots, videos)', 'Auto, pattern, and unique error analysis', 'Similar failures panel'], icon: <DatabaseIcon /> },
        { title: 'Failures', description: 'View and triage all untriaged failures across launches.', path: '/failures', capabilities: ['Aggregated view by unique test ID', 'Bulk triage (select multiple, classify at once)', 'New failure detection (first-time failures highlighted)', 'Failure streak indicators'], icon: <ExclamationCircleIcon /> },
        { title: 'Flaky Tests', description: 'Identify tests that flip between pass and fail across runs.', path: '/flaky', capabilities: ['Flip count and flip rate per test', 'Sortable by flakiness', 'Links to test profile for history'], icon: <ExclamationTriangleIcon /> },
        { title: 'Test Profile', description: 'Per-test deep-dive showing history, streak, and triage timeline.', capabilities: ['Consecutive failure streak', 'Pass/fail history across launches', 'Triage log for this specific test', 'Links to affected launches'] },
        { title: 'Compare', description: 'Side-by-side comparison of two launch groups to find regressions and fixes.', path: '/compare', capabilities: ['Pick two launch groups (A vs B)', 'Regressions: tests that passed in A but fail in B', 'Fixes: tests that failed in A but pass in B', 'Persistent failures across both'], icon: <CodeBranchIcon /> },
      ],
    },
    {
      title: 'Trends & Analytics',
      icon: <ChartLineIcon />,
      features: [
        { title: 'Pass Rate Trends', description: 'Track pass rates over time by launch name or CNV version.', path: '/trends', capabilities: ['30-day trend charts', 'Per-version trend breakdown', 'Component-filtered views'], icon: <ChartLineIcon /> },
        { title: 'Heatmap', description: 'Visual grid showing failure patterns by test and date.', path: '/trends', capabilities: ['Color-coded cells (pass/fail/skip)', 'Identify consistently failing tests', 'Spot intermittent patterns'] },
        { title: 'Advanced Analytics', description: 'Top failures, cluster reliability, error patterns, defect trends, and hourly distribution.', path: '/trends', capabilities: ['Top failing tests ranked by frequency', 'Cluster reliability comparison', 'Error message pattern grouping', 'Defect type trends over time', 'Failures by hour of day'] },
      ],
    },
    {
      title: 'Triage & Jira',
      icon: <BugIcon />,
      features: [
        { title: 'Defect Classification', description: 'Classify test failures with ReportPortal defect types.', capabilities: ['Product Bug, Automation Bug, System Issue, No Defect, To Investigate', 'Single or bulk classification', 'Updates reflected in ReportPortal immediately', 'AI-powered triage suggestions'], icon: <FlagIcon /> },
        { title: 'Jira Integration', description: 'Create bugs or link existing Jira issues directly from failures.', capabilities: ['Create Jira bug with pre-filled description', 'Link existing Jira issues', 'Search Jira from the dashboard', 'AI-generated bug reports'] },
        { title: 'Comments & Notes', description: 'Add comments to test items for team communication.', capabilities: ['Comments synced to ReportPortal', 'Visible in activity feed', 'Acknowledgment notes for daily reviews'] },
      ],
    },
    {
      title: 'Releases',
      icon: <CalendarAltIcon />,
      features: [
        { title: 'Release Timeline', description: 'Track all CNV releases with milestones, GA dates, and current phase.', path: '/releases', capabilities: ['Timeline, calendar, and Gantt views', 'Product Pages integration for milestones', 'Z-stream tracking'], icon: <CalendarAltIcon /> },
        { title: 'Readiness & Blockers', description: 'Assess version readiness with test results and blocking issues.', path: '/releases', capabilities: ['Per-version readiness score', 'Blocking failures list', 'Risk flags and traffic light indicators'] },
        { title: 'Checklist', description: 'Jira-driven per-version task checklist for release preparation.', path: '/releases', capabilities: ['Tasks pulled from Jira', 'Status transitions from the dashboard', 'Comments and notes per task'] },
        { title: 'AI Changelog', description: 'Generate release changelogs using AI analysis of merged PRs and test results.', path: '/releases', capabilities: ['Compares two versions', 'Pulls GitHub PRs and commit data', 'AI-structured changelog output'], aiPowered: true },
      ],
    },
    {
      title: 'Components',
      icon: <CubesIcon />,
      features: [
        { title: 'Component Health', description: 'Per-component pass rate and health overview.', path: '/components', capabilities: ['Health cards per component', 'AI-generated health narrative', 'AI standup summary'], icon: <CubesIcon /> },
        { title: 'Component Mappings', description: 'Map Jenkins job names to logical components using regex patterns.', path: '/settings', capabilities: ['Pattern-based mapping rules', 'Auto-generate mappings from Jenkins teams', 'Preview matched launches per pattern', 'Unmapped launch detection'], adminOnly: true },
        { title: 'Global Component Filter', description: 'Filter all pages by component using the masthead dropdown.', capabilities: ['Multi-select component filter', 'Persisted across page navigation', 'Synced to URL for shareable links'] },
      ],
    },
    {
      title: 'AI Features',
      icon: <RobotIcon />,
      features: [
        { title: 'Failure Analysis', description: 'AI analyzes error messages and test context to explain why tests failed.', capabilities: ['Root cause analysis', 'Suggested fix actions', 'Pattern recognition across failures'], aiPowered: true },
        { title: 'Smart Triage', description: 'AI suggests the most likely defect classification for a failure.', capabilities: ['Based on error message and history', 'Confidence score', 'One-click apply suggestion'], aiPowered: true },
        { title: 'Report Generation', description: 'AI-generated daily digests, standup summaries, and risk assessments.', capabilities: ['Daily digest summary', 'Standup summary per component', 'Health narrative', 'Risk assessment'], aiPowered: true },
        { title: 'Natural Language Search', description: 'Search test data using natural language queries from the masthead.', capabilities: ['Powered by AI chat', 'Searches across launches, tests, and activity'], aiPowered: true },
        { title: 'Multi-Provider Support', description: 'Choose between Gemini, OpenAI, Anthropic, Vertex AI Claude, or local Ollama.', path: '/settings', capabilities: ['Per-provider API key configuration', 'Model selection per provider', 'Usage tracking and cache management', 'Vertex AI auto-refresh via ADC'], adminOnly: true },
      ],
    },
    {
      title: 'Notifications',
      icon: <BellIcon />,
      features: [
        { title: 'Subscriptions', description: 'Create notification subscriptions with custom schedules and component filters.', path: '/settings', capabilities: ['Slack webhooks', 'Email distribution lists', 'Per-component filtering', 'Custom cron schedules with timezone'], adminOnly: true, icon: <BellIcon /> },
        { title: 'Daily Reminders', description: 'Automated reminders when daily acknowledgment is missing.', capabilities: ['Configurable reminder time', 'Sent via Slack to subscription channels', 'Weekday-only option'] },
        { title: 'Pipeline Alerts', description: 'Automatic Slack notification when a data pipeline run fails or is cancelled.', capabilities: ['Phase-level failure details', 'Sent to all active subscriptions'] },
      ],
    },
    {
      title: 'Administration',
      icon: <ShieldAltIcon />,
      features: [
        { title: 'Settings', description: 'Configure all integrations, polling, and system behavior.', path: '/settings', capabilities: ['ReportPortal, Jira, Jenkins, Email connections', 'Polling schedule and concurrency', 'Dashboard links and preferences', 'Export/import settings'], adminOnly: true, icon: <CogIcon /> },
        { title: 'User Management', description: 'Manage user roles and admin access.', path: '/settings', capabilities: ['View all users', 'Promote/demote admin roles', 'Admin bootstrap for first-time setup'], adminOnly: true, icon: <UserIcon /> },
        { title: 'Data Pipeline', description: 'Monitor and control the data sync pipeline.', path: '/settings', capabilities: ['Phase progress with ETA', 'Cancel and resume individual phases', 'Retry failed items', 'Activity log with error details', 'Health check and dry run'], adminOnly: true, icon: <SyncAltIcon /> },
      ],
    },
  ];

  return (
    <>
      <PageSection className="app-about-hero">
        <Grid hasGutter>
          <GridItem span={12} md={8}>
            <Content component="h1">CNV Console Monitor</Content>
            <Content component="p" className="app-about-subtitle">
              Daily monitoring dashboard for CNV (Container-Native Virtualization) Console test runs from ReportPortal.
              Track test health, triage failures, manage releases, and get AI-powered insights — all in one place.
            </Content>
          </GridItem>
          <GridItem span={12} md={4}>
            <Flex spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }} justifyContent={{ default: 'justifyContentFlexEnd' }}>
              {stats && (
                <>
                  <FlexItem>
                    <div className="app-about-stat">
                      <span className="app-about-stat-value">{stats.launches.toLocaleString()}</span>
                      <span className="app-about-stat-label">Launches</span>
                    </div>
                  </FlexItem>
                  <FlexItem>
                    <div className="app-about-stat">
                      <span className="app-about-stat-value">{stats.testItems.toLocaleString()}</span>
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
        <Tabs activeKey={activeTab} onSelect={(_e, k) => setActiveTab(k)} isFilled>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <div className="app-mt-lg">
              <Content component="h2" className="app-mb-md">How It Works</Content>
              <Card className="app-mb-lg">
                <CardBody>
                  <Flex justifyContent={{ default: 'justifyContentCenter' }} alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }} className="app-about-flow">
                    <FlexItem>
                      <div className="app-about-flow-node">
                        <ServerIcon className="app-about-flow-icon" />
                        <strong>ReportPortal</strong>
                        <Content component="small" className="app-text-muted">Test data source</Content>
                      </div>
                    </FlexItem>
                    <FlexItem><ArrowRightIcon className="app-about-flow-arrow" /></FlexItem>
                    <FlexItem>
                      <div className="app-about-flow-pipeline">
                        <Content component="small" className="app-about-flow-pipeline-label">Data Pipeline</Content>
                        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                          <FlexItem>
                            <div className="app-about-flow-phase">
                              <SyncAltIcon className="app-about-flow-phase-icon" />
                              <strong>1. Fetch Launches</strong>
                              <Content component="small" className="app-text-muted">Pull from RP API</Content>
                            </div>
                          </FlexItem>
                          <FlexItem><ArrowRightIcon className="app-about-flow-arrow-sm" /></FlexItem>
                          <FlexItem>
                            <div className="app-about-flow-phase">
                              <ExclamationCircleIcon className="app-about-flow-phase-icon" />
                              <strong>2. Fetch Failed Items</strong>
                              <Content component="small" className="app-text-muted">Test items + errors</Content>
                            </div>
                          </FlexItem>
                          <FlexItem><ArrowRightIcon className="app-about-flow-arrow-sm" /></FlexItem>
                          <FlexItem>
                            <div className="app-about-flow-phase">
                              <WrenchIcon className="app-about-flow-phase-icon" />
                              <strong>3. Jenkins Enrichment</strong>
                              <Content component="small" className="app-text-muted">Component, team, tier</Content>
                            </div>
                          </FlexItem>
                        </Flex>
                      </div>
                    </FlexItem>
                    <FlexItem><ArrowRightIcon className="app-about-flow-arrow" /></FlexItem>
                    <FlexItem>
                      <div className="app-about-flow-node">
                        <DatabaseIcon className="app-about-flow-icon" />
                        <strong>PostgreSQL</strong>
                        <Content component="small" className="app-text-muted">Persistent storage</Content>
                      </div>
                    </FlexItem>
                    <FlexItem><ArrowRightIcon className="app-about-flow-arrow" /></FlexItem>
                    <FlexItem>
                      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                        <FlexItem>
                          <div className="app-about-flow-node">
                            <HomeIcon className="app-about-flow-icon" />
                            <strong>Dashboard</strong>
                            <Content component="small" className="app-text-muted">Web UI</Content>
                          </div>
                        </FlexItem>
                        <FlexItem>
                          <div className="app-about-flow-node">
                            <BellIcon className="app-about-flow-icon" />
                            <strong>Notifications</strong>
                            <Content component="small" className="app-text-muted">Slack & Email</Content>
                          </div>
                        </FlexItem>
                      </Flex>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>

              <Content component="h2" className="app-mb-md">Integrations</Content>
              <Gallery hasGutter minWidths={{ default: '250px' }}>
                <GalleryItem>
                  <IntegrationCard name="ReportPortal" icon={<ServerIcon />} description="Test execution data source. Launches, test items, defect types, and logs." connected={!!config?.reportportalUrl} settingsPath="/settings?tab=reportportal" />
                </GalleryItem>
                <GalleryItem>
                  <IntegrationCard name="Jenkins" icon={<SyncAltIcon />} description="Build enrichment. Maps launches to teams, components, and tiers." connected={pollStatus?.enrichment?.success != null && pollStatus.enrichment.success > 0} settingsPath="/settings?tab=jenkins" />
                </GalleryItem>
                <GalleryItem>
                  <IntegrationCard name="Jira" icon={<BugIcon />} description="Bug tracking. Create and link issues directly from test failures." connected={!!config?.jiraEnabled} settingsPath="/settings?tab=jira" />
                </GalleryItem>
                <GalleryItem>
                  <IntegrationCard name="Slack" icon={<BellIcon />} description="Team notifications. Daily digests, reminders, and pipeline alerts." connected={!!config?.slackEnabled} settingsPath="/settings?tab=notifications" />
                </GalleryItem>
                <GalleryItem>
                  <IntegrationCard name="Email" icon={<EnvelopeIcon />} description="Email digests. HTML reports sent on schedule." connected={!!config?.emailEnabled} settingsPath="/settings?tab=email" />
                </GalleryItem>
                <GalleryItem>
                  <IntegrationCard name="AI" icon={<RobotIcon />} description="Intelligent analysis. Failure analysis, smart triage, changelogs, and natural language search." connected={!!aiStatus?.enabled} settingsPath="/settings?tab=ai" />
                </GalleryItem>
                <GalleryItem>
                  <IntegrationCard name="Product Pages" icon={<CalendarAltIcon />} description="Release milestones and GA dates for CNV versions." connected={true} settingsPath="/releases" />
                </GalleryItem>
              </Gallery>
            </div>
          </Tab>

          <Tab eventKey="features" title={<TabTitleText>Features</TabTitleText>}>
            <div className="app-mt-lg">
              <Content component="p" className="app-text-muted app-mb-md">
                Expand each section to see detailed capabilities. Click "Open" to navigate directly to a feature.
              </Content>
              <Grid hasGutter>
                {featureGroups.map((group) => (
                  <GridItem span={12} md={6} key={group.title}>
                    <FeatureGroup {...group} />
                  </GridItem>
                ))}
              </Grid>
            </div>
          </Tab>

          <Tab eventKey="quickstart" title={<TabTitleText>Quick Start</TabTitleText>}>
            <div className="app-mt-lg">
              <Content component="p" className="app-text-muted app-mb-md">
                Step-by-step guides for common workflows. Follow the steps and use the links to jump to the right page.
              </Content>
              <Grid hasGutter>
                <GridItem span={12} md={6}>
                  <QuickStartGuide
                    title="First-Time Setup"
                    icon={<KeyIcon />}
                    defaultExpanded
                    steps={[
                      { title: 'Configure ReportPortal', description: 'Enter your ReportPortal URL, API token, and project name.', link: { label: 'Go to Settings', path: '/settings' } },
                      { title: 'Run initial poll', description: 'Click "Sync Now" in the masthead or start a full backfill from Settings to import historical data.', link: { label: 'Go to Settings', path: '/settings' } },
                      { title: 'Set up component mappings', description: 'Map Jenkins job names to logical components so launches are grouped correctly.', link: { label: 'Go to Settings', path: '/settings' } },
                      { title: 'Configure Jira (optional)', description: 'Add Jira credentials to enable bug creation and linking from failures.' },
                      { title: 'Set up notifications (optional)', description: 'Create a Slack or email subscription for automated daily digests.' },
                    ]}
                  />
                </GridItem>
                <GridItem span={12} md={6}>
                  <QuickStartGuide
                    title="Daily Review Workflow"
                    icon={<CheckCircleIcon />}
                    steps={[
                      { title: 'Check the Dashboard', description: 'Open the Dashboard to see today\'s launch status matrix. Red groups need attention.', link: { label: 'Go to Dashboard', path: '/' } },
                      { title: 'Review failures', description: 'Click a red group to see failed test items. Use the Failures page for a cross-launch view.', link: { label: 'Go to Failures', path: '/failures' } },
                      { title: 'Triage untriaged items', description: 'Classify defects (Product Bug, Automation Bug, etc.) and create/link Jira issues.' },
                      { title: 'Acknowledge the review', description: 'Click the "Acknowledge" button on the Dashboard to sign off that you reviewed today\'s results.' },
                    ]}
                  />
                </GridItem>
                <GridItem span={12} md={6}>
                  <QuickStartGuide
                    title="Setting Up Notifications"
                    icon={<BellIcon />}
                    steps={[
                      { title: 'Create a subscription', description: 'Go to Settings > Notification Subscriptions and click "New Subscription".', link: { label: 'Go to Settings', path: '/settings' } },
                      { title: 'Pick components', description: 'Select which components this subscription covers, or leave empty for all.' },
                      { title: 'Add channels', description: 'Enter a Slack webhook URL and/or email recipients.' },
                      { title: 'Set schedule', description: 'Choose when digests are sent (e.g., 7:00 AM on weekdays).' },
                      { title: 'Test it', description: 'Use the "Test" button to send a preview notification.' },
                    ]}
                  />
                </GridItem>
                <GridItem span={12} md={6}>
                  <QuickStartGuide
                    title="Triaging a Failure"
                    icon={<BugIcon />}
                    steps={[
                      { title: 'Find the failure', description: 'Use the Failures page or click into a launch group from the Dashboard.', link: { label: 'Go to Failures', path: '/failures' } },
                      { title: 'View error details', description: 'Click a test item to expand it and see the error message and logs.' },
                      { title: 'Classify the defect', description: 'Click "Classify" and select the defect type. AI can suggest a classification.' },
                      { title: 'Create or link a Jira bug', description: 'Click "Create Jira" to file a new bug, or "Link Jira" to associate an existing one.' },
                      { title: 'Add a comment (optional)', description: 'Add a comment to explain your analysis for the team.' },
                    ]}
                  />
                </GridItem>
                <GridItem span={12} md={6}>
                  <QuickStartGuide
                    title="Tracking a Release"
                    icon={<CalendarAltIcon />}
                    steps={[
                      { title: 'Open the Releases page', description: 'View all CNV releases with their GA dates and current phase.', link: { label: 'Go to Releases', path: '/releases' } },
                      { title: 'Select a version', description: 'Click a version to see its dashboard with test readiness and blockers.' },
                      { title: 'Review the checklist', description: 'Check Jira-driven tasks for release preparation status.' },
                      { title: 'Generate a changelog', description: 'Use AI to generate a changelog comparing two versions.' },
                    ]}
                  />
                </GridItem>
                <GridItem span={12} md={6}>
                  <QuickStartGuide
                    title="Using AI Features"
                    icon={<RobotIcon />}
                    steps={[
                      { title: 'Configure AI provider', description: 'Go to Settings > AI Configuration and select a provider (Gemini, OpenAI, Vertex Claude, etc.).', link: { label: 'Go to Settings', path: '/settings' } },
                      { title: 'Enable AI', description: 'Toggle "Enable AI" on and save. Enter the API key or configure ADC for Vertex AI.' },
                      { title: 'Analyze failures', description: 'On any failure, click the AI button to get an automated root cause analysis.' },
                      { title: 'Generate reports', description: 'On the Component Health page, use AI buttons for health narratives and standup summaries.', link: { label: 'Go to Components', path: '/components' } },
                    ]}
                  />
                </GridItem>
              </Grid>
            </div>
          </Tab>

          <Tab eventKey="tips" title={<TabTitleText>Tips & Shortcuts</TabTitleText>}>
            <div className="app-mt-lg">
              <Grid hasGutter>
                <GridItem span={12} md={6}>
                  <Card>
                    <CardTitle>Keyboard Shortcuts</CardTitle>
                    <CardBody>
                      <DescriptionList isHorizontal>
                        <DescriptionListGroup>
                          <DescriptionListTerm><Label isCompact>Cmd/Ctrl + S</Label></DescriptionListTerm>
                          <DescriptionListDescription>Save settings when on the Settings page</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem span={12} md={6}>
                  <Card>
                    <CardTitle>URL Parameters</CardTitle>
                    <CardBody>
                      <DescriptionList isHorizontal isCompact>
                        <DescriptionListGroup>
                          <DescriptionListTerm><Label isCompact>?components=a,b</Label></DescriptionListTerm>
                          <DescriptionListDescription>Filter by components</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm><Label isCompact>?version=4.18</Label></DescriptionListTerm>
                          <DescriptionListDescription>Filter dashboard by CNV version</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm><Label isCompact>?tiers=TIER-1,TIER-2</Label></DescriptionListTerm>
                          <DescriptionListDescription>Filter by test tiers</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem span={12} md={6}>
                  <Card>
                    <CardTitle>Pro Tips</CardTitle>
                    <CardBody>
                      <List>
                        <ListItem>The <strong>global component filter</strong> in the masthead persists across all pages — set it once and every page filters accordingly.</ListItem>
                        <ListItem>Use the <strong>date range selector</strong> in the masthead to control the lookback window. Custom date ranges are supported.</ListItem>
                        <ListItem>Copy any page URL to share a <strong>filtered view</strong> with your team — filters are encoded in the URL.</ListItem>
                        <ListItem><strong>Bulk triage</strong> on the Failures page: select multiple items with checkboxes, then classify them all at once.</ListItem>
                        <ListItem>Click a <strong>test name</strong> anywhere to open its Test Profile with full history and streak data.</ListItem>
                        <ListItem>The <strong>Activity</strong> nav item shows a badge when there is new activity since your last visit.</ListItem>
                      </List>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem span={12} md={6}>
                  <Card>
                    <CardTitle>Data & Sync</CardTitle>
                    <CardBody>
                      <List>
                        <ListItem>Data is synced from ReportPortal on a schedule (default: every 15 minutes). You can trigger a manual sync from the masthead.</ListItem>
                        <ListItem>A <strong>full backfill</strong> re-fetches all historical data (up to 180 days). Use this after first setup or when data seems stale.</ListItem>
                        <ListItem>Jenkins enrichment adds component, team, and tier metadata from build parameters. It runs automatically after each sync.</ListItem>
                        <ListItem>The <strong>pipeline activity log</strong> in Settings shows detailed progress and error messages for each sync run.</ListItem>
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
