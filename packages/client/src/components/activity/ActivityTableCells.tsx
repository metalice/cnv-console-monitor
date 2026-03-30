import { Label, Tooltip } from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';

type UserAvatarProps = { name: string };

export const UserAvatar = ({ name }: UserAvatarProps) => {
  const initial = (name.split('@')[0]?.[0] || '?').toUpperCase();
  return (
    <Tooltip content={name}>
      <span className="app-user-avatar">{initial}</span>
    </Tooltip>
  );
};

type DiffBadgeProps = { oldVal?: string | null; newVal?: string | null };

export const DiffBadge = ({ newVal, oldVal }: DiffBadgeProps) => {
  if (oldVal && newVal && oldVal !== newVal) {
    return (
      <span className="app-diff-badge">
        <Label isCompact color="red">
          {oldVal}
        </Label>
        <ArrowRightIcon className="app-diff-arrow" />
        <Label isCompact color="green">
          {newVal}
        </Label>
      </span>
    );
  }
  return <span>{newVal || '--'}</span>;
};
