import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';

export const NotificationPreview = () => (
  <Card className="app-mb-lg">
    <CardTitle>Notification Preview</CardTitle>
    <CardBody>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h4">Daily Report</Title>
          <Content className="app-text-muted app-mb-md" component="small">
            Preview what the daily Slack or email notification looks like using the latest data.
          </Content>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open('/api/notifications/preview/email', '_blank')}
              >
                Preview Email
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open('/api/notifications/preview/slack', '_blank')}
              >
                Preview Slack JSON
              </Button>
            </FlexItem>
          </Flex>
        </StackItem>
        <StackItem>
          <Title headingLevel="h4">Team Report</Title>
          <Content className="app-text-muted app-mb-md" component="small">
            Preview the team report Slack or email notification using the current week&apos;s data.
          </Content>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open('/api/notifications/preview/report-email', '_blank')}
              >
                Preview Team Report Email
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open('/api/notifications/preview/report-slack', '_blank')}
              >
                Preview Team Report Slack JSON
              </Button>
            </FlexItem>
          </Flex>
        </StackItem>
      </Stack>
    </CardBody>
  </Card>
);
