import type { LaunchGroup } from '../../api/compare';

import { CompareLaunchPicker } from './CompareLaunchPicker';
import { CompareRunPicker } from './CompareRunPicker';

type CompareSelectorProps = {
  launchGroups: LaunchGroup[] | undefined;
  isLoading: boolean;
  selectedGroup: LaunchGroup | null;
  onSelectLaunch: (name: string) => void;
  onClearLaunch: () => void;
  selectedRunA: number | null;
  selectedRunB: number | null;
  onSelectRunA: (id: number | null) => void;
  onSelectRunB: (id: number | null) => void;
  onCompare: () => void;
  isComparing: boolean;
};

export const CompareSelector = ({
  isComparing,
  isLoading,
  launchGroups,
  onClearLaunch,
  onCompare,
  onSelectLaunch,
  onSelectRunA,
  onSelectRunB,
  selectedGroup,
  selectedRunA,
  selectedRunB,
}: CompareSelectorProps) => {
  if (!selectedGroup) {
    return (
      <CompareLaunchPicker
        isLoading={isLoading}
        launchGroups={launchGroups}
        onSelectLaunch={onSelectLaunch}
      />
    );
  }

  return (
    <CompareRunPicker
      isComparing={isComparing}
      selectedGroup={selectedGroup}
      selectedRunA={selectedRunA}
      selectedRunB={selectedRunB}
      onClearLaunch={onClearLaunch}
      onCompare={onCompare}
      onSelectRunA={onSelectRunA}
      onSelectRunB={onSelectRunB}
    />
  );
};
