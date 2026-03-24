import React from 'react';

import { Flex, FlexItem, Label, Spinner, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../api/client';

type HealthCheck = { status: 'up' | 'down'; message: string };

const SERVICES = [
  { key: 'reportportal', label: 'ReportPortal' },
  { key: 'jira', label: 'Jira' },
];

export const SystemHealth: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryFn: () => apiFetch<Record<string, HealthCheck>>('/settings/health'),
    queryKey: ['systemHealth'],
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  if (isLoading || !data) {
    return <Spinner aria-label="Checking services" size="md" />;
  }

  return (
    <Flex spaceItems={{ default: 'spaceItemsMd' }}>
      {SERVICES.map(({ key, label }) => {
        const check = data[key];
        if (!check) {
          return null;
        }
        return (
          <FlexItem key={key}>
            <Tooltip content={check.message}>
              <Label
                color={check.status === 'up' ? 'green' : 'red'}
                icon={check.status === 'up' ? <CheckCircleIcon /> : <ExclamationCircleIcon />}
              >
                {label}: {check.status === 'up' ? 'Online' : 'Offline'}
              </Label>
            </Tooltip>
          </FlexItem>
        );
      })}
    </Flex>
  );
};
