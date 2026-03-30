import { Button, Card, CardBody, CardTitle, Content, Flex, FlexItem } from '@patternfly/react-core';

export const NotificationPreview = () => (
  <Card className="app-mb-lg">
    <CardTitle>Notification Preview</CardTitle>
    <CardBody>
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
    </CardBody>
  </Card>
);
