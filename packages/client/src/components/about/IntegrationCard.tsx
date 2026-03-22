import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Label, Content, Flex, FlexItem } from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';

type IntegrationCardProps = {
  name: string;
  icon: React.ReactNode;
  description: string;
  connected: boolean;
  settingsPath?: string;
};

export const IntegrationCard: React.FC<IntegrationCardProps> = ({ name, icon, description, connected, settingsPath }) => {
  const navigate = useNavigate();

  return (
    <Card
      isClickable={!!settingsPath}
      isSelectable={!!settingsPath}
      className="app-about-integration-card"
      onClick={() => settingsPath && navigate(settingsPath)}
    >
      <CardBody>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem className="app-about-integration-icon">{icon}</FlexItem>
              <FlexItem><strong>{name}</strong></FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Content component="small" className="app-text-muted">{description}</Content>
          </FlexItem>
          <FlexItem>
            {connected ? (
              <Label isCompact color="green" icon={<CheckCircleIcon />}>Connected</Label>
            ) : (
              <Label isCompact color="grey" icon={<TimesCircleIcon />}>Not configured</Label>
            )}
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  );
};
