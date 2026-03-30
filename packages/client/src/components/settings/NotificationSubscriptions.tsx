import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

import { useAuth } from '../../context/AuthContext';

import { NewSubscriptionForm } from './NewSubscriptionForm';
import { SubscriptionCard } from './SubscriptionCard';
import { useSubscriptions } from './useSubscriptions';

export const NotificationSubscriptions = () => {
  const { isAdmin, user } = useAuth();
  const subs = useSubscriptions();

  return (
    <Card>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>Notification Subscriptions</FlexItem>
          <FlexItem>
            <Button
              icon={<PlusCircleIcon />}
              isDisabled={Boolean(subs.newRow)}
              size="sm"
              variant="primary"
              onClick={subs.initNewRow}
            >
              Add
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content className="app-text-muted app-mb-md" component="small">
          Configure where and when to send test reports and Jira bug alerts. Each subscription can
          target specific components with its own Slack channel, email list, and schedule.
        </Content>

        {subs.subSaveMsg && (
          <Alert
            isInline
            className="app-mb-md"
            title={subs.subSaveMsg.text}
            variant={subs.subSaveMsg.type}
          />
        )}

        {subs.newRow && (
          <div className="app-mb-md">
            <NewSubscriptionForm
              availableComponents={subs.availableComponents}
              isCreatePending={subs.createSub.isPending}
              newRow={subs.newRow}
              newRowTested={subs.newRowTested}
              setNewRow={subs.setNewRow}
              setNewRowTested={subs.setNewRowTested}
              subTestMessages={subs.subTestMessages}
              testingSubId={subs.testingSubId}
              userEmail={user.email}
              onCancel={() => {
                subs.setNewRow(null);
                subs.setNewRowTested(false);
              }}
              onSave={() => {
                const row = subs.newRow;
                if (!row) return;
                subs.createSub.mutate({
                  components: row.components,
                  emailRecipients: row.emailRecipients
                    .split(',')
                    .map(addr => addr.trim())
                    .filter(Boolean),
                  enabled: true,
                  jiraWebhook: row.jiraWebhook,
                  name: row.name,
                  reminderEnabled: row.reminderEnabled,
                  reminderTime: row.reminderTime,
                  schedule: row.schedule,
                  slackWebhook: row.slackWebhook,
                });
              }}
              onTest={() => subs.testNewRow.mutate()}
            />
          </div>
        )}

        {subs.subList.length === 0 && !subs.newRow ? (
          <EmptyState variant="sm">
            <EmptyStateBody>
              No subscriptions yet. Create one to receive daily test reports via Slack, email, or
              Jira webhook.
            </EmptyStateBody>
            <Button icon={<PlusCircleIcon />} size="sm" variant="primary" onClick={subs.initNewRow}>
              Add Subscription
            </Button>
          </EmptyState>
        ) : (
          <Gallery hasGutter minWidths={{ default: '100%', md: '480px' }}>
            {subs.subList.map(sub => (
              <GalleryItem key={sub.id}>
                <SubscriptionCard
                  availableComponents={subs.availableComponents}
                  canEdit={isAdmin || sub.createdBy === user.email}
                  sub={sub}
                  subTestMessages={subs.subTestMessages}
                  testingSubId={subs.testingSubId}
                  onDelete={() => subs.deleteSub.mutate(sub.id)}
                  onTest={() => subs.testSub.mutate(sub.id)}
                  onToggle={checked =>
                    subs.updateSub.mutate({ data: { enabled: checked }, id: sub.id })
                  }
                  onUpdate={data => subs.updateSub.mutate({ data, id: sub.id })}
                />
              </GalleryItem>
            ))}
          </Gallery>
        )}
      </CardBody>
    </Card>
  );
};
