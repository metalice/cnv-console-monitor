import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  BarsIcon,
  UserIcon,
  SignOutAltIcon,
  ShieldAltIcon,
} from '@patternfly/react-icons';
import { DateToolbar } from '../common/DateToolbar';

type AppMastheadProps = {
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  userName: string;
  isAdmin: boolean;
};

export const AppMasthead: React.FC<AppMastheadProps> = ({ isSidebarOpen, onSidebarToggle, userName, isAdmin }) => {
  const navigate = useNavigate();

  return (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton variant="plain" aria-label="Toggle sidebar" isSidebarOpen={isSidebarOpen} onSidebarToggle={onSidebarToggle}>
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand>
          <a
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            href="/"
            className="app-masthead-brand"
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
                <span className="app-masthead-user">
                  {isAdmin ? <ShieldAltIcon /> : <UserIcon />}
                  <span>{userName}</span>
                  {isAdmin && <span className="app-masthead-admin-badge">admin</span>}
                </span>
              </ToolbarItem>
              <ToolbarItem>
                <Button variant="plain" aria-label="Log out" onClick={() => { window.location.href = '/oauth/sign_out'; }} icon={<SignOutAltIcon />} />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
};
