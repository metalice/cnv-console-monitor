import { Button, Flex, FlexItem, PageSection } from '@patternfly/react-core';

type UnsavedChangesBarProps = {
  isSaving: boolean;
  onSave: () => void;
};

export const UnsavedChangesBar = ({ isSaving, onSave }: UnsavedChangesBarProps) => (
  <PageSection className="app-sticky-save-bar">
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
    >
      <FlexItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <span className="app-unsaved-dot" />
          </FlexItem>
          <FlexItem>
            <strong>Unsaved changes</strong>
          </FlexItem>
        </Flex>
      </FlexItem>
      <FlexItem>
        <Flex spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Button variant="link" onClick={() => window.location.reload()}>
              Discard
            </Button>
          </FlexItem>
          <FlexItem>
            <Button isLoading={isSaving} variant="primary" onClick={onSave}>
              Save Changes
            </Button>
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  </PageSection>
);
