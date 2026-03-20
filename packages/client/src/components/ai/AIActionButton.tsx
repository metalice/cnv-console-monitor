import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button, Modal, ModalVariant, ModalHeader, ModalBody, ModalFooter,
  Content, Spinner, Bullseye, Alert, Label, Flex, FlexItem,
} from '@patternfly/react-core';
import { MagicIcon, CopyIcon } from '@patternfly/react-icons';

type AIActionButtonProps = {
  label: string;
  description: string;
  apiCall: () => Promise<{ result?: Record<string, unknown>; response?: string; model: string; cached: boolean; tokensUsed?: number; durationMs?: number }>;
  variant?: 'primary' | 'secondary' | 'link';
  size?: 'sm' | 'lg';
};

export const AIActionButton: React.FC<AIActionButtonProps> = ({ label, description, apiCall, variant = 'secondary', size = 'sm' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const mutation = useMutation({ mutationFn: apiCall });

  const handleClick = () => {
    setIsOpen(true);
    mutation.mutate();
  };

  const resultText = mutation.data
    ? (mutation.data.response || JSON.stringify(mutation.data.result, null, 2))
    : '';

  return (
    <>
      <Button variant={variant} icon={<MagicIcon />} onClick={handleClick} size={size} isLoading={mutation.isPending}>
        {label}
      </Button>
      <Modal variant={ModalVariant.large} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalHeader title={label} />
        <ModalBody>
          {mutation.isPending && (
            <Bullseye className="app-card-spinner">
              <div className="app-text-block-center">
                <Spinner size="lg" />
                <Content component="p" className="app-text-muted app-mt-md">{description}</Content>
              </div>
            </Bullseye>
          )}
          {mutation.isError && (
            <Alert variant="danger" isInline title={mutation.error instanceof Error ? mutation.error.message : 'AI request failed'} />
          )}
          {mutation.isSuccess && mutation.data && (
            <div>
              <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} className="app-mb-md">
                <FlexItem>
                  <Label color="blue" isCompact>{mutation.data.model}</Label>
                  {mutation.data.tokensUsed && <span className="app-text-xs app-text-muted app-ml-sm">{mutation.data.tokensUsed} tokens</span>}
                  {mutation.data.cached && <Label color="grey" isCompact className="app-ml-sm">cached</Label>}
                </FlexItem>
              </Flex>
              {mutation.data.response ? (
                <div className="app-changelog-raw">
                  {mutation.data.response.split('\n').map((line, i) => (
                    <Content key={i} component="p" className="app-text-xs">{line || '\u00a0'}</Content>
                  ))}
                </div>
              ) : mutation.data.result ? (
                <AIResultDisplay data={mutation.data.result} />
              ) : null}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {mutation.isSuccess && (
            <Button variant="secondary" icon={<CopyIcon />} onClick={() => navigator.clipboard.writeText(resultText)}>
              Copy
            </Button>
          )}
          <Button variant="link" onClick={() => setIsOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

const AIResultDisplay: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  if (data.raw) {
    return (
      <div className="app-changelog-raw">
        {String(data.raw).split('\n').map((line, i) => (
          <Content key={i} component="p" className="app-text-xs">{line || '\u00a0'}</Content>
        ))}
      </div>
    );
  }

  return (
    <div>
      {Object.entries(data).map(([key, value]) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
          return (
            <div key={key} className="app-mb-sm">
              <Content component="h5">{key.replace(/([A-Z])/g, ' $1').trim()}</Content>
              <Content component="p" className="app-text-xs">{value}</Content>
            </div>
          );
        }
        if (Array.isArray(value)) {
          return (
            <div key={key} className="app-mb-sm">
              <Content component="h5">{key.replace(/([A-Z])/g, ' $1').trim()} ({value.length})</Content>
              <ul className="app-text-xs">
                {value.map((item, i) => (
                  <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (typeof value === 'object') {
          return (
            <div key={key} className="app-mb-sm">
              <Content component="h5">{key.replace(/([A-Z])/g, ' $1').trim()}</Content>
              <pre className="app-text-xs app-ack-notes">{JSON.stringify(value, null, 2)}</pre>
            </div>
          );
        }
        return (
          <div key={key} className="app-mb-sm">
            <strong className="app-text-xs">{key}:</strong> <span className="app-text-xs">{String(value)}</span>
          </div>
        );
      })}
    </div>
  );
};

