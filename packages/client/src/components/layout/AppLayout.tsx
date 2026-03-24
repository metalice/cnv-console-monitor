import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  Nav,
  NavItem,
  NavList,
  Page,
  PageSidebar,
  PageSidebarBody,
  SkipToContent,
} from '@patternfly/react-core';
import {
  CalendarAltIcon,
  ChartLineIcon,
  CodeBranchIcon,
  CogIcon,
  CubesIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  InfoCircleIcon,
  ListIcon,
  SearchIcon,
  UserIcon,
} from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../context/AuthContext';
import { useComponentFilter } from '../../context/ComponentFilterContext';
import { usePreferences } from '../../context/PreferencesContext';

import { AppMasthead } from './AppMasthead';

const navItems = [
  { icon: <UserIcon />, label: 'My Work', path: '/my-work' },
  { icon: <HomeIcon />, label: 'Dashboard', path: '/' },
  { icon: <ExclamationCircleIcon />, label: 'Failures', path: '/failures' },
  { icon: <ChartLineIcon />, label: 'Trends', path: '/trends' },
  { icon: <ExclamationTriangleIcon />, label: 'Flaky Tests', path: '/flaky' },
  { icon: <CubesIcon />, label: 'Components', path: '/components' },
  { icon: <CodeBranchIcon />, label: 'Compare', path: '/compare' },
  { icon: <CalendarAltIcon />, label: 'Releases', path: '/releases' },
  { icon: <SearchIcon />, label: 'Test Explorer', path: '/test-explorer' },
  { icon: <ListIcon />, label: 'Activity', path: '/activity' },
  { icon: <CogIcon />, label: 'Settings', path: '/settings' },
  { icon: <InfoCircleIcon />, label: 'About', path: '/about' },
];

type AppLayoutProps = {
  children: React.ReactNode;
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { selectedComponents } = useComponentFilter();

  const navigateWithFilter = (path: string) => {
    const params = new URLSearchParams();
    if (selectedComponents.size > 0) {
      params.set('components', [...selectedComponents].join(','));
    }
    const qs = params.toString();
    navigate(qs ? `${path}?${qs}` : path);
  };
  const { loaded: prefsLoaded, preferences, setPreference } = usePreferences();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    if (prefsLoaded) {
      setIsSidebarOpen(preferences.sidebarCollapsed !== true);
    }
  }, [prefsLoaded, preferences.sidebarCollapsed]);

  const handleSidebarToggle = () => {
    const next = !isSidebarOpen;
    setIsSidebarOpen(next);
    setPreference('sidebarCollapsed', !next);
  };

  const { data: activitySummary } = useQuery({
    queryFn: async () => {
      const { fetchActivitySummary } = await import('../../api/activity');
      return fetchActivitySummary();
    },
    queryKey: ['activitySummary', 'badge'],
    refetchInterval: 60 * 1000,
    staleTime: 60 * 1000,
  });

  const hasNewActivity = React.useMemo(() => {
    const lastViewed = preferences.lastActivityViewedAt;
    const latest = activitySummary?.latestActivityAt;
    if (!lastViewed || !latest) {
      return false;
    }
    return latest > lastViewed;
  }, [preferences.lastActivityViewedAt, activitySummary?.latestActivityAt]);

  const sidebar = (
    <PageSidebar isSidebarOpen={isSidebarOpen}>
      <PageSidebarBody>
        <Nav>
          <NavList>
            {navItems.map(item => (
              <NavItem
                icon={item.icon}
                isActive={
                  location.pathname === item.path ||
                  (item.path === '/' &&
                    (location.pathname.startsWith('/launch/') ||
                      location.pathname.startsWith('/test/'))) ||
                  (item.path === '/releases' && location.pathname.startsWith('/readiness'))
                }
                key={item.path}
                onClick={() => navigateWithFilter(item.path)}
              >
                {item.label}
                {item.path === '/activity' &&
                  hasNewActivity &&
                  location.pathname !== '/activity' && <span className="app-nav-badge" />}
              </NavItem>
            ))}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <Page
      mainContainerId="main-content"
      masthead={
        <AppMasthead
          isAdmin={isAdmin}
          isSidebarOpen={isSidebarOpen}
          userName={user.name}
          onSidebarToggle={handleSidebarToggle}
        />
      }
      sidebar={sidebar}
      skipToContent={<SkipToContent href="#main-content">Skip to content</SkipToContent>}
    >
      {children}
    </Page>
  );
};
