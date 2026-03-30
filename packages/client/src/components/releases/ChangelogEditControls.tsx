import { Label, Tooltip } from '@patternfly/react-core';

import type { ChangelogCorrection, ChangelogItem } from '../../api/ai';

import { CATEGORY_KEYS, CATEGORY_LABELS } from './changelogConstants';

const IMPACT_HIGH = 4;
const IMPACT_MID = 3;
const DEFAULT_IMPACT = 3;

type EditControlsProps = {
  item: ChangelogItem;
  category: string;
  onAddEdit: (correction: ChangelogCorrection) => void;
};

export const EditControls = ({ category, item, onAddEdit }: EditControlsProps) => (
  <>
    <select
      className="app-edit-select app-ml-xs"
      defaultValue={category}
      onChange={evt =>
        onAddEdit({
          context: item.title,
          field: 'category',
          key: item.key ?? '',
          newValue: evt.target.value,
          oldValue: category,
        })
      }
    >
      {CATEGORY_KEYS.map(catKey => (
        <option key={catKey} value={catKey}>
          {CATEGORY_LABELS[catKey].label}
        </option>
      ))}
    </select>
    <select
      className="app-edit-select app-ml-xs"
      defaultValue={String(item.impactScore ?? DEFAULT_IMPACT)}
      onChange={evt =>
        onAddEdit({
          context: item.title,
          field: 'impactScore',
          key: item.key ?? '',
          newValue: evt.target.value,
          oldValue: String(item.impactScore ?? DEFAULT_IMPACT),
        })
      }
    >
      {[1, 2, 3, 4, 5].map(num => (
        <option key={num} value={String(num)}>
          {'★'.repeat(num)}
        </option>
      ))}
    </select>
    <select
      className="app-edit-select app-ml-xs"
      defaultValue={item.risk || 'low'}
      onChange={evt =>
        onAddEdit({
          context: item.title,
          field: 'risk',
          key: item.key ?? '',
          newValue: evt.target.value,
          oldValue: item.risk || 'low',
        })
      }
    >
      <option value="low">low risk</option>
      <option value="medium">medium risk</option>
      <option value="high">high risk</option>
    </select>
  </>
);

export const ReadOnlyBadges = ({ item }: { item: ChangelogItem }) => (
  <>
    {item.impactScore && (
      <Tooltip content={`Impact: ${item.impactScore}/5`}>
        <Label
          isCompact
          className="app-ml-xs"
          color={
            item.impactScore >= IMPACT_HIGH
              ? 'red'
              : item.impactScore >= IMPACT_MID
                ? 'orange'
                : 'grey'
          }
        >
          {'★'.repeat(item.impactScore)}
        </Label>
      </Tooltip>
    )}
    {item.risk && item.risk !== 'low' && (
      <Label isCompact className="app-ml-xs" color={item.risk === 'high' ? 'red' : 'orange'}>
        {item.risk} risk
      </Label>
    )}
  </>
);
