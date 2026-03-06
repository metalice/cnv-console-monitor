import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownList,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  MenuToggle,
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
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const userDropdown = (
    <Dropdown
      isOpen={isUserMenuOpen}
      onSelect={() => setIsUserMenuOpen(false)}
      onOpenChange={setIsUserMenuOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          isExpanded={isUserMenuOpen}
          icon={<Avatar alt={user.name} />}
        >
          {user.name}
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem key="email" isDisabled>
          {user.email}
        </DropdownItem>
        <DropdownItem
          key="logout"
          onClick={() => {
            window.location.href = '/oauth/sign_out';
          }}
        >
          Log out
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );

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
          <span
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', color: 'white', fontSize: 18, fontWeight: 600 }}
          >
            CNV Console Monitor
          </span>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar>
          <ToolbarContent>
            <DateToolbar />
            <ToolbarGroup align={{ default: 'alignEnd' }}>
              <ToolbarItem>{userDropdown}</ToolbarItem>
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
