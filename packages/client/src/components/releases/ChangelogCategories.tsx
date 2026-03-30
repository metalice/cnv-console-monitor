import { useState } from 'react';

import { Button, ExpandableSection, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';

import type { ChangelogCorrection, ChangelogItem } from '../../api/ai';

import { CATEGORY_LABELS } from './changelogConstants';
import { ChangelogItemRow } from './ChangelogItemRow';

const LOW_CONFIDENCE_THRESHOLD = 0.7;

type ChangelogCategoriesProps = {
  categories: Record<string, ChangelogItem[]>;
  totalItems: number;
  editMode: boolean;
  onAddEdit: (correction: ChangelogCorrection) => void;
};

export const ChangelogCategories = ({
  categories,
  editMode,
  onAddEdit,
  totalItems,
}: ChangelogCategoriesProps) => {
  const [componentFilter, setComponentFilter] = useState('');
  const [showLowConfidence, setShowLowConfidence] = useState(false);

  const filterItems = (items: ChangelogItem[]): ChangelogItem[] => {
    let filtered = items;
    if (componentFilter) {
      filtered = filtered.filter(item =>
        item.component?.toLowerCase().includes(componentFilter.toLowerCase()),
      );
    }
    if (showLowConfidence) {
      filtered = filtered.filter(
        item => item.confidence !== undefined && item.confidence < LOW_CONFIDENCE_THRESHOLD,
      );
    }
    return filtered;
  };

  return (
    <>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        className="app-mb-md"
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          {/* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
          {Object.entries(categories).map(([cat, items]) => {
            if (!items?.length) {
              return null;
            }
            const meta = CATEGORY_LABELS[cat] || { color: 'grey' as const, label: cat };
            return (
              <Label isCompact className="app-mr-sm" color={meta.color} key={cat}>
                {meta.label}: {items.length}
              </Label>
            );
          })}
          {/* eslint-enable @typescript-eslint/no-unnecessary-condition */}
          <span className="app-text-xs app-text-muted app-ml-sm">{totalItems} total</span>
        </FlexItem>
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <input
                className="app-search-input"
                placeholder="Filter by component..."
                style={{ width: 180 }}
                type="text"
                value={componentFilter}
                onChange={e => setComponentFilter(e.target.value)}
              />
              {componentFilter && (
                <Button
                  aria-label="Clear filter"
                  size="sm"
                  variant="plain"
                  onClick={() => setComponentFilter('')}
                >
                  &times;
                </Button>
              )}
            </FlexItem>
            <FlexItem>
              <Tooltip content="Show only items with low AI confidence (<70%) that may need human review">
                <Button
                  size="sm"
                  variant={showLowConfidence ? 'secondary' : 'plain'}
                  onClick={() => setShowLowConfidence(!showLowConfidence)}
                >
                  {showLowConfidence ? 'All items' : '⚠ Low confidence'}
                </Button>
              </Tooltip>
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>

      {/* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
      {Object.entries(categories).map(([cat, items]) => {
        if (!items?.length) {
          return null;
        }
        const filtered = filterItems(items);
        if (filtered.length === 0) {
          return null;
        }
        const meta = CATEGORY_LABELS[cat] || { color: 'grey' as const, label: cat };
        return (
          <ExpandableSection
            isIndented
            className="app-mb-sm"
            key={cat}
            toggleText={`${meta.label} (${filtered.length})`}
          >
            <div className="app-changelog-list">
              {filtered.map((item, i) => (
                <ChangelogItemRow
                  category={cat}
                  editMode={editMode}
                  item={item}
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  onAddEdit={onAddEdit}
                />
              ))}
            </div>
          </ExpandableSection>
        );
      })}
      {/* eslint-enable @typescript-eslint/no-unnecessary-condition */}
    </>
  );
};
