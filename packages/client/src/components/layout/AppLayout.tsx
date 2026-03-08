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
  ListIcon,
  CogIcon,
  UserIcon,
  SignOutAltIcon,
} from '@patternfly/react-icons';
import { DateToolbar } from '../common/DateToolbar';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HomeIcon /> },
  { path: '/failures', label: 'Failures', icon: <ExclamationCircleIcon /> },
  { path: '/trends', label: 'Trends', icon: <ChartLineIcon /> },
  { path: '/flaky', label: 'Flaky Tests', icon: <ExclamationTriangleIcon /> },
  { path: '/activity', label: 'Activity', icon: <ListIcon /> },
  { path: '/settings', label: 'Settings', icon: <CogIcon /> },
];

type AppLayoutProps = {
  children: React.ReactNode;
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const masthead = (
    <Masthead>
      <MastheadMain style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <MastheadToggle>
          <PageToggleButton
            variant="plain"
            aria-label="Toggle sidebar"
            isSidebarOpen={isSidebarOpen}
            onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <span
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', fontSize: 16, fontWeight: 600 }}
        >
          CNV Console Monitor
        </span>
      </MastheadMain>
      <MastheadContent>
        <Toolbar>
          <ToolbarContent>
            <DateToolbar />
            <ToolbarGroup align={{ default: 'alignEnd' }}>
              <ToolbarItem>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pf-t--global--color--nonstatus--gray--text--on-filled--default)' }}>
                  <UserIcon />
                  <span>{user.name}</span>
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
                isActive={location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/launch/'))}
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

  return (
    <Page masthead={masthead} sidebar={sidebar}>
      {children}
    </Page>
  );
};
