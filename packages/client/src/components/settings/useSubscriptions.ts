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

  const [subTestMessages, setSubTestMessages] = useState<Record<number | string, AlertMessage[]>>(
    {},
  );
  const [testingSubId, setTestingSubId] = useState<number | string | null>(null);
  const [newRow, setNewRow] = useState<NewRowState | null>(null);
  const [newRowTested, setNewRowTested] = useState(false);
  const [subSaveMsg, setSubSaveMsg] = useState<AlertMessage | null>(null);

  const createSub = useMutation({
    mutationFn: (data: {
      name: string;
      type?: 'test' | 'team_report';
      components: string[];
      slackWebhook: string;
      jiraWebhook: string;
      emailRecipients: string[];
      schedule: string;
      enabled: boolean;
      reminderEnabled?: boolean;
      reminderTime?: string;
      teamReportSlackWebhook?: string | null;
      teamReportEmailRecipients?: string[];
      teamReportSchedule?: string | null;
    }) =>
      createSubscriptionApi({
        ...data,
        jiraWebhook: data.jiraWebhook || null,
        reminderDays: '1,2,3,4,5',
        reminderEnabled: data.reminderEnabled ?? false,
        reminderTime: data.reminderTime ?? '10:00',
        slackWebhook: data.slackWebhook || null,
        teamReportEmailRecipients: data.teamReportEmailRecipients ?? [],
        teamReportSchedule: data.teamReportSchedule ?? null,
        teamReportSlackWebhook: data.teamReportSlackWebhook ?? null,
        timezone: 'Asia/Jerusalem',
        type: data.type ?? 'test',
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
      setSubTestMessages(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      return testSubscriptionApi(id);
    },
    onError: (error, id) => {
      setSubTestMessages(prev => ({
        ...prev,
        [id]: [{ text: error.message, type: 'danger' }],
      }));
      setTestingSubId(null);
    },
    onSuccess: (result, id) => {
      const alerts: AlertMessage[] = result.results.map(msg => ({
        text: msg,
        type: msg.toLowerCase().includes('failed') ? 'danger' : 'success',
      }));
      setSubTestMessages(prev => ({ ...prev, [id]: alerts }));
      setTestingSubId(null);
    },
  });

  const testNewRow = useMutation({
    mutationFn: async () => {
      if (!newRow) {
        throw new Error('No new row');
      }
      setTestingSubId('new');
      setSubTestMessages(prev => {
        const { new: _, ...rest } = prev;
        return rest;
      });
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
        teamReportEmailRecipients: newRow.teamReportEmailRecipients
          ? newRow.teamReportEmailRecipients
              .split(',')
              .map(addr => addr.trim())
              .filter(Boolean)
          : [],
        teamReportSchedule: newRow.teamReportSchedule || null,
        teamReportSlackWebhook: newRow.teamReportSlackWebhook || null,
        timezone: 'Asia/Jerusalem',
        type: newRow.type,
      });
      const result = await testSubscriptionApi(temp.id);
      await deleteSubscriptionApi(temp.id);
      return result;
    },
    onError: error => {
      setSubTestMessages(prev => ({
        ...prev,
        new: [{ text: error.message, type: 'danger' }],
      }));
      setTestingSubId(null);
      setNewRowTested(false);
    },
    onSuccess: result => {
      const alerts: AlertMessage[] = result.results.map(msg => ({
        text: msg,
        type: msg.toLowerCase().includes('failed') ? 'danger' : 'success',
      }));
      setSubTestMessages(prev => ({ ...prev, new: alerts }));
      setTestingSubId(null);
      setNewRowTested(result.success);
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
      teamReportEmailRecipients: '',
      teamReportSchedule: '',
      teamReportSlackWebhook: '',
      type: 'test',
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
