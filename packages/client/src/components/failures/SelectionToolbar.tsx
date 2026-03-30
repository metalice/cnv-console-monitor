import { Button, Content, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';

type SelectionToolbarProps = {
  selectedCount: number;
  onClassify: () => void;
};

export const SelectionToolbar = ({ onClassify, selectedCount }: SelectionToolbarProps) => {
  if (selectedCount === 0) {
    return null;
  }
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <Content>{selectedCount} selected</Content>
        </ToolbarItem>
        <ToolbarItem>
          <Button icon={<WrenchIcon />} variant="primary" onClick={onClassify}>
            Classify Selected
          </Button>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};
