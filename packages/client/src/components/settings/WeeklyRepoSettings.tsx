import { useEffect, useState } from 'react';

import { type CreateWeeklyRepo, type WeeklyRepo } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSection,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Switch,
  TextInput,
} from '@patternfly/react-core';
import { GithubIcon, GitlabIcon, PlusCircleIcon, RepositoryIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createWeeklyRepoApi,
  deleteWeeklyRepoApi,
  fetchWeeklyRepos,
  updateWeeklyRepoApi,
} from '../../api/weeklyRepoConfig';
import { useComponentFilter } from '../../context/ComponentFilterContext';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

type FormState = {
  component: string;
  enabled: boolean;
  name: string;
  url: string;
};

const EMPTY_FORM: FormState = {
  component: '',
  enabled: true,
  name: '',
  url: '',
};

const RepoFormModal = ({
  availableComponents,
  error,
  initial,
  isOpen,
  isPending,
  mode,
  onClose,
  onSave,
}: {
  availableComponents: string[];
  error?: string;
  initial: FormState;
  isOpen: boolean;
  isPending: boolean;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: FormState) => void;
}) => {
  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (isOpen) setForm(initial);
  }, [isOpen, initial]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const canSubmit = form.name.trim() && form.url.trim() && form.component;
  const isGitHub = form.url.includes('github.com');
  const title = mode === 'add' ? 'Add Repository' : 'Edit Repository';
  const description =
    'Paste a GitHub or GitLab URL. Provider is auto-detected. Authentication uses the global token from Integrations.';

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={onClose}>
      <ModalHeader description={description} title={title} />
      <ModalBody>
        <Form isHorizontal>
          <FormSection title="Repository" titleElement="h3">
            <FormGroup isRequired fieldId="wr-url" label="Repository URL">
              <TextInput
                isRequired
                id="wr-url"
                placeholder="https://github.com/kubevirt-ui/kubevirt-plugin"
                value={form.url}
                onChange={(_e, val) => updateField('url', val)}
              />
              <HelperText>
                <HelperTextItem>
                  {form.url
                    ? `Detected: ${isGitHub ? 'GitHub' : 'GitLab'}`
                    : 'Paste a GitHub or GitLab repository URL.'}
                </HelperTextItem>
              </HelperText>
            </FormGroup>

            <FormGroup isRequired fieldId="wr-name" label="Display Name">
              <TextInput
                isRequired
                id="wr-name"
                placeholder="e.g., KubeVirt Plugin"
                value={form.name}
                onChange={(_e, val) => updateField('name', val)}
              />
            </FormGroup>
          </FormSection>

          <FormSection title="Scope" titleElement="h3">
            <FormGroup isRequired fieldId="wr-component" label="Component">
              <FormSelect
                id="wr-component"
                value={form.component}
                onChange={(_e, val) => updateField('component', val)}
              >
                {form.component === '' && (
                  <FormSelectOption isDisabled label="Select a component..." value="" />
                )}
                {availableComponents.map(comp => (
                  <FormSelectOption key={comp} label={comp} value={comp} />
                ))}
                {form.component && !availableComponents.includes(form.component) && (
                  <FormSelectOption label={form.component} value={form.component} />
                )}
              </FormSelect>
              <HelperText>
                <HelperTextItem>
                  When you filter the weekly report by component, only repos assigned to that
                  component will be polled.
                </HelperTextItem>
              </HelperText>
            </FormGroup>

            <FormGroup fieldId="wr-enabled" label="Enabled">
              <Switch
                id="wr-enabled"
                isChecked={form.enabled}
                label="Active"
                onChange={(_e, checked) => updateField('enabled', checked)}
              />
            </FormGroup>
          </FormSection>

          {error && (
            <Alert isInline className="app-mt-md" title="Failed to save" variant="danger">
              {error}
            </Alert>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!canSubmit || isPending}
          isLoading={isPending}
          variant="primary"
          onClick={() => onSave(form)}
        >
          {mode === 'add' ? 'Add Repository' : 'Save Changes'}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const DeleteConfirmModal = ({
  isOpen,
  name,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Modal isOpen={isOpen} variant={ModalVariant.small} onClose={onClose}>
    <ModalHeader title="Remove repository?" />
    <ModalBody>
      <Content component="p">
        Are you sure you want to remove <strong>{name}</strong>? This will stop collecting data from
        this repository in future weekly reports.
      </Content>
    </ModalBody>
    <ModalFooter>
      <Button variant="danger" onClick={onConfirm}>
        Remove
      </Button>
      <Button variant="link" onClick={onClose}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export const WeeklyRepoSettings = () => {
  const queryClient = useQueryClient();
  const { availableComponents } = useComponentFilter();

  const { data: repos = [] } = useQuery({
    queryFn: () => fetchWeeklyRepos(),
    queryKey: ['weeklyRepos'],
    staleTime: FIVE_MINUTES_MS,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWeeklyRepo) => createWeeklyRepoApi(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyRepos'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ data, id }: { data: Partial<CreateWeeklyRepo>; id: string }) =>
      updateWeeklyRepoApi(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyRepos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWeeklyRepoApi(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyRepos'] });
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<WeeklyRepo | null>(null);

  const openAdd = () => {
    setInitialForm({ ...EMPTY_FORM, component: availableComponents[0] ?? '' });
    setModalMode('add');
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (repo: WeeklyRepo) => {
    setInitialForm({
      component: repo.component,
      enabled: repo.enabled,
      name: repo.name,
      url: repo.url,
    });
    setModalMode('edit');
    setEditId(repo.id);
    setModalOpen(true);
  };

  const handleSave = (form: FormState) => {
    const data: CreateWeeklyRepo = {
      component: form.component,
      enabled: form.enabled,
      name: form.name,
      url: form.url,
    };

    if (modalMode === 'add') {
      createMutation.mutate(data, { onSuccess: () => setModalOpen(false) });
    } else if (editId) {
      updateMutation.mutate({ data, id: editId }, { onSuccess: () => setModalOpen(false) });
    }
  };

  const handleToggleEnabled = (repo: WeeklyRepo) => {
    updateMutation.mutate({ data: { enabled: !repo.enabled }, id: repo.id });
  };

  const mutationError = createMutation.isError
    ? createMutation.error.message
    : updateMutation.isError
      ? updateMutation.error.message
      : undefined;

  return (
    <>
      <Card>
        <CardHeader
          actions={{
            actions: (
              <Button icon={<PlusCircleIcon />} size="sm" variant="primary" onClick={openAdd}>
                Add Repository
              </Button>
            ),
          }}
        >
          <CardTitle>Team Report &mdash; Repositories</CardTitle>
        </CardHeader>
        <CardBody>
          {repos.length === 0 ? (
            <EmptyState headingLevel="h3" icon={RepositoryIcon} titleText="No repositories">
              <EmptyStateBody>
                Add GitHub or GitLab repositories to collect PRs, commits, and MRs for the weekly
                team report. Each component can have its own set of repos. Authentication uses the
                global tokens from the Integrations section above.
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <Table aria-label="Weekly report repositories" variant="compact">
              <Thead>
                <Tr>
                  <Th>Repository</Th>
                  <Th>Component</Th>
                  <Th>URL</Th>
                  <Th>Enabled</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {repos.map(repo => (
                  <Tr key={repo.id}>
                    <Td dataLabel="Repository">
                      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                        <FlexItem>
                          {repo.provider === 'github' ? <GithubIcon /> : <GitlabIcon />}
                        </FlexItem>
                        <FlexItem>
                          <strong>{repo.name}</strong>
                        </FlexItem>
                        <FlexItem>
                          <Label isCompact color={repo.provider === 'github' ? 'blue' : 'orange'}>
                            {repo.provider === 'github' ? 'GitHub' : 'GitLab'}
                          </Label>
                        </FlexItem>
                      </Flex>
                    </Td>
                    <Td dataLabel="Component">
                      <Label isCompact variant="outline">
                        {repo.component}
                      </Label>
                    </Td>
                    <Td dataLabel="URL">
                      <a href={repo.url} rel="noreferrer" target="_blank">
                        {repo.url}
                      </a>
                    </Td>
                    <Td dataLabel="Enabled">
                      <Switch
                        aria-label={`Toggle ${repo.name}`}
                        isChecked={repo.enabled}
                        onChange={() => handleToggleEnabled(repo)}
                      />
                    </Td>
                    <Td isActionCell>
                      <Flex gap={{ default: 'gapSm' }}>
                        <FlexItem>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(repo)}>
                            Edit
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <Button
                            isDanger
                            size="sm"
                            variant="secondary"
                            onClick={() => setDeleteTarget(repo)}
                          >
                            Remove
                          </Button>
                        </FlexItem>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <RepoFormModal
        availableComponents={availableComponents}
        error={mutationError}
        initial={initialForm}
        isOpen={modalOpen}
        isPending={createMutation.isPending || updateMutation.isPending}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        name={deleteTarget?.name ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
          }
        }}
      />
    </>
  );
};
