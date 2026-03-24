import React, { useState } from 'react';

import {
  Alert,
  Bullseye,
  Button,
  Content,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { CopyIcon, MagicIcon } from '@patternfly/react-icons';
import { useMutation } from '@tanstack/react-query';

type AIActionButtonProps = {
  label: string;
  description: string;
  help?: string;
  apiCall: () => Promise<{
    result?: Record<string, unknown>;
    response?: string;
    model: string;
    cached: boolean;
    tokensUsed?: number;
    durationMs?: number;
  }>;
  variant?: 'primary' | 'secondary' | 'link';
  size?: 'sm' | 'lg';
};

export const AIActionButton: React.FC<AIActionButtonProps> = ({
  apiCall,
  description,
  help,
  label,
  size = 'sm',
  variant = 'secondary',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const mutation = useMutation({ mutationFn: apiCall });

  const handleClick = () => {
    setIsOpen(true);
    mutation.mutate();
  };

  const resultText = mutation.data
    ? mutation.data.response || JSON.stringify(mutation.data.result, null, 2)
    : '';

  return (
    <>
      {help ? (
        <Tooltip content={help}>
          <Button
            icon={<MagicIcon />}
            isLoading={mutation.isPending}
            size={size}
            variant={variant}
            onClick={handleClick}
          >
            {label}
          </Button>
        </Tooltip>
      ) : (
        <Button
          icon={<MagicIcon />}
          isLoading={mutation.isPending}
          size={size}
          variant={variant}
          onClick={handleClick}
        >
          {label}
        </Button>
      )}
      <Modal isOpen={isOpen} variant={ModalVariant.large} onClose={() => setIsOpen(false)}>
        <ModalHeader title={label} />
        <ModalBody>
          {mutation.isPending && (
            <Bullseye className="app-card-spinner">
              <div className="app-text-block-center">
                <Spinner size="lg" />
                <Content className="app-text-muted app-mt-md" component="p">
                  {description}
                </Content>
              </div>
            </Bullseye>
          )}
          {mutation.isError && (
            <Alert
              isInline
              title={mutation.error instanceof Error ? mutation.error.message : 'AI request failed'}
              variant="danger"
            />
          )}
          {mutation.isSuccess && mutation.data && (
            <div>
              <Flex
                className="app-mb-md"
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
              >
                <FlexItem>
                  <Label isCompact color="blue">
                    {mutation.data.model}
                  </Label>
                  {mutation.data.tokensUsed && (
                    <span className="app-text-xs app-text-muted app-ml-sm">
                      {mutation.data.tokensUsed} tokens
                    </span>
                  )}
                  {mutation.data.cached && (
                    <Label isCompact className="app-ml-sm" color="grey">
                      cached
                    </Label>
                  )}
                </FlexItem>
              </Flex>
              {mutation.data.response ? (
                <div className="app-changelog-raw">
                  {mutation.data.response.split('\n').map((line, i) => (
                    <Content className="app-text-xs" component="p" key={i}>
                      {line || '\u00a0'}
                    </Content>
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
            <Button
              icon={<CopyIcon />}
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(resultText)}
            >
              Copy
            </Button>
          )}
          <Button variant="link" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

const AIResultDisplay: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  if (data.raw) {
    return (
      <div className="app-changelog-raw">
        {String(data.raw)
          .split('\n')
          .map((line, i) => (
            <Content className="app-text-xs" component="p" key={i}>
              {line || '\u00a0'}
            </Content>
          ))}
      </div>
    );
  }

  return (
    <div>
      {Object.entries(data).map(([key, value]) => {
        if (value === null || value === undefined) {
          return null;
        }
        if (typeof value === 'string') {
          return (
            <div className="app-mb-sm" key={key}>
              <Content component="h5">{key.replace(/([A-Z])/g, ' $1').trim()}</Content>
              <Content className="app-text-xs" component="p">
                {value}
              </Content>
            </div>
          );
        }
        if (Array.isArray(value)) {
          return (
            <div className="app-mb-sm" key={key}>
              <Content component="h5">
                {key.replace(/([A-Z])/g, ' $1').trim()} ({value.length})
              </Content>
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
            <div className="app-mb-sm" key={key}>
              <Content component="h5">{key.replace(/([A-Z])/g, ' $1').trim()}</Content>
              <pre className="app-text-xs app-ack-notes">{JSON.stringify(value, null, 2)}</pre>
            </div>
          );
        }
        return (
          <div className="app-mb-sm" key={key}>
            <strong className="app-text-xs">{key}:</strong>{' '}
            <span className="app-text-xs">{String(value)}</span>
          </div>
        );
      })}
    </div>
  );
};
