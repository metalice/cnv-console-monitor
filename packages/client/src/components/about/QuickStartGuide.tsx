import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardBody, CardTitle, Button,
  ExpandableSection, Content, Flex, FlexItem, Label,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';

type GuideStep = {
  title: string;
  description: string;
  link?: { label: string; path: string };
};

type QuickStartGuideProps = {
  title: string;
  icon: React.ReactNode;
  steps: GuideStep[];
  defaultExpanded?: boolean;
};

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ title, icon, steps, defaultExpanded }) => {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const navigate = useNavigate();

  return (
    <Card className="app-about-quickstart">
      <CardBody>
        <ExpandableSection
          toggleContent={
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>{icon}</FlexItem>
              <FlexItem><strong>{title}</strong></FlexItem>
              <FlexItem><Label isCompact color="blue">{steps.length} steps</Label></FlexItem>
            </Flex>
          }
          isExpanded={expanded}
          onToggle={(_e, v) => setExpanded(v)}
        >
          <div className="app-about-steps">
            {steps.map((step, i) => (
              <div key={i} className="app-about-step">
                <Flex alignItems={{ default: 'alignItemsFlexStart' }} spaceItems={{ default: 'spaceItemsMd' }}>
                  <FlexItem>
                    <span className="app-about-step-number">{i + 1}</span>
                  </FlexItem>
                  <FlexItem style={{ flex: 1 }}>
                    <Content component="p" className="app-mb-none"><strong>{step.title}</strong></Content>
                    <Content component="small" className="app-text-muted">{step.description}</Content>
                    {step.link && (
                      <div className="app-mt-xs">
                        <Button variant="link" size="sm" icon={<ArrowRightIcon />} iconPosition="end" onClick={() => navigate(step.link!.path)}>
                          {step.link.label}
                        </Button>
                      </div>
                    )}
                  </FlexItem>
                </Flex>
              </div>
            ))}
          </div>
        </ExpandableSection>
      </CardBody>
    </Card>
  );
};
