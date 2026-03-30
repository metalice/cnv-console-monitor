import React from 'react';

import {
  Button,
  Content,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';

import { isVersionReleased } from './changelogConstants';
import { CompareSelector } from './CompareSelector';

type Milestone = { name: string; date: string; isPast: boolean };
type SubVersion = { name: string; released: boolean };

type ChangelogToolbarProps = {
  targetVer: string;
  compareFrom: string;
  compareEnabled: boolean;
  isGenerating: boolean;
  subVersions: SubVersion[] | undefined;
  milestones: Milestone[];
  onTargetChange: (ver: string) => void;
  onCompareFromChange: (ver: string) => void;
  onCompareToggle: (enabled: boolean) => void;
  onGenerate: () => void;
  onClearResult: () => void;
};

export const ChangelogToolbar = ({
  compareEnabled,
  compareFrom,
  isGenerating,
  milestones,
  onClearResult,
  onCompareFromChange,
  onCompareToggle,
  onGenerate,
  onTargetChange,
  subVersions,
  targetVer,
}: ChangelogToolbarProps) => {
  const [targetOpen, setTargetOpen] = React.useState(false);
  const versions = subVersions ?? [];

  return (
    <Flex
      alignItems={{ default: 'alignItemsFlexEnd' }}
      className="app-mb-md"
      flexWrap={{ default: 'wrap' }}
      spaceItems={{ default: 'spaceItemsMd' }}
    >
      <FlexItem>
        <Content className="app-text-muted app-mb-xs" component="small">
          Target Version
        </Content>
        <Select
          isOpen={targetOpen}
          // eslint-disable-next-line react/no-unstable-nested-components
          toggle={(ref: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              className="app-max-w-250"
              isExpanded={targetOpen}
              ref={ref}
              onClick={() => setTargetOpen(prev => !prev)}
            >
              {targetVer || 'Select version'}
            </MenuToggle>
          )}
          onOpenChange={setTargetOpen}
          onSelect={(_e, val) => {
            onTargetChange(val as string);
            setTargetOpen(false);
            onClearResult();
          }}
        >
          <SelectList>
            {versions.map(sub => (
              <SelectOption key={sub.name} value={sub.name}>
                {sub.name}
                {isVersionReleased(sub.name, milestones) ? '' : ' (upcoming)'}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      </FlexItem>
      <CompareSelector
        compareEnabled={compareEnabled}
        compareFrom={compareFrom}
        subVersions={versions}
        targetVer={targetVer}
        onClearResult={onClearResult}
        onCompareFromChange={onCompareFromChange}
        onCompareToggle={onCompareToggle}
      />
      <FlexItem>
        <Button
          isDisabled={!targetVer || isGenerating}
          isLoading={isGenerating}
          variant="primary"
          onClick={onGenerate}
        >
          {isGenerating ? 'Generating...' : 'Generate Changelog'}
        </Button>
      </FlexItem>
    </Flex>
  );
};
