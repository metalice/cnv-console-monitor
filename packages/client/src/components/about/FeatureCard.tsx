import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardBody, CardTitle,
  Button, ExpandableSection,
  Flex, FlexItem, Label, Content, List, ListItem,
} from '@patternfly/react-core';
import { ArrowRightIcon, AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons';

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

export const FeatureGroup: React.FC<FeatureGroupProps> = ({ title, icon, features }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <Card className="app-about-feature-group">
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{icon}</FlexItem>
          <FlexItem><span>{title}</span></FlexItem>
          <FlexItem><Label isCompact color="blue">{features.length}</Label></FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <ExpandableSection
          toggleContent={
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>{expanded ? <AngleDownIcon /> : <AngleRightIcon />}</FlexItem>
              <FlexItem>{expanded ? 'Show less' : `Show ${features.length} features`}</FlexItem>
            </Flex>
          }
          isExpanded={expanded}
          onToggle={(_e, v) => setExpanded(v)}
        >
          {features.map((f) => (
            <div key={f.title} className="app-about-feature-item">
              <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsFlexStart' }}>
                <FlexItem style={{ flex: 1 }}>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }} className="app-mb-xs">
                    {f.icon && <FlexItem>{f.icon}</FlexItem>}
                    <FlexItem><strong>{f.title}</strong></FlexItem>
                    {f.adminOnly && <FlexItem><Label isCompact color="orange">Admin</Label></FlexItem>}
                    {f.aiPowered && <FlexItem><Label isCompact color="purple">AI</Label></FlexItem>}
                  </Flex>
                  <Content component="small" className="app-text-muted app-mb-sm">{f.description}</Content>
                  <List isPlain className="app-about-capability-list">
                    {f.capabilities.map((c) => (
                      <ListItem key={c}><Content component="small">{c}</Content></ListItem>
                    ))}
                  </List>
                </FlexItem>
                {f.path && (
                  <FlexItem>
                    <Button variant="link" size="sm" icon={<ArrowRightIcon />} iconPosition="end" onClick={() => navigate(f.path!)}>
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
