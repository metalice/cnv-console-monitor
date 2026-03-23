import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormSection,
  TextInput,
  FormSelect,
  FormSelectOption,
  NumberInput,
  Switch,
  Alert,
  HelperText,
  HelperTextItem,
  Content,
  ExpandableSection,
} from '@patternfly/react-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Repository } from '@cnv-monitor/shared';
import { createRepositoryApi, updateRepositoryApi, resolveGitLabProject } from '../../api/repositories';
import { apiFetch } from '../../api/client';
import { fetchComponentMappings } from '../../api/componentMappings';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { SearchableSelect } from '../common/SearchableSelect';

interface RepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existing?: Repository;
}

function cleanRepoUrl(repoUrl: string): { repoRoot: string; subPath: string } {
  const gitlabSep = repoUrl.indexOf('/-/');
  if (gitlabSep !== -1) {
    const root = repoUrl.slice(0, gitlabSep);
    const rest = repoUrl.slice(gitlabSep + 3);
    const pathMatch = rest.match(/^(?:tree|blob)\/[^/]+\/(.+?)\/?\s*$/);
    return { repoRoot: root, subPath: pathMatch?.[1] || '' };
  }
  const githubMatch = repoUrl.match(/^(https:\/\/github\.com\/[^/]+\/[^/]+)(?:\/tree\/[^/]+\/(.+?)\/?\s*)?$/);
  if (githubMatch) {
    return { repoRoot: githubMatch[1], subPath: githubMatch[2] || '' };
  }
  return { repoRoot: repoUrl.replace(/\/+$/, ''), subPath: '' };
}

function deriveApiUrl(provider: string, repoUrl: string): string {
  if (provider === 'github') return 'https://api.github.com';
  if (!repoUrl) return '';
  try {
    const { repoRoot } = cleanRepoUrl(repoUrl);
    const parsed = new URL(repoRoot);
    return `${parsed.origin}/api/v4`;
  } catch {
    return '';
  }
}

function deriveProjectId(provider: string, repoUrl: string): string {
  if (provider !== 'github' || !repoUrl) return '';
  try {
    const { repoRoot } = cleanRepoUrl(repoUrl);
    const parsed = new URL(repoRoot);
    const parts = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  } catch { /* ignore */ }
  return '';
}

function deriveDisplayName(repoUrl: string): string {
  if (!repoUrl) return '';
  try {
    const { repoRoot } = cleanRepoUrl(repoUrl);
    const parsed = new URL(repoRoot);
    const parts = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    if (parts.length >= 2) return parts.slice(-2).join(' / ');
    if (parts.length === 1 && parts[0]) return parts[0];
  } catch { /* ignore */ }
  return '';
}

