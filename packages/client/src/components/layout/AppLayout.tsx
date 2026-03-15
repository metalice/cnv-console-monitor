import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  Nav,
  NavItem,
  NavList,
  Page,
  PageSidebar,
  PageSidebarBody,
  PageToggleButton,
  SkipToContent,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  BarsIcon,
  HomeIcon,
  ExclamationCircleIcon,
  ChartLineIcon,
  ExclamationTriangleIcon,
  CalendarAltIcon,
  ListIcon,
  CogIcon,
  UserIcon,
  SignOutAltIcon,
  ShieldAltIcon,
  CubesIcon,
  CodeBranchIcon,
} from '@patternfly/react-icons';
import { DateToolbar } from '../common/DateToolbar';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';

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
  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    if (prefsLoaded) {
      setIsSidebarOpen(preferences.sidebarCollapsed !== true);
    }
  }, [prefsLoaded, preferences.sidebarCollapsed]);

  const masthead = (
    <Masthead>
      <MastheadMain style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <MastheadToggle>
          <PageToggleButton
            variant="plain"
            aria-label="Toggle sidebar"
            isSidebarOpen={isSidebarOpen}
            onSidebarToggle={() => { const next = !isSidebarOpen; setIsSidebarOpen(next); setPreference('sidebarCollapsed', !next); }}
          >
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand>
          <a
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            href="/"
            style={{ textDecoration: 'none', color: 'inherit', fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            CNV Console Monitor
          </a>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar className="app-masthead-toolbar">
          <ToolbarContent>
            <DateToolbar />
            <ToolbarGroup align={{ default: 'alignEnd' }}>
              <ToolbarItem>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pf-t--global--color--nonstatus--gray--text--on-filled--default)' }}>
                  {isAdmin ? <ShieldAltIcon /> : <UserIcon />}
                  <span>{user.name}</span>
                  {isAdmin && <span style={{ fontSize: 10, opacity: 0.7 }}>admin</span>}
                </span>
              </ToolbarItem>
              <ToolbarItem>
                <Button
                  variant="plain"
                  aria-label="Log out"
                  onClick={() => { window.location.href = '/oauth/sign_out'; }}
                  icon={<SignOutAltIcon />}
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );

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
                onClick={() => navigate(item.path)}
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

  const skipToContent = (
    <SkipToContent href="#main-content">Skip to content</SkipToContent>
  );

  return (
    <Page masthead={masthead} sidebar={sidebar} skipToContent={skipToContent} mainContainerId="main-content">
      {children}
    </Page>
  );
};
