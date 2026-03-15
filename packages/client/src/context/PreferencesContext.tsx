import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { UserPreferences } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';

type PreferencesContextValue = {
  preferences: UserPreferences;
  loaded: boolean;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<UserPreferences>({});

  useEffect(() => {
    apiFetch<UserPreferences>('/user/preferences')
      .then((prefs) => {
        setPreferences(prefs);
        pendingRef.current = prefs;
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    return () => clearTimeout(saveTimer.current ?? undefined);
  }, []);

  const setPreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: value };
      pendingRef.current = next;
      return next;
    });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch('/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(pendingRef.current),
      }).catch(() => {});
    }, 1000);
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, loaded, setPreference }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextValue => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
};
