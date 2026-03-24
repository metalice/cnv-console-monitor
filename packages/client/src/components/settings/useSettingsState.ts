import { useCallback, useEffect, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { JiraMeta } from '../../api/settings';
import {
  fetchJiraMeta,
  fetchRpProjects,
  fetchSettings,
  testJiraConnection,
  testRpConnection,
  updateSettings,
} from '../../api/settings';
import { useAuth } from '../../context/AuthContext';

import type { AlertMessage } from './types';
import { isMaskedValue } from './types';
import { resolveJiraMeta, resolveRpProjectOptions } from './useSettingsMeta';

export const useSettingsState = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryFn: fetchSettings, queryKey: ['settings'] });
  const { data: rpProjects } = useQuery({
    queryFn: fetchRpProjects,
    queryKey: ['rpProjects'],
    staleTime: 5 * 60 * 1000,
  });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<AlertMessage | null>(null);
  const [rpTestMsg, setRpTestMsg] = useState<AlertMessage | null>(null);
  const [jiraTestMsg, setJiraTestMsg] = useState<AlertMessage | null>(null);
  const [tokenEditing, setTokenEditing] = useState<Record<string, boolean>>({});
  const [rpProjectsOverride, setRpProjectsOverride] = useState<string[] | null>(null);
  const [jiraMetaOverride, setJiraMetaOverride] = useState<JiraMeta | null>(null);
  const [jiraTestMode, setJiraTestMode] = useState(false);

  const val = (key: string): string => draft[key] ?? data?.settings[key]?.value ?? '';
  const set = useCallback(
    (key: string, value: string): void => {
      if (!isAdmin) {
        return;
      }
      setDraft(prev => ({ ...prev, [key]: value }));
    },
    [isAdmin],
  );
  const isDirty = (key: string): boolean =>
    data?.settings[key] !== undefined && draft[key] !== data.settings[key].value;
  const hasChanges = (): boolean => (data ? Object.keys(draft).some(k => isDirty(k)) : false);

  const jiraProject = draft['jira.projectKey'] ?? data?.settings['jira.projectKey']?.value ?? '';
  const jiraTokenDirty = isDirty('jira.token') || tokenEditing['jira.token'];
  const prevJiraProjectRef = useRef('');

  const { data: jiraMeta } = useQuery({
    enabled: Boolean(jiraProject) && !jiraTokenDirty,
    queryFn: () => fetchJiraMeta(jiraProject),
    queryKey: ['jiraMeta', jiraProject],
    staleTime: 5 * 60 * 1000,
  });
  const { data: jiraMetaDraft } = useQuery({
    enabled: jiraTestMode && jiraTokenDirty && Boolean(jiraProject) && Boolean(val('jira.token')),
    queryFn: () =>
      testJiraConnection({
        projectKey: jiraProject,
        token: val('jira.token'),
        url: val('jira.url'),
      }),
    queryKey: ['jiraMetaDraft', jiraProject, val('jira.url'), val('jira.token')],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data?.settings) {
      const initial: Record<string, string> = {};
      for (const [key, entry] of Object.entries(data.settings)) {
        initial[key] = entry.value;
      }
      setDraft(initial);
      setTokenEditing({});
      setRpProjectsOverride(null);
      setJiraMetaOverride(null);
      setJiraTestMode(false);
      prevJiraProjectRef.current = initial['jira.projectKey'] ?? '';
    }
  }, [data]);

  useEffect(() => {
    const prevProject = prevJiraProjectRef.current;
    if (jiraProject && prevProject && jiraProject !== prevProject) {
      set('jira.component', '');
    }
    prevJiraProjectRef.current = jiraProject;
  }, [jiraProject, set]);

  useEffect(() => {
    if (jiraTestMode && jiraTokenDirty && jiraProject) {
      setJiraMetaOverride(null);
    }
  }, [jiraProject, jiraTestMode, jiraTokenDirty]);

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, string>) => updateSettings(patch),
    onError: err => setSaveMessage({ text: err.message, type: 'danger' }),
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      void queryClient.invalidateQueries({ queryKey: ['config'] });
      if (result.updated.some(key => key.startsWith('reportportal.'))) {
        void queryClient.invalidateQueries({ queryKey: ['rpProjects'] });
      }
      if (result.updated.some(key => key.startsWith('jira.'))) {
        void queryClient.invalidateQueries({ queryKey: ['jiraMeta'] });
      }
      setSaveMessage({ text: `Saved: ${result.updated.join(', ')}`, type: 'success' });
      setTimeout(() => setSaveMessage(null), 4000);
    },
  });

  const rpTest = useMutation({
    mutationFn: async () => {
      const rpTokenValue = val('reportportal.token');
      const rpTokenProvided =
        isDirty('reportportal.token') ||
        tokenEditing['reportportal.token'] ||
        !isMaskedValue(rpTokenValue);
      return testRpConnection({
        project: val('reportportal.project'),
        token: rpTokenProvided ? rpTokenValue : undefined,
        url: val('reportportal.url'),
      });
    },
    onError: error => setRpTestMsg({ text: error.message, type: 'danger' }),
    onSuccess: result => {
      setRpTestMsg({ text: result.message, type: 'success' });
      setRpProjectsOverride(result.projects ?? []);
    },
  });

  const jiraTest = useMutation({
    mutationFn: async () => {
      const jiraTokenValue = val('jira.token');
      const jiraTokenProvided =
        isDirty('jira.token') || tokenEditing['jira.token'] || !isMaskedValue(jiraTokenValue);
      return testJiraConnection({
        projectKey: val('jira.projectKey'),
        token: jiraTokenProvided ? jiraTokenValue : undefined,
        url: val('jira.url'),
      });
    },
    onError: error => setJiraTestMsg({ text: error.message, type: 'danger' }),
    onSuccess: result => {
      setJiraTestMsg({ text: result.message, type: 'success' });
      setJiraMetaOverride({
        components: result.components ?? [],
        issueTypes: result.issueTypes ?? [],
        projects: result.projects ?? [],
      });
      if (!val('jira.issueType')) {
        const bugType = (result.issueTypes || []).find(type => type.toLowerCase() === 'bug');
        if (bugType || result.issueTypes?.[0]) {
          set('jira.issueType', bugType || result.issueTypes![0]);
        }
      }
    },
  });

  const startTokenEdit = (key: string): void => {
    if (!tokenEditing[key] && isMaskedValue(val(key))) {
      set(key, '');
    }
    setTokenEditing(prev => ({ ...prev, [key]: true }));
  };
  const endTokenEdit = (key: string): void => {
    if (!tokenEditing[key]) {
      return;
    }
    if (val(key).trim() === '') {
      set(key, data?.settings[key]?.value ?? '');
      setTokenEditing(prev => ({ ...prev, [key]: false }));
    }
  };
  const saveAll = (): void => {
    if (!data) {
      return;
    }
    const changed: Record<string, string> = {};
    for (const key of Object.keys(draft)) {
      if (isDirty(key)) {
        changed[key] = draft[key];
      }
    }
    if (Object.keys(changed).length > 0) {
      saveMutation.mutate(changed);
    }
  };

  const rpProjectOptions = resolveRpProjectOptions(
    rpProjectsOverride,
    rpProjects,
    val('reportportal.project'),
  );
  const { issueTypeSelectOptions, jiraProjectSelectOptions } = resolveJiraMeta(
    jiraMeta,
    jiraMetaDraft,
    jiraMetaOverride,
    jiraTokenDirty,
    jiraTestMode,
  );

  return {
    adminOnly: !isAdmin,
    data,
    endTokenEdit,
    hasChanges,
    isAdmin,
    isLoading,
    issueTypeSelectOptions,
    jiraProjectSelectOptions,
    jiraTest,
    jiraTestMsg,
    jiraTokenDirty,
    rpProjectOptions,
    rpTest,
    rpTestMsg,
    saveAll,
    saveMessage,
    saveMutation,
    set,
    setJiraMetaOverride,
    setJiraTestMode,
    setJiraTestMsg,
    startTokenEdit,
    tokenEditing,
    val,
  };
};
