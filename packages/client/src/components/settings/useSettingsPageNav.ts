import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const SCROLL_DELAY_MS = 300;

export const useSettingsPageNav = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState<string | number>(
    searchParams.get('tab') || 'reportportal',
  );

  const setActiveTab = useCallback(
    (tab: string | number) => {
      setActiveTabState(tab);
      setSearchParams({ tab: String(tab) }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;
    const target = tab === 'notifications' ? 'notifications' : 'integrations';
    setTimeout(
      () => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      SCROLL_DELAY_MS,
    );
  }, [searchParams]);

  return { activeTab, setActiveTab };
};
