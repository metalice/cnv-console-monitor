import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

import { ImpersonationButton } from './ImpersonationButton';
import type { UserRecord } from './types';

export const UserManagement = () => {
  const { isAdmin } = useAuth();

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
            <ImpersonationButton />
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
