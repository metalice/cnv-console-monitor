import { Button, Content, Flex, FlexItem } from '@patternfly/react-core';

type NewSubscriptionFooterProps = {
  canTest: boolean;
  canSave: boolean;
  showHint: boolean;
  isTestLoading: boolean;
  isSaveLoading: boolean;
  onTest: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export const NewSubscriptionFooter = ({
  canSave,
  canTest,
  isSaveLoading,
  isTestLoading,
  onCancel,
  onSave,
  onTest,
  showHint,
}: NewSubscriptionFooterProps) => (
  <Flex className="app-mt-md" spaceItems={{ default: 'spaceItemsSm' }}>
    <FlexItem>
      <Button
        isDisabled={!canTest}
        isLoading={isTestLoading}
        size="sm"
        variant="secondary"
        onClick={onTest}
      >
        Test Delivery
      </Button>
    </FlexItem>
    <FlexItem>
      <Button
        isDisabled={!canSave}
        isLoading={isSaveLoading}
        size="sm"
        variant="primary"
        onClick={onSave}
      >
        Save
      </Button>
    </FlexItem>
    <FlexItem>
      <Button size="sm" variant="link" onClick={onCancel}>
        Cancel
      </Button>
    </FlexItem>
    {showHint && (
      <FlexItem>
        <Content className="app-text-muted" component="small">
          Test delivery first to enable Save
        </Content>
      </FlexItem>
    )}
  </Flex>
);
