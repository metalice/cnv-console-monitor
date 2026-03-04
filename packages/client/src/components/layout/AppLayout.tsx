import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Brand,
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
  Content,
  Toolbar,
  ToolbarContent,
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
} from '@patternfly/react-icons';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HomeIcon /> },
  { path: '/failures', label: 'Failures', icon: <ExclamationCircleIcon /> },
  { path: '/trends', label: 'Trends', icon: <ChartLineIcon /> },
  { path: '/flaky', label: 'Flaky Tests', icon: <ExclamationTriangleIcon /> },
  { path: '/activity', label: 'Activity', icon: <ListIcon /> },
  { path: '/settings', label: 'Settings', icon: <CogIcon /> },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const masthead = (
    <Masthead>
      <MastheadMain>
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
        <MastheadBrand>
          <Brand
            src=""
            alt="CNV Console Monitor"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          >
            <Content component="h3" style={{ color: 'white', margin: 0 }}>
              CNV Console Monitor
            </Content>
          </Brand>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Content component="small" style={{ color: 'var(--pf-t--global--color--nonstatus--gray--text--on-gray--default)' }}>
                ReportPortal Dashboard
              </Content>
            </ToolbarItem>
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
                isActive={location.pathname === item.path}
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
