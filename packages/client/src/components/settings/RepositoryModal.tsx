import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalVariant,
  Button,
  Form,
  FormGroup,
  TextInput,
  FormSelect,
  FormSelectOption,
  NumberInput,
  Checkbox,
  ActionGroup,
  Alert,
} from '@patternfly/react-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Repository } from '@cnv-monitor/shared';
import { createRepositoryApi, updateRepositoryApi } from '../../api/repositories';

interface RepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existing?: Repository;
}

export const RepositoryModal: React.FC<RepositoryModalProps> = ({ isOpen, onClose, existing }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'gitlab' | 'github'>('gitlab');
  const [url, setUrl] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [branches, setBranches] = useState('main');
  const [globalTokenKey, setGlobalTokenKey] = useState('');
  const [docPaths, setDocPaths] = useState('');
  const [testPaths, setTestPaths] = useState('');
  const [components, setComponents] = useState('');
  const [cacheTtlMin, setCacheTtlMin] = useState(5);
  const [enabled, setEnabled] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setProvider(existing.provider);
      setUrl(existing.url);
      setApiBaseUrl(existing.apiBaseUrl);
      setProjectId(existing.projectId);
      setBranches(existing.branches.join(', '));
      setGlobalTokenKey(existing.globalTokenKey);
      setDocPaths(existing.docPaths.join(', '));
      setTestPaths(existing.testPaths.join(', '));
      setComponents(existing.components.join(', '));
      setCacheTtlMin(existing.cacheTtlMin);
      setEnabled(existing.enabled);
    } else {
      setName('');
      setProvider('gitlab');
      setUrl('');
      setApiBaseUrl('');
      setProjectId('');
      setBranches('main');
      setGlobalTokenKey('');
      setDocPaths('');
      setTestPaths('');
      setComponents('');
      setCacheTtlMin(5);
      setEnabled(true);
    }
  }, [existing, isOpen]);

  const splitComma = (val: string) => val.split(',').map(s => s.trim()).filter(Boolean);

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        name,
        provider,
        url,
        apiBaseUrl,
        projectId,
        branches: splitComma(branches),
        globalTokenKey,
        docPaths: splitComma(docPaths),
        testPaths: splitComma(testPaths),
        components: splitComma(components),
        cacheTtlMin,
        enabled,
      };
      return existing ? updateRepositoryApi(existing.id, data) : createRepositoryApi(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      onClose();
    },
  });

  return (
    <Modal
      variant={ModalVariant.large}
      title={existing ? `Edit: ${existing.name}` : 'Add Repository'}
      isOpen={isOpen}
      onClose={onClose}
    >
      <Form>
        <FormGroup label="Name" isRequired fieldId="repo-name">
          <TextInput id="repo-name" value={name} onChange={(_e, val) => setName(val)} />
        </FormGroup>
        <FormGroup label="Provider" isRequired fieldId="repo-provider">
          <FormSelect id="repo-provider" value={provider} onChange={(_e, val) => setProvider(val as 'gitlab' | 'github')}>
            <FormSelectOption value="gitlab" label="GitLab" />
            <FormSelectOption value="github" label="GitHub" />
          </FormSelect>
        </FormGroup>
        <FormGroup label="Repository URL" isRequired fieldId="repo-url">
          <TextInput id="repo-url" value={url} onChange={(_e, val) => setUrl(val)} placeholder="https://gitlab.example.com/group/repo" />
        </FormGroup>
        <FormGroup label="API Base URL" isRequired fieldId="repo-api">
          <TextInput id="repo-api" value={apiBaseUrl} onChange={(_e, val) => setApiBaseUrl(val)} placeholder="https://gitlab.example.com/api/v4" />
        </FormGroup>
        <FormGroup label="Project ID" isRequired fieldId="repo-project">
          <TextInput id="repo-project" value={projectId} onChange={(_e, val) => setProjectId(val)} placeholder="12345 or owner/repo" />
        </FormGroup>
        <FormGroup label="Branches (comma-separated)" isRequired fieldId="repo-branches">
          <TextInput id="repo-branches" value={branches} onChange={(_e, val) => setBranches(val)} placeholder="main, release-4.16" />
        </FormGroup>
        <FormGroup label="Global Token Setting Key" isRequired fieldId="repo-token">
          <TextInput id="repo-token" value={globalTokenKey} onChange={(_e, val) => setGlobalTokenKey(val)} placeholder="gitlab.token or github.token" />
        </FormGroup>
        <FormGroup label="Doc Paths (glob patterns, comma-separated)" fieldId="repo-docs">
          <TextInput id="repo-docs" value={docPaths} onChange={(_e, val) => setDocPaths(val)} placeholder="docs/**/*.md, playwright/docs/**/*.md" />
        </FormGroup>
        <FormGroup label="Test Paths (glob patterns, comma-separated)" fieldId="repo-tests">
          <TextInput id="repo-tests" value={testPaths} onChange={(_e, val) => setTestPaths(val)} placeholder="tests/**/*.spec.ts" />
        </FormGroup>
        <FormGroup label="Components (comma-separated)" fieldId="repo-components">
          <TextInput id="repo-components" value={components} onChange={(_e, val) => setComponents(val)} placeholder="Networking, Storage" />
        </FormGroup>
        <FormGroup label="Cache TTL (minutes)" fieldId="repo-cache">
          <NumberInput value={cacheTtlMin} onChange={(e) => setCacheTtlMin(Number((e.target as HTMLInputElement).value))} onMinus={() => setCacheTtlMin(Math.max(1, cacheTtlMin - 1))} onPlus={() => setCacheTtlMin(cacheTtlMin + 1)} min={1} max={1440} />
        </FormGroup>
        <Checkbox id="repo-enabled" label="Enabled" isChecked={enabled} onChange={(_e, checked) => setEnabled(checked)} />
        {mutation.isError && <Alert variant="danger" isInline title="Failed">{(mutation.error as Error).message}</Alert>}
        <ActionGroup>
          <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!name || !url || mutation.isPending} isLoading={mutation.isPending}>{existing ? 'Update' : 'Create'}</Button>
          <Button variant="link" onClick={onClose}>Cancel</Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
