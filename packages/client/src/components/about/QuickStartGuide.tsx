import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  CardBody,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
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

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  defaultExpanded,
  icon,
  steps,
  title,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const navigate = useNavigate();

  return (
    <Card className="app-about-quickstart">
      <CardBody>
        <ExpandableSection
          isExpanded={expanded}
          toggleContent={
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>{icon}</FlexItem>
              <FlexItem>
                <strong>{title}</strong>
              </FlexItem>
              <FlexItem>
                <Label isCompact color="blue">
                  {steps.length} steps
                </Label>
              </FlexItem>
            </Flex>
          }
          onToggle={(_e, v) => setExpanded(v)}
        >
          <div className="app-about-steps">
            {steps.map((step, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div className="app-about-step" key={i}>
                <Flex
                  alignItems={{ default: 'alignItemsFlexStart' }}
                  spaceItems={{ default: 'spaceItemsMd' }}
                >
                  <FlexItem>
                    <span className="app-about-step-number">{i + 1}</span>
                  </FlexItem>
                  <FlexItem style={{ flex: 1 }}>
                    <Content className="app-mb-none" component="p">
                      <strong>{step.title}</strong>
                    </Content>
                    <Content className="app-text-muted" component="small">
                      {step.description}
                    </Content>
                    {step.link && (
                      <div className="app-mt-xs">
                        <Button
                          icon={<ArrowRightIcon />}
                          iconPosition="end"
                          size="sm"
                          variant="link"
                          onClick={() => navigate(step.link?.path ?? '')}
                        >
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
