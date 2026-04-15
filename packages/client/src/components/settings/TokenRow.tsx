import type { UserTokenInfo } from '@cnv-monitor/shared';

import {
  Button,
  Flex,
  FlexItem,
  InputGroup,
  InputGroupItem,
  Label,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  TimesCircleIcon,
  TrashIcon,
} from '@patternfly/react-icons';

type TestResult = {
  status: 'idle' | 'testing' | 'success' | 'error';
  username?: string;
  error?: string;
};

type TokenRowProps = {
  tokenInfo: UserTokenInfo;
  inputValue: string;
  isSaving: boolean;
  isTesting: boolean;
  providerLabel: string;
  testResult?: TestResult;
  onInputChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onTest: () => void;
};

export const TokenRow = ({
  inputValue,
  isSaving,
  isTesting,
  onDelete,
  onInputChange,
  onSave,
  onTest,
  providerLabel,
  testResult,
  tokenInfo,
}: TokenRowProps) => (
  <Stack>
    <StackItem>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        {tokenInfo.isConfigured ? (
          <>
            <FlexItem>
              <Label
                color={tokenInfo.isValid ? 'green' : 'red'}
                icon={tokenInfo.isValid ? <CheckCircleIcon /> : <TimesCircleIcon />}
              >
                {tokenInfo.isValid ? tokenInfo.providerUsername || 'Valid' : 'Invalid'}
              </Label>
            </FlexItem>
            <FlexItem>
              <Button isLoading={isTesting} size="sm" variant="secondary" onClick={onTest}>
                Test
              </Button>
            </FlexItem>
            <FlexItem>
              <Button icon={<TrashIcon />} size="sm" variant="plain" onClick={onDelete} />
            </FlexItem>
          </>
        ) : (
          <FlexItem grow={{ default: 'grow' }}>
            <InputGroup>
              <InputGroupItem isFill>
                <TextInput
                  placeholder={`Enter ${providerLabel} token`}
                  type="password"
                  value={inputValue}
                  onChange={(_e, val) => onInputChange(val)}
                />
              </InputGroupItem>
              <InputGroupItem>
                <Button
                  isDisabled={!inputValue || isSaving}
                  isLoading={isSaving}
                  variant="control"
                  onClick={onSave}
                >
                  Save
                </Button>
              </InputGroupItem>
            </InputGroup>
          </FlexItem>
        )}
      </Flex>
    </StackItem>
    {testResult?.status === 'success' && (
      <StackItem>
        <Label isCompact color="green" icon={<CheckCircleIcon />}>
          Connected as {testResult.username}
        </Label>
      </StackItem>
    )}
    {testResult?.status === 'error' && (
      <StackItem>
        <Label isCompact color="red" icon={<ExclamationCircleIcon />}>
          {testResult.error}
        </Label>
      </StackItem>
    )}
  </Stack>
);
