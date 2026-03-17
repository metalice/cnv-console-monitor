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
  HomeIcon,
  ExclamationCircleIcon,
  ChartLineIcon,
  ExclamationTriangleIcon,
  CalendarAltIcon,
  ListIcon,
  CogIcon,
  UserIcon,
  CubesIcon,
  CodeBranchIcon,
} from '@patternfly/react-icons';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useComponentFilter } from '../../context/ComponentFilterContext';
import { AppMasthead } from './AppMasthead';

const navItems = [
  { path: '/my-work', label: 'My Work', icon: <UserIcon /> },
  { path: '/', label: 'Dashboard', icon: <HomeIcon /> },
  { path: '/failures', label: 'Failures', icon: <ExclamationCircleIcon /> },
  { path: '/trends', label: 'Trends', icon: <ChartLineIcon /> },
  { path: '/flaky', label: 'Flaky Tests', icon: <ExclamationTriangleIcon /> },
  { path: '/components', label: 'Components', icon: <CubesIcon /> },
  { path: '/compare', label: 'Compare', icon: <CodeBranchIcon /> },
  { path: '/releases', label: 'Releases', icon: <CalendarAltIcon /> },
  { path: '/activity', label: 'Activity', icon: <ListIcon /> },
  { path: '/settings', label: 'Settings', icon: <CogIcon /> },
];

type AppLayoutProps = {
  children: React.ReactNode;
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { selectedComponents } = useComponentFilter();

  const navigateWithFilter = (path: string) => {
    const params = new URLSearchParams();
    if (selectedComponents.size > 0) params.set('components', [...selectedComponents].join(','));
    const qs = params.toString();
    navigate(qs ? `${path}?${qs}` : path);
  };
  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
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

  const sidebar = (
    <PageSidebar isSidebarOpen={isSidebarOpen}>
      <PageSidebarBody>
        <Nav>
          <NavList>
            {navItems.map((item) => (
              <NavItem
                key={item.path}
                isActive={
                  location.pathname === item.path
                  || (item.path === '/' && (location.pathname.startsWith('/launch/') || location.pathname.startsWith('/test/')))
                  || (item.path === '/releases' && location.pathname.startsWith('/readiness'))
                }
                onClick={() => navigateWithFilter(item.path)}
                icon={item.icon}
              >
                {item.label}
              </NavItem>
            ))}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <Page
      masthead={<AppMasthead isSidebarOpen={isSidebarOpen} onSidebarToggle={handleSidebarToggle} userName={user.name} isAdmin={isAdmin} />}
      sidebar={sidebar}
      skipToContent={<SkipToContent href="#main-content">Skip to content</SkipToContent>}
      mainContainerId="main-content"
    >
      {children}
    </Page>
  );
};
