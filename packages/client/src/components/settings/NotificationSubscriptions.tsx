import React, { useState } from 'react';

import type { Subscription } from '@cnv-monitor/shared';

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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSubscriptionApi,
  deleteSubscriptionApi,
  fetchSubscriptions,
  testSubscriptionApi,
  updateSubscriptionApi,
} from '../../api/subscriptions';
import { useAuth } from '../../context/AuthContext';

import { type NewRowState, NewSubscriptionForm } from './NewSubscriptionForm';
import { SubscriptionCard } from './SubscriptionCard';
import type { AlertMessage } from './types';

export const NotificationSubscriptions: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subs, refetch: refetchSubs } = useQuery({
    queryFn: fetchSubscriptions,
    queryKey: ['subscriptions'],
  });
  const { data: availableComponents } = useQuery({
    queryFn: () =>
      import('../../api/client').then(mod => mod.apiFetch<string[]>('/launches/components')),
    queryKey: ['availableComponents'],
    staleTime: 5 * 60 * 1000,
  });

  const [subTestMessages, setSubTestMessages] = useState<Record<number | string, AlertMessage>>({});
  const [testingSubId, setTestingSubId] = useState<number | string | null>(null);
  const [newRow, setNewRow] = useState<NewRowState | null>(null);
  const [newRowTested, setNewRowTested] = useState(false);
  const [subSaveMsg, setSubSaveMsg] = useState<AlertMessage | null>(null);

  const createSub = useMutation({
    mutationFn: (data: {
      name: string;
      components: string[];
      slackWebhook: string;
      jiraWebhook: string;
      emailRecipients: string[];
      schedule: string;
      enabled: boolean;
      reminderEnabled?: boolean;
      reminderTime?: string;
    }) =>
      createSubscriptionApi({
        ...data,
        jiraWebhook: data.jiraWebhook || null,
        reminderDays: '1,2,3,4,5',
        reminderEnabled: data.reminderEnabled ?? false,
        reminderTime: data.reminderTime ?? '10:00',
        slackWebhook: data.slackWebhook || null,
        timezone: 'Asia/Jerusalem',
      }),
    onError: e => setSubSaveMsg({ text: e.message, type: 'danger' }),
    onSuccess: () => {
      void refetchSubs();
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setNewRow(null);
      setNewRowTested(false);
      setSubSaveMsg({ text: 'Subscription created successfully.', type: 'success' });
      setTimeout(() => setSubSaveMsg(null), 4000);
    },
  });

  const updateSub = useMutation({
    mutationFn: ({ data: updateData, id }: { id: number; data: Partial<Subscription> }) =>
      updateSubscriptionApi(id, updateData),
    onError: e => setSubSaveMsg({ text: e.message, type: 'danger' }),
    onSuccess: () => {
      void refetchSubs();
      setSubSaveMsg({ text: 'Subscription updated.', type: 'success' });
      setTimeout(() => setSubSaveMsg(null), 4000);
    },
  });

  const deleteSub = useMutation({
    mutationFn: (id: number) => deleteSubscriptionApi(id),
    onSuccess: () => {
      void refetchSubs();
    },
  });

  const testSub = useMutation({
    mutationFn: (id: number) => {
      setTestingSubId(id);
      return testSubscriptionApi(id);
    },
    onError: (error, id) => {
      setSubTestMessages(prev => ({
        ...prev,
        [id]: { text: error.message, type: 'danger' },
      }));
      setTestingSubId(null);
    },
    onSuccess: (result, id) => {
      setSubTestMessages(prev => ({ ...prev, [id]: { text: result.message, type: 'success' } }));
      setTestingSubId(null);
    },
  });

  const testNewRow = useMutation({
    mutationFn: async () => {
      if (!newRow) {
        throw new Error('No new row');
      }
      setTestingSubId('new');
      const temp = await createSubscriptionApi({
        components: newRow.components,
        emailRecipients: newRow.emailRecipients
          ? newRow.emailRecipients
              .split(',')
              .map(addr => addr.trim())
              .filter(Boolean)
          : [],
        enabled: false,
        name: newRow.name || 'Test',
        reminderDays: '1,2,3,4,5',
        reminderEnabled: false,
        reminderTime: '10:00',
        schedule: newRow.schedule || '0 7 * * *',
        slackWebhook: newRow.slackWebhook || null,
        timezone: 'Asia/Jerusalem',
      });
      const result = await testSubscriptionApi(temp.id);
      await deleteSubscriptionApi(temp.id);
      return result;
    },
    onError: error => {
      setSubTestMessages(prev => ({
        ...prev,
        new: { text: error.message, type: 'danger' },
      }));
      setTestingSubId(null);
      setNewRowTested(false);
    },
    onSuccess: result => {
      setSubTestMessages(prev => ({ ...prev, new: { text: result.message, type: 'success' } }));
      setTestingSubId(null);
      setNewRowTested(true);
    },
  });

  const subList = subs || [];

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
              isDisabled={Boolean(newRow)}
              size="sm"
              variant="primary"
              onClick={() => {
                setNewRow({
                  components: [],
                  emailRecipients: '',
                  enabled: true,
                  jiraWebhook: '',
                  name: '',
                  reminderEnabled: false,
                  reminderTime: '10:00',
                  schedule: '0 7 * * *',
                  slackWebhook: '',
                });
                setNewRowTested(false);
                setSubTestMessages(prev => {
                  const updated = { ...prev };
                  delete updated.new;
                  return updated;
                });
              }}
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

        {subSaveMsg && (
          <Alert isInline className="app-mb-md" title={subSaveMsg.text} variant={subSaveMsg.type} />
        )}

        {newRow && (
          <div className="app-mb-md">
            <NewSubscriptionForm
              availableComponents={availableComponents ?? []}
              isCreatePending={createSub.isPending}
              newRow={newRow}
              newRowTested={newRowTested}
              setNewRow={setNewRow}
              setNewRowTested={setNewRowTested}
              subTestMessages={subTestMessages}
              testingSubId={testingSubId}
              userEmail={user.email}
              onCancel={() => {
                setNewRow(null);
                setNewRowTested(false);
              }}
              onSave={() =>
                createSub.mutate({
                  components: newRow.components,
                  emailRecipients: newRow.emailRecipients
                    .split(',')
                    .map(addr => addr.trim())
                    .filter(Boolean),
                  enabled: true,
                  jiraWebhook: newRow.jiraWebhook,
                  name: newRow.name,
                  reminderEnabled: newRow.reminderEnabled,
                  reminderTime: newRow.reminderTime,
                  schedule: newRow.schedule,
                  slackWebhook: newRow.slackWebhook,
                })
              }
              onTest={() => testNewRow.mutate()}
            />
          </div>
        )}

        {subList.length === 0 && !newRow ? (
          <EmptyState variant="sm">
            <EmptyStateBody>
              No subscriptions yet. Create one to receive daily test reports via Slack, email, or
              Jira webhook.
            </EmptyStateBody>
            <Button
              icon={<PlusCircleIcon />}
              size="sm"
              variant="primary"
              onClick={() => {
                setNewRow({
                  components: [],
                  emailRecipients: '',
                  enabled: true,
                  jiraWebhook: '',
                  name: '',
                  reminderEnabled: false,
                  reminderTime: '10:00',
                  schedule: '0 7 * * *',
                  slackWebhook: '',
                });
                setNewRowTested(false);
              }}
            >
              Add Subscription
            </Button>
          </EmptyState>
        ) : (
          <Gallery hasGutter minWidths={{ default: '100%', md: '480px' }}>
            {subList.map(sub => (
              <GalleryItem key={sub.id}>
                <SubscriptionCard
                  availableComponents={availableComponents ?? []}
                  canEdit={isAdmin || sub.createdBy === user.email}
                  sub={sub}
                  subTestMessages={subTestMessages}
                  testingSubId={testingSubId}
                  onDelete={() => deleteSub.mutate(sub.id)}
                  onTest={() => testSub.mutate(sub.id)}
                  onToggle={checked => updateSub.mutate({ data: { enabled: checked }, id: sub.id })}
                  onUpdate={data => updateSub.mutate({ data, id: sub.id })}
                />
              </GalleryItem>
            ))}
          </Gallery>
        )}
      </CardBody>
    </Card>
  );
};
