import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { usePreferences } from './PreferencesContext';

type ComponentFilterContextValue = {
  selectedComponents: Set<string>;
  setSelectedComponents: (value: Set<string>) => void;
  availableComponents: string[];
  selectedComponent: string | undefined;
};

const ComponentFilterContext = createContext<ComponentFilterContextValue | null>(null);

export const ComponentFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsRaw] = useState<Set<string>>(new Set());

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!prefsLoaded || initializedRef.current) return;
    initializedRef.current = true;
    const urlComps = new URLSearchParams(window.location.search).get('components');
    if (urlComps) {
      const comps = urlComps.split(',').filter(Boolean);
      setSelectedComponentsRaw(new Set(comps));
      setPreference('dashboardComponents', comps);
    } else if (preferences.dashboardComponents?.length) {
      setSelectedComponentsRaw(new Set(preferences.dashboardComponents));
    }
  }, [prefsLoaded, preferences.dashboardComponents, setPreference]);

  const setSelectedComponents = useCallback((value: Set<string>) => {
    setSelectedComponentsRaw(value);
    setPreference('dashboardComponents', [...value]);

    const url = new URL(window.location.href);
    if (value.size > 0) {
      url.searchParams.set('components', [...value].join(','));
    } else {
      url.searchParams.delete('components');
    }
    window.history.replaceState(null, '', url.pathname + (url.search || ''));
  }, [setPreference]);

  const { data: availableComponents } = useQuery({
    queryKey: ['availableComponents'],
    queryFn: () => apiFetch<string[]>('/launches/components'),
    staleTime: 5 * 60 * 1000,
  });

  const selectedComponent = useMemo(
    () => selectedComponents.size === 1 ? [...selectedComponents][0] : undefined,
    [selectedComponents],
  );

  const value = useMemo<ComponentFilterContextValue>(() => ({
    selectedComponents,
    setSelectedComponents,
    availableComponents: availableComponents ?? [],
    selectedComponent,
  }), [selectedComponents, setSelectedComponents, availableComponents, selectedComponent]);

  return (
    <ComponentFilterContext.Provider value={value}>
      {children}
    </ComponentFilterContext.Provider>
  );
};

export const useComponentFilter = (): ComponentFilterContextValue => {
  const ctx = useContext(ComponentFilterContext);
  if (!ctx) throw new Error('useComponentFilter must be used within ComponentFilterProvider');
  return ctx;
};
