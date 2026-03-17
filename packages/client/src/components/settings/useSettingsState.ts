import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSettings, updateSettings, fetchRpProjects, testRpConnection, testJiraConnection, fetchJiraMeta } from '../../api/settings';
import { useAuth } from '../../context/AuthContext';
import { isMaskedValue } from './types';
import type { AlertMessage } from './types';
import type { JiraMeta } from '../../api/settings';
import { resolveJiraMeta, resolveRpProjectOptions } from './useSettingsMeta';

export const useSettingsState = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const { data: rpProjects } = useQuery({ queryKey: ['rpProjects'], queryFn: fetchRpProjects, staleTime: 5 * 60 * 1000 });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<AlertMessage | null>(null);
  const [rpTestMsg, setRpTestMsg] = useState<AlertMessage | null>(null);
  const [jiraTestMsg, setJiraTestMsg] = useState<AlertMessage | null>(null);
  const [tokenEditing, setTokenEditing] = useState<Record<string, boolean>>({});
  const [rpProjectsOverride, setRpProjectsOverride] = useState<string[] | null>(null);
  const [jiraMetaOverride, setJiraMetaOverride] = useState<JiraMeta | null>(null);
  const [jiraTestMode, setJiraTestMode] = useState(false);

  const val = (key: string): string => draft[key] ?? data?.settings[key]?.value ?? '';
  const set = (key: string, value: string): void => { if (!isAdmin) return; setDraft(prev => ({ ...prev, [key]: value })); };
  const isDirty = (key: string): boolean => data?.settings[key] !== undefined && draft[key] !== data.settings[key].value;
  const hasChanges = (): boolean => data ? Object.keys(draft).some(k => isDirty(k)) : false;

  const jiraProject = draft['jira.projectKey'] ?? data?.settings['jira.projectKey']?.value ?? '';
  const jiraTokenDirty = isDirty('jira.token') || tokenEditing['jira.token'];
  const prevJiraProjectRef = useRef<string>('');

  const { data: jiraMeta } = useQuery({
    queryKey: ['jiraMeta', jiraProject],
    queryFn: () => fetchJiraMeta(jiraProject),
    staleTime: 5 * 60 * 1000,
    enabled: !!jiraProject && !jiraTokenDirty,
  });
  const { data: jiraMetaDraft } = useQuery({
    queryKey: ['jiraMetaDraft', jiraProject, val('jira.url'), val('jira.token')],
    queryFn: () => testJiraConnection({ url: val('jira.url'), projectKey: jiraProject, token: val('jira.token') }),
    staleTime: 5 * 60 * 1000,
    enabled: jiraTestMode && jiraTokenDirty && !!jiraProject && !!val('jira.token'),
    retry: false,
  });

  useEffect(() => {
    if (data?.settings) {
      const initial: Record<string, string> = {};
      for (const [key, entry] of Object.entries(data.settings)) initial[key] = entry.value;
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
    if (jiraProject && prevProject && jiraProject !== prevProject) set('jira.component', '');
    prevJiraProjectRef.current = jiraProject;
  }, [jiraProject]);

  useEffect(() => {
    if (jiraTestMode && jiraTokenDirty && jiraProject) setJiraMetaOverride(null);
  }, [jiraProject, jiraTestMode, jiraTokenDirty]);

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, string>) => updateSettings(patch),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['config'] });
      if (result.updated.some(key => key.startsWith('reportportal.'))) queryClient.invalidateQueries({ queryKey: ['rpProjects'] });
      if (result.updated.some(key => key.startsWith('jira.'))) queryClient.invalidateQueries({ queryKey: ['jiraMeta'] });
      setSaveMessage({ type: 'success', text: `Saved: ${result.updated.join(', ')}` });
      setTimeout(() => setSaveMessage(null), 4000);
    },
    onError: (err) => setSaveMessage({ type: 'danger', text: (err as Error).message }),
  });

  const rpTest = useMutation({
    mutationFn: async () => {
      const rpTokenValue = val('reportportal.token');
      const rpTokenProvided = isDirty('reportportal.token') || tokenEditing['reportportal.token'] || !isMaskedValue(rpTokenValue);
      return testRpConnection({ url: val('reportportal.url'), project: val('reportportal.project'), token: rpTokenProvided ? rpTokenValue : undefined });
    },
    onSuccess: (result) => { setRpTestMsg({ type: 'success', text: result.message }); setRpProjectsOverride(result.projects ?? []); },
    onError: (error) => setRpTestMsg({ type: 'danger', text: (error as Error).message }),
  });

  const jiraTest = useMutation({
    mutationFn: async () => {
      const jiraTokenValue = val('jira.token');
      const jiraTokenProvided = isDirty('jira.token') || tokenEditing['jira.token'] || !isMaskedValue(jiraTokenValue);
      return testJiraConnection({ url: val('jira.url'), projectKey: val('jira.projectKey'), token: jiraTokenProvided ? jiraTokenValue : undefined });
    },
    onSuccess: (result) => {
      setJiraTestMsg({ type: 'success', text: result.message });
      setJiraMetaOverride({ projects: result.projects ?? [], issueTypes: result.issueTypes ?? [], components: result.components ?? [] });
      if (!val('jira.issueType')) {
        const bugType = (result.issueTypes || []).find(type => type.toLowerCase() === 'bug');
        if (bugType || result.issueTypes?.[0]) set('jira.issueType', bugType || result.issueTypes![0]);
      }
    },
    onError: (error) => setJiraTestMsg({ type: 'danger', text: (error as Error).message }),
  });

  const startTokenEdit = (key: string): void => {
    if (!tokenEditing[key] && isMaskedValue(val(key))) set(key, '');
    setTokenEditing(prev => ({ ...prev, [key]: true }));
  };
  const endTokenEdit = (key: string): void => {
    if (!tokenEditing[key]) return;
    if (val(key).trim() === '') {
      set(key, data?.settings[key]?.value ?? '');
      setTokenEditing(prev => ({ ...prev, [key]: false }));
    }
  };
  const saveAll = (): void => {
    if (!data) return;
    const changed: Record<string, string> = {};
    for (const key of Object.keys(draft)) { if (isDirty(key)) changed[key] = draft[key]; }
    if (Object.keys(changed).length > 0) saveMutation.mutate(changed);
  };

  const rpProjectOptions = resolveRpProjectOptions(rpProjectsOverride, rpProjects, val('reportportal.project'));
  const { jiraProjectSelectOptions, issueTypeSelectOptions } = resolveJiraMeta(jiraMeta, jiraMetaDraft, jiraMetaOverride, jiraTokenDirty, jiraTestMode);

  return {
    data, isLoading, isAdmin,
    val, set, adminOnly: !isAdmin,
    tokenEditing, startTokenEdit, endTokenEdit,
    saveMessage, saveAll, saveMutation, hasChanges,
    rpProjectOptions, rpTestMsg, rpTest,
    jiraTestMsg, jiraTest, jiraTokenDirty,
    jiraProjectSelectOptions, issueTypeSelectOptions,
    setJiraTestMode, setJiraMetaOverride, setJiraTestMsg,
  };
}
