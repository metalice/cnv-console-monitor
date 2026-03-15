import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
    const url = impersonate ? `/api/user/profile?impersonate=${encodeURIComponent(impersonate)}` : '/api/user/profile';
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data: User) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo((): AuthContextValue | null => (
    user ? { user, isAdmin: user.role === 'admin' } : null
  ), [user]);

  if (loading) {
    return (
      <Bullseye style={{ height: '100vh' }}>
        <Spinner aria-label="Loading user" />
      </Bullseye>
    );
  }

  if (!value) {
    return (
      <Bullseye style={{ height: '100vh' }}>
        <div>Unable to determine user identity. Ensure you are accessing through the OAuth proxy.</div>
      </Bullseye>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
