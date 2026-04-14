import React, { useEffect, useState } from 'react';

import { type TeamMember, type TeamMemberCreate, type TeamMemberUpdate } from '@cnv-monitor/shared';

import {
  Button,
  Checkbox,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  FormGroup,
  Label,
  MenuToggle,
  type MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Switch,
  TextInput,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import {
  ExclamationTriangleIcon,
  PlusCircleIcon,
  RedoIcon,
  TimesIcon,
  UsersIcon,
} from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useQuery } from '@tanstack/react-query';

import { fetchAvailableUsers, restoreDeletedMembers } from '../api/weeklyTeam';
import { PollProgress } from '../components/weekly/PollProgress';
import { useWeeklyPollStatus } from '../hooks/useWeeklyPollStatus';
import {
  useCreateTeamMember,
  useDeleteTeamMember,
  useTeamMembers,
  useUpdateTeamMember,
} from '../hooks/useWeeklyTeam';

type ModalMode = 'add' | 'edit';

const CONFIDENCE_THRESHOLDS = { high: 0.8, medium: 0.5 };

const getConfidenceColor = (
  confidence: number | null | undefined,
): 'blue' | 'orange' | 'grey' | 'green' => {
  if (confidence == null) return 'grey';
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'green';
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'orange';
  return 'blue';
};

const getConfidenceLabel = (confidence: number | null | undefined): string => {
  if (confidence == null) return 'N/A';
  return `${Math.round(confidence * 100)}%`;
};

const EMPTY_FORM: TeamMemberCreate = {
  aiMapped: false,
  displayName: '',
  githubUsername: '',
  gitlabUsername: '',
  isActive: true,
  jiraAccountId: '',
};

