import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Button,
  Alert,
  Flex,
  FlexItem,
  Content,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody } from '@patternfly/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSubscriptions,
  createSubscriptionApi,
  updateSubscriptionApi,
  deleteSubscriptionApi,
  testSubscriptionApi,
} from '../../api/subscriptions';
import { useAuth } from '../../context/AuthContext';
import { SubscriptionRow } from './SubscriptionRows';
import { NewSubscriptionRow, type NewRowState } from './NewSubscriptionRow';
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
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [kebabOpenId, setKebabOpenId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Subscription>>({});
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
    onSuccess: () => { refetchSubs(); setEditingSubId(null); setEditDraft({}); setSubSaveMsg({ type: 'success', text: 'Subscription updated successfully.' }); setTimeout(() => setSubSaveMsg(null), 4000); },
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
        <Alert variant="info" isInline isPlain className="app-mb-md" title="How to set up webhooks">
          <Content component="small">
            <strong>Slack Webhook:</strong> Go to api.slack.com/apps &gt; Create New App &gt; From scratch &gt; Incoming Webhooks &gt; Activate &gt; Add New Webhook to Workspace &gt; Select channel &gt; Copy URL.
            <br /><strong>Jira Webhook:</strong> Same as Slack — create a separate webhook for the channel where you want Jira bug creation alerts.
            <br /><strong>Email:</strong> Comma-separated addresses. Uses the SMTP server configured above.
            <br /><strong>Test:</strong> Click Test on a new row to verify delivery before saving. Save is only enabled after a successful test.
          </Content>
        </Alert>
        {subSaveMsg && <Alert variant={subSaveMsg.type} isInline title={subSaveMsg.text} className="app-mb-md" />}
        <div className="app-table-scroll app-table-wide">
          <Table aria-label="Notification subscriptions" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th><Th>Components</Th><Th>Slack Webhook</Th><Th>Jira Webhook</Th><Th>Email Recipients</Th><Th>Schedule</Th>
                <Th className="app-min-w-80">Enabled</Th><Th className="app-min-w-80">Owner</Th><Th className="app-min-w-100">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(subs || []).map(sub => (
                <SubscriptionRow
                  key={sub.id} sub={sub} isEditing={editingSubId === sub.id} editDraft={editDraft} setEditDraft={setEditDraft}
                  availableComponents={availableComponents ?? []} kebabOpenId={kebabOpenId} setKebabOpenId={setKebabOpenId}
                  testingSubId={testingSubId} subTestMessages={subTestMessages} canEdit={isAdmin || sub.createdBy === user.email}
                  onEdit={() => { setEditingSubId(sub.id); setEditDraft({}); }} onCancelEdit={() => { setEditingSubId(null); setEditDraft({}); }}
                  onSave={() => updateSub.mutate({ id: sub.id, data: editDraft })} onToggle={(checked) => updateSub.mutate({ id: sub.id, data: { enabled: checked } })}
                  onTest={() => testSub.mutate(sub.id)} onDelete={() => deleteSub.mutate(sub.id)}
                />
              ))}
              {newRow && (
                <NewSubscriptionRow
                  newRow={newRow} setNewRow={setNewRow} setNewRowTested={setNewRowTested} newRowTested={newRowTested}
                  availableComponents={availableComponents ?? []} testingSubId={testingSubId} subTestMessages={subTestMessages} userEmail={user.email}
                  onTest={() => testNewRow.mutate()} onCancel={() => { setNewRow(null); setNewRowTested(false); }} isCreatePending={createSub.isPending}
                  onSave={() => createSub.mutate({ name: newRow.name, components: newRow.components, slackWebhook: newRow.slackWebhook, jiraWebhook: newRow.jiraWebhook, emailRecipients: newRow.emailRecipients.split(',').map(addr => addr.trim()).filter(Boolean), schedule: newRow.schedule, enabled: true })}
                />
              )}
            </Tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};
