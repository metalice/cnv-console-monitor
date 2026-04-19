import { useEffect, useState } from 'react';

import { type TeamMember, type TeamMemberCreate, type TeamMemberUpdate } from '@cnv-monitor/shared';

import {
  Button,
  Checkbox,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Spinner,
  Switch,
} from '@patternfly/react-core';
import {
  ExclamationTriangleIcon,
  PlusCircleIcon,
  RedoIcon,
  UsersIcon,
} from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { restoreDeletedMembers } from '../api/reportTeam';
import { PollProgress } from '../components/report/PollProgress';
import { DeleteConfirmModal, TeamMemberModal } from '../components/report/TeamMemberModal';
import { useReportPollStatus } from '../hooks/useReportPollStatus';
import {
  useCreateTeamMember,
  useDeleteTeamMember,
  useTeamMembers,
  useUpdateTeamMember,
} from '../hooks/useReportTeam';

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

export const ReportTeamPage = () => {
  useEffect(() => {
    document.title = 'Team Members | CNV Console Monitor';
  }, []);

  const { data: members, error, isLoading } = useTeamMembers();
  const pollStatus = useReportPollStatus({ silent: true });
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
            <Content component="h1">Team Members</Content>
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
          <PollProgress status={pollStatus.status} />
        </PageSection>
      )}

      <PageSection>
        {!members?.length ? (
          <EmptyState headingLevel="h2" icon={UsersIcon} titleText="No team members">
            <EmptyStateBody>
              Add your first team member to start generating team reports.
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
                <Tr className={member.isActive ? '' : 'app-row-inactive'} key={member.id}>
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