export const RepositoryModal: React.FC<RepositoryModalProps> = ({ isOpen, onClose, existing }) => {
  const [provider, setProvider] = useState<'gitlab' | 'github'>('gitlab');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set(['main']));
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [globalTokenKey, setGlobalTokenKey] = useState('');
  const [docPaths, setDocPaths] = useState('');
  const [testPaths, setTestPaths] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [cacheTtlMin, setCacheTtlMin] = useState(5);
  const [enabled, setEnabled] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [inlineToken, setInlineToken] = useState('');
  const [needsToken, setNeedsToken] = useState(false);
  const queryClient = useQueryClient();

  const { data: mappingsData } = useQuery({
    queryKey: ['componentMappings'],
    queryFn: fetchComponentMappings,
    staleTime: 5 * 60_000,
  });

  const componentOptions = useMemo(() => {
    const jiraComps = mappingsData?.jiraComponents ?? [];
    const mappedComps = (mappingsData?.mappings ?? []).map(m => m.component);
    return [...new Set([...jiraComps, ...mappedComps])].sort();
  }, [mappingsData]);

  useEffect(() => {
    if (!isOpen) return;
    if (existing) {
      const e = existing as unknown as Record<string, unknown>;
      setProvider((e.provider || 'gitlab') as 'gitlab' | 'github');
      setUrl((e.url || '') as string);
      setName((e.name || '') as string);
      setApiBaseUrl((e.apiBaseUrl || e.api_base_url || '') as string);
      setProjectId((e.projectId || e.project_id || '') as string);
      const branches = (e.branches || []) as string[];
      setSelectedBranches(new Set(branches));
      setAvailableBranches(branches);
      setGlobalTokenKey((e.globalTokenKey || e.global_token_key || '') as string);
      const globToFolder = (g: string) => g.replace(/\/\*\*\/\*\.[^,]+$/, '');
      const uniqueFolders = (globs: string[]) => [...new Set(globs.map(globToFolder))].join(', ');
      const docPaths = (e.docPaths || e.doc_paths || []) as string[];
      const testPaths = (e.testPaths || e.test_paths || []) as string[];
      setDocPaths(uniqueFolders(docPaths));
      setTestPaths(uniqueFolders(testPaths));
      const components = (e.components || []) as string[];
      setSelectedComponent(components[0] || '');
      setCacheTtlMin((e.cacheTtlMin || e.cache_ttl_min || 5) as number);
      setEnabled((e.enabled !== undefined ? e.enabled : true) as boolean);
      setShowAdvanced(false);
    } else {
      setProvider('gitlab');
      setUrl('');
      setName('');
      setApiBaseUrl('');
      setProjectId('');
      setSelectedBranches(new Set(['main']));
      setAvailableBranches([]);
      setGlobalTokenKey('');
      setDocPaths('');
      setTestPaths('');
      setSelectedComponent('');
      setCacheTtlMin(5);
      setEnabled(true);
      setShowAdvanced(false);
      setInlineToken('');
      setNeedsToken(false);
    }
  }, [existing, isOpen]);

  const loadBranches = useCallback((api: string, project: string, prov: string, token?: string) => {
    if (!api || !project) return;
    setBranchesLoading(true);
    const body: Record<string, string> = { apiBaseUrl: api, projectId: project, provider: prov };
    if (token) body.token = token;
    apiFetch<{ branches: string[] }>('/repositories/resolve-branches', { method: 'POST', body: JSON.stringify(body) })
      .then(result => {
        setAvailableBranches(result.branches);
        setNeedsToken(false);
        if (selectedBranches.size === 0 || (selectedBranches.size === 1 && selectedBranches.has('main'))) {
          const defaultBranch = result.branches.includes('main') ? 'main' : result.branches[0];
          if (defaultBranch) setSelectedBranches(new Set([defaultBranch]));
        }
      })
      .catch(() => { setNeedsToken(true); })
      .finally(() => setBranchesLoading(false));
  }, [selectedBranches]);

  const handleProviderChange = useCallback((_e: React.FormEvent, val: string) => {
    const p = val as 'gitlab' | 'github';
    setProvider(p);
    if (!existing) {
      setGlobalTokenKey(`${p}.token`);
      if (url) {
        setApiBaseUrl(deriveApiUrl(p, url));
        if (p === 'github') setProjectId(deriveProjectId(p, url));
      } else if (p === 'github') {
        setApiBaseUrl('https://api.github.com');
      } else {
        setApiBaseUrl('');
      }
    }
  }, [existing, url]);

  const handleUrlChange = useCallback((_e: React.FormEvent, val: string) => {
    const { repoRoot, subPath } = cleanRepoUrl(val);
    setUrl(repoRoot);
    setResolveError('');
    if (subPath && !docPaths) setDocPaths(subPath);
    if (!existing && repoRoot) {
      const derived = deriveApiUrl(provider, repoRoot);
      if (derived) setApiBaseUrl(derived);
      const derivedName = deriveDisplayName(repoRoot);
      if (derivedName && !name) setName(derivedName);
      if (provider === 'github') {
        const derivedProject = deriveProjectId(provider, repoRoot);
        if (derivedProject) setProjectId(derivedProject);
      }
      if (provider === 'gitlab' && derived) {
        setResolving(true);
        const resolveBody: Record<string, string> = { repoUrl: val, apiBaseUrl: derived, provider: 'gitlab' };
        if (inlineToken) resolveBody.token = inlineToken;
        apiFetch<{ projectId: string; name: string; defaultBranch: string }>('/repositories/resolve-project', { method: 'POST', body: JSON.stringify(resolveBody) })
          .then(result => {
            setProjectId(result.projectId);
            if (!name && result.name) setName(result.name);
            if (result.defaultBranch) setSelectedBranches(new Set([result.defaultBranch]));
            setResolveError('');
            setNeedsToken(false);
            loadBranches(derived, result.projectId, provider, inlineToken || undefined);
          })
          .catch(err => {
            const msg = err instanceof Error ? err.message : 'Could not resolve project';
            if (msg.includes('token') || msg.includes('Token')) {
              setNeedsToken(true);
              setResolveError('');
            } else {
              setResolveError(msg);
            }
          })
          .finally(() => setResolving(false));
      }
      if (provider === 'github') {
        const derivedProject = deriveProjectId(provider, val);
        if (derivedProject && derived) {
          loadBranches(derived, derivedProject, provider);
        }
      }
    }
  }, [existing, provider, name, loadBranches, inlineToken]);

  const effectiveApiUrl = apiBaseUrl || deriveApiUrl(provider, url);
  const effectiveTokenKey = globalTokenKey || `${provider}.token`;

  const splitComma = (val: string) => val.split(',').map(s => s.trim()).filter(Boolean);

  const toGlobs = (folders: string, extensions: string[]) =>
    splitComma(folders).flatMap(folder => {
      const clean = folder.replace(/\/+$/, '');
      if (clean.includes('*')) return [clean];
      return extensions.map(ext => `${clean}/**/*${ext}`);
    });

  const canSubmit = useMemo(() => {
    return !!(name || deriveDisplayName(url)) && url && projectId && selectedBranches.size > 0;
  }, [name, url, projectId, selectedBranches]);

  const mutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        name: name || deriveDisplayName(url),
        provider,
        url,
        apiBaseUrl: effectiveApiUrl,
        projectId,
        branches: [...selectedBranches],
        globalTokenKey: effectiveTokenKey,
        docPaths: toGlobs(docPaths, ['.md']),
        testPaths: toGlobs(testPaths, ['.spec.ts', '.test.ts', '.cy.ts', '.spec.js']),
        components: selectedComponent ? [selectedComponent] : [],
        cacheTtlMin,
        enabled,
      };
      if (inlineToken && !existing) {
        data.token = inlineToken;
      }
      return existing ? updateRepositoryApi(existing.id, data) : createRepositoryApi(data as Parameters<typeof createRepositoryApi>[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['testExplorerTree'] });
      queryClient.invalidateQueries({ queryKey: ['testExplorerStats'] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['testExplorerTree'] });
        queryClient.invalidateQueries({ queryKey: ['testExplorerStats'] });
      }, 5000);
      onClose();
    },
  });

  return (
    <Modal variant={ModalVariant.large} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={existing ? `Edit Repository: ${existing.name}` : 'Add Repository'} description="Connect a GitLab or GitHub repository for test documentation and quarantine management." />
      <ModalBody>
        <Form isHorizontal>
          <FormSection title="Connection" titleElement="h3">
            <FormGroup label="Provider" isRequired fieldId="repo-provider">
              <FormSelect id="repo-provider" value={provider} onChange={handleProviderChange}>
                <FormSelectOption value="gitlab" label="GitLab" />
                <FormSelectOption value="github" label="GitHub" />
              </FormSelect>
            </FormGroup>

            <FormGroup label="Repository URL" isRequired fieldId="repo-url">
              <TextInput id="repo-url" value={url} onChange={handleUrlChange} placeholder={provider === 'gitlab' ? 'https://gitlab.cee.redhat.com/group/repo' : 'https://github.com/owner/repo'} />
              <HelperText>
                <HelperTextItem>
                  {resolving
                    ? 'Resolving project...'
                    : projectId
                      ? `Resolved: project ID ${projectId}`
                      : `Paste the repository URL. Everything else will be auto-detected.`}
                </HelperTextItem>
                {resolveError && <HelperTextItem variant="error">{resolveError}. You can enter the project ID manually below.</HelperTextItem>}
              </HelperText>
            </FormGroup>

            {needsToken && (
              <FormGroup label={`${provider === 'gitlab' ? 'GitLab' : 'GitHub'} Access Token`} isRequired fieldId="repo-inline-token">
                <TextInput
                  id="repo-inline-token"
                  type="password"
                  value={inlineToken}
                  onChange={(_e, val) => setInlineToken(val)}
                  placeholder={`Paste your ${provider === 'gitlab' ? 'GitLab' : 'GitHub'} access token`}
                />
                <HelperText>
                  <HelperTextItem>
                    A read-only access token is needed to fetch repository info. {provider === 'gitlab' ? 'Needs at least read_api scope.' : 'Needs repo read access.'}
                    {' '}This token will be saved to settings for future use.
                  </HelperTextItem>
                </HelperText>
                {inlineToken && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="app-mt-sm"
                    onClick={() => {
                      if (url) {
                        const derived = deriveApiUrl(provider, url);
                        if (provider === 'gitlab' && derived) {
                          setResolving(true);
                          apiFetch<{ projectId: string; name: string; defaultBranch: string }>('/repositories/resolve-project', {
                            method: 'POST',
                            body: JSON.stringify({ repoUrl: url, apiBaseUrl: derived, provider: 'gitlab', token: inlineToken }),
                          })
                            .then(result => {
                              setProjectId(result.projectId);
                              if (!name && result.name) setName(result.name);
                              if (result.defaultBranch) setSelectedBranches(new Set([result.defaultBranch]));
                              setResolveError('');
                              setNeedsToken(false);
                              loadBranches(derived, result.projectId, provider, inlineToken);
                            })
                            .catch(err => setResolveError(err instanceof Error ? err.message : 'Failed'))
                            .finally(() => setResolving(false));
                        } else if (provider === 'github') {
                          const proj = deriveProjectId(provider, url);
                          if (proj && derived) {
                            setProjectId(proj);
                            setNeedsToken(false);
                            loadBranches(derived, proj, provider, inlineToken);
                          }
                        }
                      }
                    }}
                    isLoading={resolving}
                    isDisabled={resolving}
                  >
                    Connect
                  </Button>
                )}
              </FormGroup>
            )}

            {(resolveError || (!resolving && !projectId && url && !needsToken)) && provider === 'gitlab' && (
              <FormGroup label="Project ID" isRequired fieldId="repo-project">
                <TextInput id="repo-project" value={projectId} onChange={(_e, val) => setProjectId(val)} placeholder="12345" />
                <HelperText><HelperTextItem>The numeric project ID from GitLab (Settings &gt; General).</HelperTextItem></HelperText>
              </FormGroup>
            )}
          </FormSection>

          <FormSection title="What to Track" titleElement="h3">
            <FormGroup label="Branches" isRequired fieldId="repo-branches">
              {availableBranches.length > 0 ? (
                <ComponentMultiSelect
                  id="repo-branches"
                  selected={selectedBranches}
                  options={availableBranches}
                  onChange={setSelectedBranches}
                  placeholder={branchesLoading ? 'Loading branches...' : 'Select branches...'}
                  itemLabel="branches"
                  isDisabled={branchesLoading}
                />
              ) : (
                <TextInput
                  id="repo-branches-text"
                  value={[...selectedBranches].join(', ')}
                  onChange={(_e, val) => setSelectedBranches(new Set(val.split(',').map(s => s.trim()).filter(Boolean)))}
                  placeholder={branchesLoading ? 'Loading branches...' : 'main'}
                  isDisabled={branchesLoading}
                />
              )}
              <HelperText><HelperTextItem>{availableBranches.length > 0 ? `${availableBranches.length} branches available. Select which ones to track.` : branchesLoading ? 'Fetching branches from the repository...' : 'Branches will be loaded once the repository URL is resolved.'}</HelperTextItem></HelperText>
            </FormGroup>

            <FormGroup label="Component" fieldId="repo-component">
              <SearchableSelect
                id="repo-component"
                value={selectedComponent}
                options={componentOptions.map(c => ({ value: c, label: c }))}
                onChange={setSelectedComponent}
                placeholder="Select a component..."
              />
              <HelperText><HelperTextItem>The Jira component this repository belongs to.</HelperTextItem></HelperText>
            </FormGroup>

          </FormSection>

          <ExpandableSection toggleText={showAdvanced ? 'Hide advanced options' : 'Show advanced options'} isExpanded={showAdvanced} onToggle={(_e, expanded) => setShowAdvanced(expanded)}>
            <FormSection titleElement="h3">
              <FormGroup label="Display Name" fieldId="repo-name">
                <TextInput id="repo-name" value={name} onChange={(_e, val) => setName(val)} placeholder={deriveDisplayName(url) || 'Auto-detected from URL'} />
                <HelperText><HelperTextItem>Override the auto-detected name. Leave empty to use the repository path.</HelperTextItem></HelperText>
              </FormGroup>

              <FormGroup label="API Base URL" fieldId="repo-api">
                <TextInput id="repo-api" value={apiBaseUrl} onChange={(_e, val) => setApiBaseUrl(val)} placeholder={effectiveApiUrl || 'Auto-detected from repository URL'} />
                <HelperText><HelperTextItem>Override only if using a custom API gateway or proxy.</HelperTextItem></HelperText>
              </FormGroup>

              <FormGroup label="Access Token Key" fieldId="repo-token">
                <TextInput id="repo-token" value={globalTokenKey} onChange={(_e, val) => setGlobalTokenKey(val)} placeholder={effectiveTokenKey} />
                <HelperText><HelperTextItem>The settings key storing the read-only token. Default: {effectiveTokenKey}</HelperTextItem></HelperText>
              </FormGroup>

              <FormGroup label="Docs Folder" fieldId="repo-docs">
                <TextInput id="repo-docs" value={docPaths} onChange={(_e, val) => setDocPaths(val)} placeholder="All .md files scanned by default" />
                <HelperText><HelperTextItem>Restrict doc scanning to a specific folder. Leave empty to scan all markdown files.</HelperTextItem></HelperText>
              </FormGroup>

              <FormGroup label="Tests Folder" fieldId="repo-tests">
                <TextInput id="repo-tests" value={testPaths} onChange={(_e, val) => setTestPaths(val)} placeholder="Auto-detected from doc links" />
                <HelperText><HelperTextItem>Restrict test scanning to a specific folder. Leave empty to auto-detect from doc content.</HelperTextItem></HelperText>
              </FormGroup>

              <FormGroup label="Cache Duration" fieldId="repo-cache">
                <NumberInput
                  id="repo-cache"
                  value={cacheTtlMin}
                  onChange={(e) => setCacheTtlMin(Number((e.target as HTMLInputElement).value))}
                  onMinus={() => setCacheTtlMin(Math.max(1, cacheTtlMin - 1))}
                  onPlus={() => setCacheTtlMin(cacheTtlMin + 1)}
                  min={1}
                  max={1440}
                  unit="minutes"
                />
                <HelperText><HelperTextItem>How long to cache the file tree before re-fetching.</HelperTextItem></HelperText>
              </FormGroup>

              <FormGroup label="Enabled" fieldId="repo-enabled">
                <Switch id="repo-enabled" isChecked={enabled} onChange={(_e, checked) => setEnabled(checked)} label="Sync and display this repository" />
              </FormGroup>
            </FormSection>
          </ExpandableSection>

          {mutation.isError && (
            <Alert variant="danger" isInline title="Failed to save repository" className="app-mt-md">
              {(mutation.error as Error).message}
            </Alert>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!canSubmit || mutation.isPending} isLoading={mutation.isPending}>
          {existing ? 'Save Changes' : 'Add Repository'}
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
