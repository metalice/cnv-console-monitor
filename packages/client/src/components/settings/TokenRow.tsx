import type { UserTokenInfo } from '@cnv-monitor/shared';

import {
  Button,
  Flex,
  FlexItem,
  InputGroup,
  InputGroupItem,
  Label,
  TextInput,
} from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon, TrashIcon } from '@patternfly/react-icons';

type TokenRowProps = {
  tokenInfo: UserTokenInfo;
  inputValue: string;
  isSaving: boolean;
  isTesting: boolean;
  providerLabel: string;
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
  tokenInfo,
}: TokenRowProps) => (
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
);
