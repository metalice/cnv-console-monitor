import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, CardBody, Content, Flex, FlexItem, Label } from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';

type IntegrationCardProps = {
  name: string;
  icon: React.ReactNode;
  description: string;
  connected: boolean;
  settingsPath?: string;
};

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  connected,
  description,
  icon,
  name,
  settingsPath,
}) => {
  const navigate = useNavigate();

  return (
    <Card
      className="app-about-integration-card"
      isClickable={Boolean(settingsPath)}
      isSelectable={Boolean(settingsPath)}
      onClick={() => settingsPath && navigate(settingsPath)}
    >
      <CardBody>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem className="app-about-integration-icon">{icon}</FlexItem>
              <FlexItem>
                <strong>{name}</strong>
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Content className="app-text-muted" component="small">
              {description}
            </Content>
          </FlexItem>
          <FlexItem>
            {connected ? (
              <Label isCompact color="green" icon={<CheckCircleIcon />}>
                Connected
              </Label>
            ) : (
              <Label isCompact color="grey" icon={<TimesCircleIcon />}>
                Not configured
              </Label>
            )}
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  );
};
