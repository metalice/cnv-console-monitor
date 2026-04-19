import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const VALID_TABS = new Set([
  'notifications',
  'integrations',
  'team-report',
  'launchers',
  'repositories',
  'users',
  'tokens',
  'about',
]);

const DEFAULT_TAB = 'notifications';

export const useSettingsPageNav = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('tab') ?? DEFAULT_TAB;
  const [activeTab, setActiveTabState] = useState(VALID_TABS.has(initial) ? initial : DEFAULT_TAB);
  const [integrationSubTab, setIntegrationSubTabState] = useState(
    searchParams.get('sub') ?? 'reportportal',
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState(tab);
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  const setIntegrationSubTab = useCallback(
    (sub: string) => {
      setIntegrationSubTabState(sub);
      setSearchParams({ sub, tab: 'integrations' }, { replace: true });
    },
    [setSearchParams],
  );

  return { activeTab, integrationSubTab, setActiveTab, setIntegrationSubTab };
};
