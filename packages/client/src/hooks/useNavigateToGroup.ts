import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import type { LaunchGroup } from '@cnv-monitor/shared';

export const useNavigateToGroup = () => {
  const navigate = useNavigate();

  return useCallback(
    (group: LaunchGroup) => {
      const rpId = group.latestLaunch.rp_id;
      if (!rpId) {
        return;
      }
      const launches = group.launches ?? [];
      if (launches.length > 1) {
        const ids = launches.map(launch => launch.rp_id).join(',');
        navigate(
          `/launch/${rpId}?launches=${ids}&version=${encodeURIComponent(group.cnvVersion)}&tier=${encodeURIComponent(group.tier)}`,
        );
      } else {
        navigate(`/launch/${rpId}`);
      }
    },
    [navigate],
  );
};
