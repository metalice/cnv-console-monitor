import React, { useEffect, useState } from 'react';

import { type TeamMemberCreate } from '@cnv-monitor/shared';

import {
  Button,
  FormGroup,
  MenuToggle,
  type MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  TextInput,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchAvailableUsers } from '../../api/weeklyTeam';

type ModalMode = 'add' | 'edit';

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

export const TeamMemberModal = ({
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

export const DeleteConfirmModal = ({
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
