import React, { useState } from 'react';
import {
  Card, CardBody, CardTitle,
  Button, Alert, Flex, FlexItem,
  Content, Gallery, GalleryItem,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSubscriptions,
  createSubscriptionApi,
  updateSubscriptionApi,
  deleteSubscriptionApi,
  testSubscriptionApi,
} from '../../api/subscriptions';
import { useAuth } from '../../context/AuthContext';
import { SubscriptionCard } from './SubscriptionCard';
import { NewSubscriptionForm, type NewRowState } from './NewSubscriptionForm';
import type { Subscription } from '@cnv-monitor/shared';
import type { AlertMessage } from './types';

export const NotificationSubscriptions: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: subs, refetch: refetchSubs } = useQuery({ queryKey: ['subscriptions'], queryFn: fetchSubscriptions });
  const { data: availableComponents } = useQuery({
    queryKey: ['availableComponents'],
    queryFn: () => import('../../api/client').then(mod => mod.apiFetch<string[]>('/launches/components')),
    staleTime: 5 * 60 * 1000,
  });

  const [subTestMessages, setSubTestMessages] = useState<Record<number | string, AlertMessage>>({});
  const [testingSubId, setTestingSubId] = useState<number | string | null>(null);
  const [newRow, setNewRow] = useState<NewRowState | null>(null);
  const [newRowTested, setNewRowTested] = useState(false);
  const [subSaveMsg, setSubSaveMsg] = useState<AlertMessage | null>(null);

  const createSub = useMutation({
    mutationFn: (data: { name: string; components: string[]; slackWebhook: string; jiraWebhook: string; emailRecipients: string[]; schedule: string; enabled: boolean }) =>
      createSubscriptionApi({ ...data, timezone: 'Asia/Jerusalem', slackWebhook: data.slackWebhook || null, jiraWebhook: data.jiraWebhook || null }),
    onSuccess: () => { refetchSubs(); queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); setNewRow(null); setNewRowTested(false); setSubSaveMsg({ type: 'success', text: 'Subscription created successfully.' }); setTimeout(() => setSubSaveMsg(null), 4000); },
    onError: (e) => setSubSaveMsg({ type: 'danger', text: (e as Error).message }),
  });

  const updateSub = useMutation({
    mutationFn: ({ id, data: updateData }: { id: number; data: Partial<Subscription> }) => updateSubscriptionApi(id, updateData),
    onSuccess: () => { refetchSubs(); setSubSaveMsg({ type: 'success', text: 'Subscription updated.' }); setTimeout(() => setSubSaveMsg(null), 4000); },
    onError: (e) => setSubSaveMsg({ type: 'danger', text: (e as Error).message }),
  });

  const deleteSub = useMutation({ mutationFn: (id: number) => deleteSubscriptionApi(id), onSuccess: () => refetchSubs() });

  const testSub = useMutation({
    mutationFn: (id: number) => { setTestingSubId(id); return testSubscriptionApi(id); },
    onSuccess: (result, id) => { setSubTestMessages(prev => ({ ...prev, [id]: { type: 'success', text: result.message } })); setTestingSubId(null); },
    onError: (error, id) => { setSubTestMessages(prev => ({ ...prev, [id]: { type: 'danger', text: (error as Error).message } })); setTestingSubId(null); },
  });

  const testNewRow = useMutation({
    mutationFn: async () => {
      if (!newRow) throw new Error('No new row');
      setTestingSubId('new');
      const temp = await createSubscriptionApi({ name: newRow.name || 'Test', components: [], slackWebhook: newRow.slackWebhook || null, emailRecipients: newRow.emailRecipients ? newRow.emailRecipients.split(',').map(addr => addr.trim()).filter(Boolean) : [], schedule: newRow.schedule || '0 7 * * *', timezone: 'Asia/Jerusalem', enabled: false });
      const result = await testSubscriptionApi(temp.id);
      await deleteSubscriptionApi(temp.id);
      return result;
    },
    onSuccess: (result) => { setSubTestMessages(prev => ({ ...prev, new: { type: 'success', text: result.message } })); setTestingSubId(null); setNewRowTested(true); },
    onError: (error) => { setSubTestMessages(prev => ({ ...prev, new: { type: 'danger', text: (error as Error).message } })); setTestingSubId(null); setNewRowTested(false); },
  });

  const subList = subs || [];

  return (
    <Card>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Notification Subscriptions</FlexItem>
          <FlexItem>
            <Button variant="primary" size="sm" icon={<PlusCircleIcon />} isDisabled={!!newRow} onClick={() => {
              setNewRow({ name: '', components: [], slackWebhook: '', jiraWebhook: '', emailRecipients: '', schedule: '0 7 * * *', enabled: true });
              setNewRowTested(false);
              setSubTestMessages(prev => { const updated = { ...prev }; delete updated['new']; return updated; });
            }}>
              Add
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content component="small" className="app-text-muted app-mb-md">
          Configure where and when to send test reports and Jira bug alerts. Each subscription can target specific components with its own Slack channel, email list, and schedule.
        </Content>

        {subSaveMsg && <Alert variant={subSaveMsg.type} isInline title={subSaveMsg.text} className="app-mb-md" />}

        {newRow && (
          <div className="app-mb-md">
            <NewSubscriptionForm
              newRow={newRow} setNewRow={setNewRow} setNewRowTested={setNewRowTested} newRowTested={newRowTested}
              availableComponents={availableComponents ?? []} testingSubId={testingSubId} subTestMessages={subTestMessages} userEmail={user.email}
              onTest={() => testNewRow.mutate()} onCancel={() => { setNewRow(null); setNewRowTested(false); }} isCreatePending={createSub.isPending}
              onSave={() => createSub.mutate({ name: newRow.name, components: newRow.components, slackWebhook: newRow.slackWebhook, jiraWebhook: newRow.jiraWebhook, emailRecipients: newRow.emailRecipients.split(',').map(addr => addr.trim()).filter(Boolean), schedule: newRow.schedule, enabled: true })}
            />
          </div>
        )}

        {subList.length === 0 && !newRow ? (
          <EmptyState variant="sm">
            <EmptyStateBody>
              No subscriptions yet. Create one to receive daily test reports via Slack, email, or Jira webhook.
            </EmptyStateBody>
            <Button variant="primary" size="sm" icon={<PlusCircleIcon />} onClick={() => {
              setNewRow({ name: '', components: [], slackWebhook: '', jiraWebhook: '', emailRecipients: '', schedule: '0 7 * * *', enabled: true });
              setNewRowTested(false);
            }}>
              Add Subscription
            </Button>
          </EmptyState>
        ) : (
          <Gallery hasGutter minWidths={{ default: '100%', md: '480px' }}>
            {subList.map(sub => (
              <GalleryItem key={sub.id}>
                <SubscriptionCard
                  sub={sub}
                  availableComponents={availableComponents ?? []}
                  testingSubId={testingSubId}
                  subTestMessages={subTestMessages}
                  canEdit={isAdmin || sub.createdBy === user.email}
                  onUpdate={(data) => updateSub.mutate({ id: sub.id, data })}
                  onToggle={(checked) => updateSub.mutate({ id: sub.id, data: { enabled: checked } })}
                  onTest={() => testSub.mutate(sub.id)}
                  onDelete={() => deleteSub.mutate(sub.id)}
                />
              </GalleryItem>
            ))}
          </Gallery>
        )}
      </CardBody>
    </Card>
  );
};
