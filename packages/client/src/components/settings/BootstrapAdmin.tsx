import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Form,
  FormGroup,
  TextInput,
} from '@patternfly/react-core';
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

import type { AlertMessage } from './types';

export const BootstrapAdmin = () => {
  const { isAdmin } = useAuth();
  const { data: adminStatus } = useQuery({
    queryFn: () => apiFetch<{ hasAdmin: boolean }>('/admin/has-admin'),
    queryKey: ['adminStatus'],
    staleTime: 60 * 1000,
  });

  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapMsg, setBootstrapMsg] = useState<AlertMessage | null>(null);

  const bootstrapMutation = useMutation({
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
            isLoading={bootstrapMutation.isPending}
            size="sm"
            variant="primary"
            onClick={() => bootstrapMutation.mutate()}
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
