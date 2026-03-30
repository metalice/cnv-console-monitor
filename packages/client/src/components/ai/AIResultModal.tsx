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
} from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import { type UseMutationResult } from '@tanstack/react-query';

import { AIResultDisplay } from './AIResultDisplay';

type AIResponse = {
  result?: Record<string, unknown>;
  response?: string;
  model: string;
  cached: boolean;
  tokensUsed?: number;
  durationMs?: number;
};

type AIResultModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  mutation: UseMutationResult<AIResponse, Error, void>;
  onClose: () => void;
};

export const AIResultModal = ({
  description,
  isOpen,
  mutation,
  onClose,
  title,
}: AIResultModalProps) => {
  const resultText = mutation.data
    ? mutation.data.response || JSON.stringify(mutation.data.result, null, 2)
    : '';

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.large} onClose={onClose}>
      <ModalHeader title={title} />
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
        {mutation.isSuccess && (
          <div>
            <Flex className="app-mb-md" justifyContent={{ default: 'justifyContentSpaceBetween' }}>
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
                  // eslint-disable-next-line react/no-array-index-key
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
        <Button variant="link" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};
