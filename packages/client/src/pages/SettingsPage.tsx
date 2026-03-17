import React, { useEffect } from 'react';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Button,
  Alert,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { useSettingsState } from '../components/settings/useSettingsState';
import { ReportPortalSettings } from '../components/settings/ReportPortalSettings';
import { JiraSettings } from '../components/settings/JiraSettings';
import { EmailServerSettings } from '../components/settings/EmailServerSettings';
import { PollingSettings } from '../components/settings/PollingSettings';
import { LinksSettings } from '../components/settings/LinksSettings';
import { JenkinsSettings } from '../components/settings/JenkinsSettings';
import { NotificationSubscriptions } from '../components/settings/NotificationSubscriptions';
import { ComponentMappings } from '../components/settings/ComponentMappings';
import { UserManagement, BootstrapAdmin } from '../components/settings/UserManagement';
import { SystemHealth } from '../components/settings/SystemHealth';
import { formatUptime } from '../components/settings/types';

export const SettingsPage: React.FC = () => {
  useEffect(() => { document.title = 'Settings | CNV Console Monitor'; }, []);

  const state = useSettingsState();
  const {
    data, isLoading, isAdmin,
    val, set, sourceLabel, adminOnly,
    tokenEditing, startTokenEdit, endTokenEdit,
    saveMessage, saveAll, saveMutation, hasChanges,
    rpProjectOptions, rpTestMsg, rpTest,
    jiraTestMsg, jiraTest, jiraTokenDirty,
    jiraProjectSelectOptions, issueTypeSelectOptions,
    setJiraTestMode, setJiraMetaOverride, setJiraTestMsg,
  } = state;

  if (isLoading || !data) return <div className="app-page-spinner"><Spinner aria-label="Loading settings" /></div>;

  const systemInfo = data.system;
  const sectionProps = { val, set, sourceLabel, adminOnly };
  const tokenHandlers = { tokenEditing, startTokenEdit, endTokenEdit };

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Settings</Content>
            <Content component="small">Runtime-configurable settings. Changes apply immediately and persist across restarts.</Content>
          </FlexItem>
          {isAdmin && (
            <FlexItem>
              <Button variant="primary" onClick={saveAll} isDisabled={!hasChanges()} isLoading={saveMutation.isPending}>
                Save Changes
              </Button>
            </FlexItem>
          )}
        </Flex>
      </PageSection>

      {saveMessage && (
        <PageSection><Alert variant={saveMessage.type} isInline title={saveMessage.text} /></PageSection>
      )}

      <PageSection>
        <Grid hasGutter>
          <GridItem span={12} md={6}>
            <ReportPortalSettings {...sectionProps} {...tokenHandlers} rpProjectOptions={rpProjectOptions} rpTestMsg={rpTestMsg} onTestConnection={() => rpTest.mutate()} isTestPending={rpTest.isPending} />
          </GridItem>
          <GridItem span={12} md={6}>
            <JiraSettings
              {...sectionProps}
              {...tokenHandlers}
              jiraEnabled={systemInfo.jiraEnabled}
              jiraProjectSelectOptions={jiraProjectSelectOptions}
              issueTypeSelectOptions={issueTypeSelectOptions}
              jiraTestMsg={jiraTestMsg}
              onTokenChange={(v) => { set('jira.token', v); setJiraTestMode(false); setJiraMetaOverride(null); setJiraTestMsg(null); }}
              onTestConnection={() => {
                if (jiraTokenDirty) { set('jira.projectKey', ''); set('jira.issueType', ''); set('jira.component', ''); setJiraMetaOverride({ projects: [], issueTypes: [], components: [] }); }
                setJiraTestMode(true);
                jiraTest.mutate();
              }}
              isTestPending={jiraTest.isPending}
            />
          </GridItem>
          <GridItem span={12} md={6}>
            <EmailServerSettings {...sectionProps} emailEnabled={systemInfo.emailEnabled} />
          </GridItem>
          <GridItem span={12} md={6}>
            <PollingSettings {...sectionProps} />
          </GridItem>
          <GridItem span={12} md={6}>
            <JenkinsSettings {...sectionProps} {...tokenHandlers} />
          </GridItem>
          <GridItem span={12} md={6}>
            <LinksSettings {...sectionProps} />
          </GridItem>
          <GridItem span={12}>
            <NotificationSubscriptions />
          </GridItem>
          <GridItem span={12}>
            <ComponentMappings />
          </GridItem>
          <GridItem span={12}>
            <UserManagement />
          </GridItem>
          <GridItem span={12} md={6}>
            <BootstrapAdmin />
          </GridItem>
          <GridItem span={12}>
            <Card>
              <CardTitle>System Information</CardTitle>
              <CardBody>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsLg' }}>
                  <FlexItem><span>Uptime: <strong>{formatUptime(systemInfo.uptime)}</strong></span></FlexItem>
                  <FlexItem><SystemHealth /></FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
