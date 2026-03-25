import React, { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Label,
  Spinner,
  TextInput,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

import type { AlertMessage, UserRecord } from './types';

export const UserManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const currentImpersonation = new URLSearchParams(window.location.search).get('impersonate');

  const { data: adminUsers, refetch: refetchUsers } = useQuery({
    enabled: isAdmin,
    queryFn: () => apiFetch<UserRecord[]>('/admin/users'),
    queryKey: ['adminUsers'],
    staleTime: 30 * 1000,
  });

  const setRole = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      apiFetch(`/admin/users/${encodeURIComponent(email)}/role`, {
        body: JSON.stringify({ role }),
        method: 'PUT',
      }),
    onSuccess: () => refetchUsers(),
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>User Management</FlexItem>
          <FlexItem>
            {currentImpersonation ? (
              <Button
                size="sm"
                variant="link"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('impersonate');
                  window.location.href = url.toString();
                }}
              >
                Stop impersonating {currentImpersonation}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('impersonate', 'testuser@redhat.com');
                  window.location.href = url.toString();
                }}
              >
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
          <Alert isInline title="No users have logged in yet." variant="info" />
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
                {adminUsers.map(usr => (
                  <Tr key={usr.email}>
                    <Td className="app-cell-nowrap">{usr.email}</Td>
                    <Td className="app-cell-nowrap">{usr.name}</Td>
                    <Td>
                      <Label isCompact color={usr.role === 'admin' ? 'purple' : 'grey'}>
                        {usr.role}
                      </Label>
                    </Td>
                    <Td className="app-cell-nowrap">
                      {usr.lastLogin ? new Date(usr.lastLogin).toLocaleString() : 'Never'}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() =>
                          setRole.mutate({
                            email: usr.email,
                            role: usr.role === 'admin' ? 'user' : 'admin',
                          })
                        }
                      >
                        {usr.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
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
    queryFn: () => apiFetch<{ hasAdmin: boolean }>('/admin/has-admin'),
    queryKey: ['adminStatus'],
    staleTime: 60 * 1000,
  });

  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapMsg, setBootstrapMsg] = useState<AlertMessage | null>(null);

  const bootstrapAdmin = useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean }>('/admin/bootstrap', {
        body: JSON.stringify({ secret: bootstrapSecret }),
        method: 'POST',
      }),
    onError: e => setBootstrapMsg({ text: e.message, type: 'danger' }),
    onSuccess: () =>
      setBootstrapMsg({ text: 'You are now an admin. Reload the page.', type: 'success' }),
  });

  if (isAdmin || adminStatus?.hasAdmin) {
    return null;
  }

  return (
    <Card>
      <CardTitle>Become Admin</CardTitle>
      <CardBody>
        <Content className="app-text-muted app-mb-md" component="small">
          No admin has been set up yet. Enter the admin secret (configured in the server
          environment) to claim admin privileges.
        </Content>
        <Form>
          <FormGroup fieldId="bootstrap-secret" label="Admin Secret">
            <TextInput
              id="bootstrap-secret"
              placeholder="Enter the admin secret"
              type="password"
              value={bootstrapSecret}
              onChange={(_e, value) => setBootstrapSecret(value)}
            />
          </FormGroup>
          <Button
            isDisabled={!bootstrapSecret.trim()}
            isLoading={bootstrapAdmin.isPending}
            size="sm"
            variant="primary"
            onClick={() => bootstrapAdmin.mutate()}
          >
            Bootstrap Admin
          </Button>
          {bootstrapMsg && (
            <Alert
              isInline
              isPlain
              className="app-mt-sm"
              title={bootstrapMsg.text}
              variant={bootstrapMsg.type}
            />
          )}
        </Form>
      </CardBody>
    </Card>
  );
};
