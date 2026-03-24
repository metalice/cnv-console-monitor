import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  List,
  ListItem,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon, ArrowRightIcon } from '@patternfly/react-icons';

export type FeatureItem = {
  title: string;
  description: string;
  path?: string;
  capabilities: string[];
  adminOnly?: boolean;
  aiPowered?: boolean;
  icon?: React.ReactNode;
};

export type FeatureGroupProps = {
  title: string;
  icon: React.ReactNode;
  features: FeatureItem[];
};

export const FeatureGroup: React.FC<FeatureGroupProps> = ({ features, icon, title }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <Card className="app-about-feature-group">
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{icon}</FlexItem>
          <FlexItem>
            <span>{title}</span>
          </FlexItem>
          <FlexItem>
            <Label isCompact color="blue">
              {features.length}
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <ExpandableSection
          isExpanded={expanded}
          toggleContent={
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>{expanded ? <AngleDownIcon /> : <AngleRightIcon />}</FlexItem>
              <FlexItem>{expanded ? 'Show less' : `Show ${features.length} features`}</FlexItem>
            </Flex>
          }
          onToggle={(_e, v) => setExpanded(v)}
        >
          {features.map(f => (
            <div className="app-about-feature-item" key={f.title}>
              <Flex
                alignItems={{ default: 'alignItemsFlexStart' }}
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
              >
                <FlexItem style={{ flex: 1 }}>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    className="app-mb-xs"
                    spaceItems={{ default: 'spaceItemsSm' }}
                  >
                    {f.icon && <FlexItem>{f.icon}</FlexItem>}
                    <FlexItem>
                      <strong>{f.title}</strong>
                    </FlexItem>
                    {f.adminOnly && (
                      <FlexItem>
                        <Label isCompact color="orange">
                          Admin
                        </Label>
                      </FlexItem>
                    )}
                    {f.aiPowered && (
                      <FlexItem>
                        <Label isCompact color="purple">
                          AI
                        </Label>
                      </FlexItem>
                    )}
                  </Flex>
                  <Content className="app-text-muted app-mb-sm" component="small">
                    {f.description}
                  </Content>
                  <List isPlain className="app-about-capability-list">
                    {f.capabilities.map(c => (
                      <ListItem key={c}>
                        <Content component="small">{c}</Content>
                      </ListItem>
                    ))}
                  </List>
                </FlexItem>
                {f.path && (
                  <FlexItem>
                    <Button
                      icon={<ArrowRightIcon />}
                      iconPosition="end"
                      size="sm"
                      variant="link"
                      onClick={() => navigate(f.path!)}
                    >
                      Open
                    </Button>
                  </FlexItem>
                )}
              </Flex>
            </div>
          ))}
        </ExpandableSection>
      </CardBody>
    </Card>
  );
};
