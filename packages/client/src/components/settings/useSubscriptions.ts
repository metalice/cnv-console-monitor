import { useState } from 'react';

import { type Subscription } from '@cnv-monitor/shared';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSubscriptionApi,
  deleteSubscriptionApi,
  fetchSubscriptions,
  testSubscriptionApi,
  updateSubscriptionApi,
} from '../../api/subscriptions';

import type { NewRowState } from './NewSubscriptionForm';
import type { AlertMessage } from './types';

export const useSubscriptions = () => {
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
      setSubTestMessages(prev => ({ ...prev, [id]: { text: error.message, type: 'danger' } }));
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
      setSubTestMessages(prev => ({ ...prev, new: { text: error.message, type: 'danger' } }));
      setTestingSubId(null);
      setNewRowTested(false);
    },
    onSuccess: result => {
      setSubTestMessages(prev => ({ ...prev, new: { text: result.message, type: 'success' } }));
      setTestingSubId(null);
      setNewRowTested(true);
    },
  });

  const initNewRow = () => {
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
  };

  return {
    availableComponents: availableComponents ?? [],
    createSub,
    deleteSub,
    initNewRow,
    newRow,
    newRowTested,
    setNewRow,
    setNewRowTested,
    subList: subs ?? [],
    subSaveMsg,
    subTestMessages,
    testingSubId,
    testNewRow,
    testSub,
    updateSub,
  };
};
