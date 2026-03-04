import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
} from '@patternfly/react-core';
import { apiFetch } from '../api/client';
import type { PublicConfig } from '@cnv-monitor/shared';

export const SettingsPage: React.FC = () => {
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  return (
    <>
      <PageSection variant="light">
        <Content component="h1">Settings</Content>
        <Content component="small">Monitor configuration (read-only)</Content>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            {config ? (
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>ReportPortal URL</DescriptionListTerm>
                  <DescriptionListDescription>
                    <a href={config.reportportalUrl} target="_blank" rel="noreferrer">{config.reportportalUrl}</a>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Project</DescriptionListTerm>
                  <DescriptionListDescription>{config.reportportalProject}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Launch Filter</DescriptionListTerm>
                  <DescriptionListDescription><code>{config.launchFilter}</code></DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Jira Integration</DescriptionListTerm>
                  <DescriptionListDescription>
                    {config.jiraEnabled ? (
                      <>
                        <Label color="green" isCompact>Enabled</Label>{' '}
                        <a href={config.jiraUrl} target="_blank" rel="noreferrer">{config.jiraUrl}</a>{' '}
                        (Project: {config.jiraProjectKey})
                      </>
                    ) : (
                      <Label color="grey" isCompact>Disabled</Label>
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            ) : (
              <Content>Loading configuration...</Content>
            )}
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
};
