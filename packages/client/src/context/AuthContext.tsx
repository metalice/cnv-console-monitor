import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { User } from '@cnv-monitor/shared';

import { Bullseye, Spinner } from '@patternfly/react-core';

type AuthContextValue = {
  user: User;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const impersonate = params.get('impersonate');
    const url = impersonate
      ? `/api/user/profile?impersonate=${encodeURIComponent(impersonate)}`
      : '/api/user/profile';
    void fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        return response.json();
      })
      .then((data: User) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    (): AuthContextValue | null => (user ? { isAdmin: user.role === 'admin', user } : null),
    [user],
  );

  if (loading) {
    return (
      <Bullseye className="app-full-height">
        <Spinner aria-label="Loading user" />
      </Bullseye>
    );
  }

  if (!value) {
    return (
      <Bullseye className="app-full-height">
        <div>
          Unable to determine user identity. Ensure you are accessing through the OAuth proxy.
        </div>
      </Bullseye>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
