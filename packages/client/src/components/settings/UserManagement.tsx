import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Button,
  Alert,
  Label,
  Spinner,
  Content,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { UserRecord, AlertMessage } from './types';

export const UserManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const currentImpersonation = new URLSearchParams(window.location.search).get('impersonate');

  const { data: adminUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => apiFetch<UserRecord[]>('/admin/users'),
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });

  const setRole = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      apiFetch(`/admin/users/${encodeURIComponent(email)}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    onSuccess: () => refetchUsers(),
  });

  if (!isAdmin) return null;

  return (
    <Card>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>User Management</FlexItem>
          <FlexItem>
            {currentImpersonation ? (
              <Button variant="link" size="sm" onClick={() => { const url = new URL(window.location.href); url.searchParams.delete('impersonate'); window.location.href = url.toString(); }}>
                Stop impersonating {currentImpersonation}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => { const url = new URL(window.location.href); url.searchParams.set('impersonate', 'testuser@redhat.com'); window.location.href = url.toString(); }}>
                Impersonate Test User
              </Button>
            )}
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        {!adminUsers ? (
          <Spinner aria-label="Loading users" />
        ) : adminUsers.length === 0 ? (
          <Alert variant="info" isInline title="No users have logged in yet." />
        ) : (
          <div className="app-table-scroll">
            <Table aria-label="Users" variant="compact">
              <Thead>
                <Tr>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Last Login</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {adminUsers.map(u => (
                  <Tr key={u.email}>
                    <Td className="app-cell-nowrap">{u.email}</Td>
                    <Td className="app-cell-nowrap">{u.name}</Td>
                    <Td><Label color={u.role === 'admin' ? 'purple' : 'grey'} isCompact>{u.role}</Label></Td>
                    <Td className="app-cell-nowrap">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</Td>
                    <Td>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setRole.mutate({ email: u.email, role: u.role === 'admin' ? 'user' : 'admin' })}
                      >
                        {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export const BootstrapAdmin: React.FC = () => {
  const { isAdmin } = useAuth();
  const { data: adminStatus } = useQuery({
    queryKey: ['adminStatus'],
    queryFn: () => apiFetch<{ hasAdmin: boolean }>('/admin/has-admin'),
    staleTime: 60 * 1000,
  });

  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapMsg, setBootstrapMsg] = useState<AlertMessage | null>(null);

  const bootstrapAdmin = useMutation({
    mutationFn: () => apiFetch<{ success: boolean }>('/admin/bootstrap', { method: 'POST', body: JSON.stringify({ secret: bootstrapSecret }) }),
    onSuccess: () => setBootstrapMsg({ type: 'success', text: 'You are now an admin. Reload the page.' }),
    onError: (e) => setBootstrapMsg({ type: 'danger', text: (e as Error).message }),
  });

  if (isAdmin || adminStatus?.hasAdmin) return null;

  return (
    <Card>
      <CardTitle>Become Admin</CardTitle>
      <CardBody>
        <Content component="small" className="app-text-muted app-mb-md">
          No admin has been set up yet. Enter the admin secret (configured in the server environment) to claim admin privileges.
        </Content>
        <Form>
          <FormGroup label="Admin Secret" fieldId="bootstrap-secret">
            <TextInput
              id="bootstrap-secret"
              type="password"
              value={bootstrapSecret}
              onChange={(_e, v) => setBootstrapSecret(v)}
              placeholder="Enter the admin secret"
            />
          </FormGroup>
          <Button variant="primary" size="sm" onClick={() => bootstrapAdmin.mutate()} isDisabled={!bootstrapSecret.trim()} isLoading={bootstrapAdmin.isPending}>
            Bootstrap Admin
          </Button>
          {bootstrapMsg && <Alert variant={bootstrapMsg.type} isInline isPlain title={bootstrapMsg.text} className="app-mt-sm" />}
        </Form>
      </CardBody>
    </Card>
  );
};