const UserSearchSelect = ({
  crossPlatformUsers,
  id,
  label,
  onSelect,
  options,
  value,
}: {
  crossPlatformUsers?: Set<string>;
  id: string;
  label: string;
  onSelect: (val: string | null) => void;
  options: string[];
  value: string | null;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const lowerFilter = filter.toLowerCase();
  const matchesFilter = filter
    ? options.filter(user => user.toLowerCase().includes(lowerFilter))
    : options;
  const filtered = [...matchesFilter].sort((first, second) => {
    const firstMatch = crossPlatformUsers?.has(first) ? 0 : 1;
    const secondMatch = crossPlatformUsers?.has(second) ? 0 : 1;
    return firstMatch - secondMatch || first.localeCompare(second);
  });

  const handleSelect = (_e: unknown, val: string | number | undefined) => {
    const selected = String(val);
    onSelect(selected === '__clear__' ? null : selected);
    setIsOpen(false);
    setFilter('');
  };

  return (
    <Select
      isScrollable
      aria-label={label}
      isOpen={isOpen}
      selected={value ?? undefined}
      // eslint-disable-next-line react/no-unstable-nested-components
      toggle={(toggleRefCb: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          isFullWidth
          isExpanded={isOpen}
          ref={toggleRefCb}
          variant="typeahead"
          onClick={() => setIsOpen(prev => !prev)}
        >
          <TextInputGroup>
            <TextInputGroupMain
              aria-label={`Search ${label}`}
              id={`${id}-search`}
              placeholder={value ?? `Search ${label.toLowerCase()}...`}
              value={filter}
              onChange={(_e, val) => setFilter(val)}
              onClick={() => setIsOpen(true)}
            />
            {(filter || value) && (
              <TextInputGroupUtilities>
                <Button
                  aria-label="Clear"
                  icon={<TimesIcon />}
                  variant="plain"
                  onClick={() => {
                    setFilter('');
                    if (value) onSelect(null);
                  }}
                />
              </TextInputGroupUtilities>
            )}
          </TextInputGroup>
        </MenuToggle>
      )}
      onOpenChange={setIsOpen}
      onSelect={handleSelect}
    >
      <SelectList style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {value && (
          <SelectOption description="Remove mapping" value="__clear__">
            — Not mapped —
          </SelectOption>
        )}
        {filtered.length === 0 && (
          <SelectOption isDisabled value="__empty__">
            {filter ? 'No matches' : 'No users available — run a poll first'}
          </SelectOption>
        )}
        {filtered.map(user => (
          <SelectOption
            description={crossPlatformUsers?.has(user) ? 'Also on other platform' : undefined}
            isSelected={user === value}
            key={user}
            value={user}
          >
            {user}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

const TeamMemberModal = ({
  isOpen,
  member,
  mode,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  member: TeamMemberCreate;
  mode: ModalMode;
  onClose: () => void;
  onSave: (data: TeamMemberCreate) => void;
}) => {
  const [form, setForm] = useState(member);

  const { data: available, isLoading: loadingUsers } = useQuery({
    enabled: isOpen,
    queryFn: () => fetchAvailableUsers(),
    queryKey: ['weeklyTeam', 'availableUsers'],
    staleTime: 30_000,
  });

  useEffect(() => {
    if (isOpen) setForm(member);
  }, [isOpen, member]);

  const updateField = <K extends keyof TeamMemberCreate>(key: K, value: TeamMemberCreate[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!form.displayName.trim()) return;
    onSave(form);
  };

  const githubOptions = available?.githubUsers ?? [];
  const gitlabOptions = available?.gitlabUsers ?? [];

  const githubSet = new Set(githubOptions);
  const gitlabSet = new Set(gitlabOptions);
  const ghUsersOnGitlab = new Set(githubOptions.filter(user => gitlabSet.has(user)));
  const glUsersOnGithub = new Set(gitlabOptions.filter(user => githubSet.has(user)));

  const handleGithubSelect = (val: string | null) => {
    updateField('githubUsername', val);
    if (val && gitlabSet.has(val) && !form.gitlabUsername) {
      updateField('gitlabUsername', val);
    }
  };

  const handleGitlabSelect = (val: string | null) => {
    updateField('gitlabUsername', val);
    if (val && githubSet.has(val) && !form.githubUsername) {
      updateField('githubUsername', val);
    }
  };

  const title = mode === 'add' ? 'Add Team Member' : `Edit — ${member.displayName}`;
  const description =
    mode === 'edit'
      ? 'Map this Jira user to their GitHub and GitLab accounts. Users on both platforms are shown first.'
      : undefined;

  return (
    <Modal aria-label={title} isOpen={isOpen} variant="medium" onClose={onClose}>
      <ModalHeader description={description} title={title} />
      <ModalBody>
        <FormGroup isRequired fieldId="displayName" label="Display Name">
          <TextInput
            isRequired
            id="displayName"
            value={form.displayName}
            onChange={(_e, val) => updateField('displayName', val)}
          />
        </FormGroup>

        <FormGroup fieldId="githubUsername" label="GitHub Account">
          {loadingUsers ? (
            <Spinner aria-label="Loading GitHub users" size="md" />
          ) : (
            <UserSearchSelect
              crossPlatformUsers={ghUsersOnGitlab}
              id="githubUsername"
              label="GitHub users"
              options={githubOptions}
              value={form.githubUsername ?? null}
              onSelect={handleGithubSelect}
            />
          )}
        </FormGroup>

        <FormGroup fieldId="gitlabUsername" label="GitLab Account">
          {loadingUsers ? (
            <Spinner aria-label="Loading GitLab users" size="md" />
          ) : (
            <UserSearchSelect
              crossPlatformUsers={glUsersOnGithub}
              id="gitlabUsername"
              label="GitLab users"
              options={gitlabOptions}
              value={form.gitlabUsername ?? null}
              onSelect={handleGitlabSelect}
            />
          )}
        </FormGroup>

        <FormGroup fieldId="email" label="Email">
          <TextInput
            id="email"
            type="email"
            value={form.email ?? ''}
            onChange={(_e, val) => updateField('email', val || null)}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button isDisabled={!form.displayName.trim()} variant="primary" onClick={handleSave}>
          {mode === 'add' ? 'Add' : 'Save'}
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
  memberName,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  memberName: string;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Modal aria-label="Delete team member" isOpen={isOpen} variant="small" onClose={onClose}>
    <ModalHeader title="Delete team member?" />
    <ModalBody>
      Are you sure you want to remove <strong>{memberName}</strong> from the team?
    </ModalBody>
    <ModalFooter>
      <Button variant="danger" onClick={onConfirm}>
        Delete
      </Button>
      <Button variant="link" onClick={onClose}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export const WeeklyTeamPage = () => {
  useEffect(() => {
    document.title = 'Weekly Team | CNV Console Monitor';
  }, []);

  const { data: members, error, isLoading } = useTeamMembers();
  const pollStatus = useWeeklyPollStatus();
  const createMutation = useCreateTeamMember();
  const updateMutation = useUpdateTeamMember();
  const deleteMutation = useDeleteTeamMember();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [remapOpen, setRemapOpen] = useState(false);
  const [restoreDeleted, setRestoreDeleted] = useState(false);

  const handleRemap = async () => {
    setRemapOpen(false);
    if (restoreDeleted) {
      await restoreDeletedMembers();
    }
    await pollStatus.trigger();
    setRestoreDeleted(false);
  };

  const openAdd = () => {
    setEditMember(null);
    setModalMode('add');
    setModalOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditMember(member);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleSave = (data: TeamMemberCreate) => {
    if (modalMode === 'add') {
      createMutation.mutate(data, { onSuccess: () => setModalOpen(false) });
    } else if (editMember) {
      const update: TeamMemberUpdate = { ...data };
      updateMutation.mutate(
        { data: update, id: editMember.id },
        { onSuccess: () => setModalOpen(false) },
      );
    }
  };

  const handleToggleActive = (member: TeamMember) => {
    updateMutation.mutate({
      data: { isActive: !member.isActive },
      id: member.id,
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  if (isLoading) {
    return (
      <div className="app-page-spinner">
        <Spinner aria-label="Loading team members" />
      </div>
    );
  }

  if (error) {
    return (
      <PageSection>
        <EmptyState headingLevel="h2" icon={ExclamationTriangleIcon} titleText="Error loading team">
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const formData: TeamMemberCreate = editMember
    ? {
        aiMapped: editMember.aiMapped,
        component: editMember.component,
        displayName: editMember.displayName,
        email: editMember.email,
        githubUsername: editMember.githubUsername,
        gitlabUsername: editMember.gitlabUsername,
        isActive: editMember.isActive,
        jiraAccountId: editMember.jiraAccountId,
      }
    : EMPTY_FORM;

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Weekly Team</Content>
            <Content component="small">
              {members?.length ?? 0} team member{members?.length !== 1 ? 's' : ''}
            </Content>
          </FlexItem>
          <FlexItem>
            <Flex gap={{ default: 'gapSm' }}>
              <FlexItem>
                <Button icon={<PlusCircleIcon />} variant="primary" onClick={openAdd}>
                  Add Member
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  icon={<RedoIcon />}
                  isDisabled={pollStatus.status.status === 'running' || pollStatus.isStarting}
                  isLoading={pollStatus.status.status === 'running' || pollStatus.isStarting}
                  variant="secondary"
                  onClick={() => setRemapOpen(true)}
                >
                  Re-map Identities
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      {pollStatus.status.status === 'running' && (
        <PageSection>
          <PollProgress
            isStarting={pollStatus.isStarting}
            status={pollStatus.status}
            onTrigger={pollStatus.trigger}
          />
        </PageSection>
      )}

      <PageSection>
        {!members?.length ? (
          <EmptyState headingLevel="h2" icon={UsersIcon} titleText="No team members">
            <EmptyStateBody>
              Add your first team member to start generating weekly reports.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <Table aria-label="Team members" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Component</Th>
                <Th>GitHub</Th>
                <Th>GitLab</Th>
                <Th>Jira</Th>
                <Th>AI Mapped</Th>
                <Th>Active</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {members.map(member => (
                <Tr key={member.id}>
                  <Td dataLabel="Name">{member.displayName}</Td>
                  <Td dataLabel="Component">{member.component ?? '\u2014'}</Td>
                  <Td dataLabel="GitHub">{member.githubUsername ?? '\u2014'}</Td>
                  <Td dataLabel="GitLab">{member.gitlabUsername ?? '\u2014'}</Td>
                  <Td dataLabel="Jira">{member.jiraAccountId ?? '\u2014'}</Td>
                  <Td dataLabel="AI Mapped">
                    {member.aiMapped ? (
                      <Label color={getConfidenceColor(member.mappingConfidence)}>
                        {getConfidenceLabel(member.mappingConfidence)}
                      </Label>
                    ) : (
                      <Label color="grey">Manual</Label>
                    )}
                  </Td>
                  <Td dataLabel="Active">
                    <Switch
                      aria-label={`Toggle ${member.displayName} active`}
                      isChecked={member.isActive}
                      onChange={() => handleToggleActive(member)}
                    />
                  </Td>
                  <Td isActionCell dataLabel="Actions">
                    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <Button size="sm" variant="secondary" onClick={() => openEdit(member)}>
                          Edit
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(member)}>
                          Delete
                        </Button>
                      </FlexItem>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>

      <TeamMemberModal
        isOpen={modalOpen}
        member={formData}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        memberName={deleteTarget?.displayName ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <Modal
        aria-label="Re-map identities"
        isOpen={remapOpen}
        variant="small"
        onClose={() => setRemapOpen(false)}
      >
        <ModalHeader title="Re-map Team Identities" />
        <ModalBody>
          <Content component="p">
            This will re-run the AI identity mapping to match GitHub, GitLab, and Jira usernames
            across all configured repositories.
          </Content>
          <Checkbox
            className="app-mt-md"
            id="restore-deleted"
            isChecked={restoreDeleted}
            label="Restore previously removed members"
            onChange={(_e, checked) => setRestoreDeleted(checked)}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => {
              handleRemap().catch(() => undefined);
            }}
          >
            Re-map
          </Button>
          <Button variant="link" onClick={() => setRemapOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
