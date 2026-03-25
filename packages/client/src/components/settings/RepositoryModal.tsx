/* eslint-disable max-lines */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { Repository } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  ExpandableSection,
  Form,
  FormGroup,
  FormSection,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  NumberInput,
  Switch,
  TextInput,
} from '@patternfly/react-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../../api/client';
import { fetchComponentMappings } from '../../api/componentMappings';
import { createRepositoryApi, updateRepositoryApi } from '../../api/repositories';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { SearchableSelect } from '../common/SearchableSelect';

type RepositoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  existing?: Repository;
};

const stripTrailingSlashes = (str: string): string => {
  let trimmed = str;
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
};

const cleanRepoUrl = (repoUrl: string): { repoRoot: string; subPath: string } => {
  const gitlabSep = repoUrl.indexOf('/-/');
  if (gitlabSep !== -1) {
    const root = repoUrl.slice(0, gitlabSep);
    const rest = repoUrl.slice(gitlabSep + 3);
    const pathMatch = /^(?:tree|blob)\/[^/]+\/([^/?#\s]+)\/?\s*$/.exec(rest);
    return { repoRoot: root, subPath: pathMatch?.[1] || '' };
  }
  const githubMatch =
    /^(https:\/\/github\.com\/[^/]+\/[^/]+)(?:\/tree\/[^/]+\/([^/?#\s]+)\/?\s*)?$/.exec(repoUrl);
  if (githubMatch) {
    return { repoRoot: githubMatch[1], subPath: githubMatch[2] || '' };
  }
  return { repoRoot: stripTrailingSlashes(repoUrl), subPath: '' };
};

const deriveApiUrl = (provider: string, repoUrl: string): string => {
  if (provider === 'github') {
    return 'https://api.github.com';
  }
  if (!repoUrl) {
    return '';
  }
  try {
    const { repoRoot } = cleanRepoUrl(repoUrl);
    const parsed = new URL(repoRoot);
    return `${parsed.origin}/api/v4`;
  } catch {
    return '';
  }
};

const deriveProjectId = (provider: string, repoUrl: string): string => {
  if (provider !== 'github' || !repoUrl) {
    return '';
  }
  try {
    const { repoRoot } = cleanRepoUrl(repoUrl);
    const parsed = new URL(repoRoot);
    const parts = parsed.pathname
      .replace(/^\//, '')
      .replace(/\.git$/, '')
      .split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  } catch {
    /* Ignore */
  }
  return '';
};

const deriveDisplayName = (repoUrl: string): string => {
  if (!repoUrl) {
    return '';
  }
  try {
    const { repoRoot } = cleanRepoUrl(repoUrl);
    const parsed = new URL(repoRoot);
    const parts = parsed.pathname
      .replace(/^\//, '')
      .replace(/\.git$/, '')
      .split('/');
    if (parts.length >= 2) {
      return parts.slice(-2).join(' / ');
    }
    if (parts.length === 1 && parts[0]) {
      return parts[0];
    }
  } catch {
    /* Ignore */
  }
  return '';
};

// eslint-disable-next-line max-lines-per-function
export const RepositoryModal: React.FC<RepositoryModalProps> = ({ existing, isOpen, onClose }) => {
  const [provider, setProvider] = useState<'gitlab' | 'github'>('gitlab');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedBranches, setSelectedBranches] = useState(new Set(['main']));
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [globalTokenKey, setGlobalTokenKey] = useState('');
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
    queryFn: fetchComponentMappings,
    queryKey: ['componentMappings'],
    staleTime: 5 * 60_000,
  });

  const componentOptions = useMemo(() => {
    const jiraComps = mappingsData?.jiraComponents ?? [];
    const mappedComps = (mappingsData?.mappings ?? []).map(mapping => mapping.component);
    return [...new Set([...jiraComps, ...mappedComps])].toSorted((nameA, nameB) =>
      nameA.localeCompare(nameB),
    );
  }, [mappingsData]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
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
      setSelectedComponent('');
      setCacheTtlMin(5);
      setEnabled(true);
      setShowAdvanced(false);
      setInlineToken('');
      setNeedsToken(false);
    }
  }, [existing, isOpen]);

  const loadBranches = useCallback(
    (api: string, project: string, prov: string, token?: string) => {
      if (!api || !project) {
        return;
      }
      setBranchesLoading(true);
      const body: Record<string, string> = { apiBaseUrl: api, projectId: project, provider: prov };
      if (token) {
        body.token = token;
      }
      void apiFetch<{ branches: string[] }>('/repositories/resolve-branches', {
        body: JSON.stringify(body),
        method: 'POST',
      })
        .then(result => {
          setAvailableBranches(result.branches);
          setNeedsToken(false);
          if (
            selectedBranches.size === 0 ||
            (selectedBranches.size === 1 && selectedBranches.has('main'))
          ) {
            const defaultBranch = result.branches.includes('main') ? 'main' : result.branches[0];
            if (defaultBranch) {
              setSelectedBranches(new Set([defaultBranch]));
            }
          }
          return undefined;
        })
        .catch(() => {
          setNeedsToken(true);
        })
        .finally(() => setBranchesLoading(false));
    },
    [selectedBranches],
  );

  const handleProviderChange = useCallback(
    (_e: React.FormEvent, val: string) => {
      const prov = val as 'gitlab' | 'github';
      setProvider(prov);
      if (!existing) {
        setGlobalTokenKey(`${prov}.token`);
        if (url) {
          setApiBaseUrl(deriveApiUrl(prov, url));
          if (prov === 'github') {
            setProjectId(deriveProjectId(prov, url));
          }
        } else if (prov === 'github') {
          setApiBaseUrl('https://api.github.com');
        } else {
          setApiBaseUrl('');
        }
      }
    },
    [existing, url],
  );

  const handleUrlChange = useCallback(
    (_e: React.FormEvent, val: string) => {
      const { repoRoot } = cleanRepoUrl(val);
      setUrl(repoRoot);
      setResolveError('');
      if (!existing && repoRoot) {
        const derived = deriveApiUrl(provider, repoRoot);
        if (derived) {
          setApiBaseUrl(derived);
        }
        const derivedName = deriveDisplayName(repoRoot);
        if (derivedName && !name) {
          setName(derivedName);
        }
        if (provider === 'github') {
          const derivedProject = deriveProjectId(provider, repoRoot);
          if (derivedProject) {
            setProjectId(derivedProject);
          }
        }
        if (provider === 'gitlab' && derived) {
          setResolving(true);
          const resolveBody: Record<string, string> = {
            apiBaseUrl: derived,
            provider: 'gitlab',
            repoUrl: val,
          };
          if (inlineToken) {
            resolveBody.token = inlineToken;
          }
          void apiFetch<{ projectId: string; name: string; defaultBranch: string }>(
            '/repositories/resolve-project',
            { body: JSON.stringify(resolveBody), method: 'POST' },
          )
            .then(result => {
              setProjectId(result.projectId);
              if (!name && result.name) {
                setName(result.name);
              }
              if (result.defaultBranch) {
                setSelectedBranches(new Set([result.defaultBranch]));
              }
              setResolveError('');
              setNeedsToken(false);
              loadBranches(derived, result.projectId, provider, inlineToken || undefined);
              return undefined;
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
    },
    [existing, provider, name, loadBranches, inlineToken],
  );

  const effectiveApiUrl = apiBaseUrl || deriveApiUrl(provider, url);
  const effectiveTokenKey = globalTokenKey || `${provider}.token`;

  const canSubmit = useMemo(
    () => Boolean(name || deriveDisplayName(url)) && url && projectId && selectedBranches.size > 0,
    [name, url, projectId, selectedBranches],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        apiBaseUrl: effectiveApiUrl,
        branches: [...selectedBranches],
        cacheTtlMin,
        components: selectedComponent ? [selectedComponent] : [],
        docPaths: [],
        enabled,
        globalTokenKey: effectiveTokenKey,
        name: name || deriveDisplayName(url),
        projectId,
        provider,
        testPaths: [],
        url,
      };
      if (inlineToken && !existing) {
        data.token = inlineToken;
      }
      return existing
        ? updateRepositoryApi(existing.id, data)
        : createRepositoryApi(data as Parameters<typeof createRepositoryApi>[0]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['repositories'] });
      void queryClient.invalidateQueries({ queryKey: ['testExplorerTree'] });
      void queryClient.invalidateQueries({ queryKey: ['testExplorerStats'] });
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['testExplorerTree'] });
        void queryClient.invalidateQueries({ queryKey: ['testExplorerStats'] });
      }, 5000);
      onClose();
    },
  });

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.large} onClose={onClose}>
      <ModalHeader
        description="Connect a GitLab or GitHub repository for test documentation and quarantine management."
        title={existing ? `Edit Repository: ${existing.name}` : 'Add Repository'}
      />
      <ModalBody>
        <Form isHorizontal>
          <FormSection title="Connection" titleElement="h3">
            <FormGroup isRequired fieldId="repo-provider" label="Provider">
              <FormSelect id="repo-provider" value={provider} onChange={handleProviderChange}>
                <FormSelectOption label="GitLab" value="gitlab" />
                <FormSelectOption label="GitHub" value="github" />
              </FormSelect>
            </FormGroup>

            <FormGroup isRequired fieldId="repo-url" label="Repository URL">
              <TextInput
                id="repo-url"
                placeholder={
                  provider === 'gitlab'
                    ? 'https://gitlab.cee.redhat.com/group/repo'
                    : 'https://github.com/owner/repo'
                }
                value={url}
                onChange={handleUrlChange}
              />
              <HelperText>
                <HelperTextItem>
                  {resolving
                    ? 'Resolving project...'
                    : projectId
                      ? `Resolved: project ID ${projectId}`
                      : `Paste the repository URL. Everything else will be auto-detected.`}
                </HelperTextItem>
                {resolveError && (
                  <HelperTextItem variant="error">
                    {resolveError}. You can enter the project ID manually below.
                  </HelperTextItem>
                )}
              </HelperText>
            </FormGroup>

            {needsToken && (
              <FormGroup
                isRequired
                fieldId="repo-inline-token"
                label={`${provider === 'gitlab' ? 'GitLab' : 'GitHub'} Access Token`}
              >
                <TextInput
                  id="repo-inline-token"
                  placeholder={`Paste your ${provider === 'gitlab' ? 'GitLab' : 'GitHub'} access token`}
                  type="password"
                  value={inlineToken}
                  onChange={(_e, val) => setInlineToken(val)}
                />
                <HelperText>
                  <HelperTextItem>
                    A read-only access token is needed to fetch repository info.{' '}
                    {provider === 'gitlab'
                      ? 'Needs at least read_api scope.'
                      : 'Needs repo read access.'}{' '}
                    This token will be saved to settings for future use.
                  </HelperTextItem>
                </HelperText>
                {inlineToken && (
                  <Button
                    className="app-mt-sm"
                    isDisabled={resolving}
                    isLoading={resolving}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (url) {
                        const derived = deriveApiUrl(provider, url);
                        if (provider === 'gitlab' && derived) {
                          setResolving(true);
                          void apiFetch<{ projectId: string; name: string; defaultBranch: string }>(
                            '/repositories/resolve-project',
                            {
                              body: JSON.stringify({
                                apiBaseUrl: derived,
                                provider: 'gitlab',
                                repoUrl: url,
                                token: inlineToken,
                              }),
                              method: 'POST',
                            },
                          )
                            .then(result => {
                              setProjectId(result.projectId);
                              if (!name && result.name) {
                                setName(result.name);
                              }
                              if (result.defaultBranch) {
                                setSelectedBranches(new Set([result.defaultBranch]));
                              }
                              setResolveError('');
                              setNeedsToken(false);
                              loadBranches(derived, result.projectId, provider, inlineToken);
                              return undefined;
                            })
                            .catch(err =>
                              setResolveError(err instanceof Error ? err.message : 'Failed'),
                            )
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
                  >
                    Connect
                  </Button>
                )}
              </FormGroup>
            )}

            {(resolveError || (!resolving && !projectId && url && !needsToken)) &&
              provider === 'gitlab' && (
                <FormGroup isRequired fieldId="repo-project" label="Project ID">
                  <TextInput
                    id="repo-project"
                    placeholder="12345"
                    value={projectId}
                    onChange={(_e, val) => setProjectId(val)}
                  />
                  <HelperText>
                    <HelperTextItem>
                      The numeric project ID from GitLab (Settings &gt; General).
                    </HelperTextItem>
                  </HelperText>
                </FormGroup>
              )}
          </FormSection>

          <FormSection title="What to Track" titleElement="h3">
            <FormGroup isRequired fieldId="repo-branches" label="Branches">
              {availableBranches.length > 0 ? (
                <ComponentMultiSelect
                  id="repo-branches"
                  isDisabled={branchesLoading}
                  itemLabel="branches"
                  options={availableBranches}
                  placeholder={branchesLoading ? 'Loading branches...' : 'Select branches...'}
                  selected={selectedBranches}
                  onChange={setSelectedBranches}
                />
              ) : (
                <TextInput
                  id="repo-branches-text"
                  isDisabled={branchesLoading}
                  placeholder={branchesLoading ? 'Loading branches...' : 'main'}
                  value={[...selectedBranches].join(', ')}
                  onChange={(_e, val) =>
                    setSelectedBranches(
                      new Set(
                        val
                          .split(',')
                          .map(str => str.trim())
                          .filter(Boolean),
                      ),
                    )
                  }
                />
              )}
              <HelperText>
                <HelperTextItem>
                  {availableBranches.length > 0
                    ? `${availableBranches.length} branches available. Select which ones to track.`
                    : branchesLoading
                      ? 'Fetching branches from the repository...'
                      : 'Branches will be loaded once the repository URL is resolved.'}
                </HelperTextItem>
              </HelperText>
            </FormGroup>

            <FormGroup fieldId="repo-component" label="Component">
              <SearchableSelect
                id="repo-component"
                options={componentOptions.map(comp => ({ label: comp, value: comp }))}
                placeholder="Select a component..."
                value={selectedComponent}
                onChange={setSelectedComponent}
              />
              <HelperText>
                <HelperTextItem>The Jira component this repository belongs to.</HelperTextItem>
              </HelperText>
            </FormGroup>
          </FormSection>

          <ExpandableSection
            isExpanded={showAdvanced}
            toggleText={showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
            onToggle={(_e, expanded) => setShowAdvanced(expanded)}
          >
            <FormSection titleElement="h3">
              <FormGroup fieldId="repo-name" label="Display Name">
                <TextInput
                  id="repo-name"
                  placeholder={deriveDisplayName(url) || 'Auto-detected from URL'}
                  value={name}
                  onChange={(_e, val) => setName(val)}
                />
                <HelperText>
                  <HelperTextItem>
                    Override the auto-detected name. Leave empty to use the repository path.
                  </HelperTextItem>
                </HelperText>
              </FormGroup>

              <FormGroup fieldId="repo-api" label="API Base URL">
                <TextInput
                  id="repo-api"
                  placeholder={effectiveApiUrl || 'Auto-detected from repository URL'}
                  value={apiBaseUrl}
                  onChange={(_e, val) => setApiBaseUrl(val)}
                />
                <HelperText>
                  <HelperTextItem>
                    Override only if using a custom API gateway or proxy.
                  </HelperTextItem>
                </HelperText>
              </FormGroup>

              <FormGroup fieldId="repo-token" label="Access Token Key">
                <TextInput
                  id="repo-token"
                  placeholder={effectiveTokenKey}
                  value={globalTokenKey}
                  onChange={(_e, val) => setGlobalTokenKey(val)}
                />
                <HelperText>
                  <HelperTextItem>
                    The settings key storing the read-only token. Default: {effectiveTokenKey}
                  </HelperTextItem>
                </HelperText>
              </FormGroup>

              <FormGroup fieldId="repo-cache" label="Cache Duration">
                <NumberInput
                  id="repo-cache"
                  max={1440}
                  min={1}
                  unit="minutes"
                  value={cacheTtlMin}
                  onChange={e => setCacheTtlMin(Number((e.target as HTMLInputElement).value))}
                  onMinus={() => setCacheTtlMin(Math.max(1, cacheTtlMin - 1))}
                  onPlus={() => setCacheTtlMin(cacheTtlMin + 1)}
                />
                <HelperText>
                  <HelperTextItem>
                    How long to cache the file tree before re-fetching.
                  </HelperTextItem>
                </HelperText>
              </FormGroup>

              <FormGroup fieldId="repo-enabled" label="Enabled">
                <Switch
                  id="repo-enabled"
                  isChecked={enabled}
                  label="Sync and display this repository"
                  onChange={(_e, checked) => setEnabled(checked)}
                />
              </FormGroup>
            </FormSection>
          </ExpandableSection>

          {mutation.isError && (
            <Alert
              isInline
              className="app-mt-md"
              title="Failed to save repository"
              variant="danger"
            >
              {mutation.error.message}
            </Alert>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!canSubmit || mutation.isPending}
          isLoading={mutation.isPending}
          variant="primary"
          onClick={() => mutation.mutate()}
        >
          {existing ? 'Save Changes' : 'Add Repository'}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
