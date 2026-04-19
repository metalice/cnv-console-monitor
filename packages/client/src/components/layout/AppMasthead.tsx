import { useState } from 'react';
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
  Tooltip,
} from '@patternfly/react-core';
import {
  BarsIcon,
  OutlinedCommentsIcon,
  ShieldAltIcon,
  SignOutAltIcon,
  UserIcon,
} from '@patternfly/react-icons';

import { ComponentToolbar } from '../common/ComponentToolbar';
import { DateToolbar } from '../common/DateToolbar';
import { FeedbackModal } from '../modals/FeedbackModal';

import { AISearchIndicator } from './AISearchIndicator';
import { PollIndicator } from './PollIndicator';

type AppMastheadProps = {
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  userName: string;
  isAdmin: boolean;
};

export const AppMasthead = ({
  isAdmin,
  isSidebarOpen,
  onSidebarToggle,
  userName,
}: AppMastheadProps) => {
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <Masthead>
        <MastheadMain>
          <MastheadToggle>
            <PageToggleButton
              aria-label="Toggle sidebar"
              isSidebarOpen={isSidebarOpen}
              variant="plain"
              onSidebarToggle={onSidebarToggle}
            >
              <BarsIcon />
            </PageToggleButton>
          </MastheadToggle>
          <MastheadBrand>
            <a
              className="app-masthead-brand"
              href="/"
              onClick={e => {
                e.preventDefault();
                navigate('/');
              }}
            >
              CNV Console Monitor
            </a>
          </MastheadBrand>
        </MastheadMain>
        <MastheadContent>
          <Toolbar className="app-masthead-toolbar">
            <ToolbarContent>
              <DateToolbar />
              <ComponentToolbar />
              <ToolbarGroup align={{ default: 'alignEnd' }}>
                <AISearchIndicator />
                <PollIndicator />
                <ToolbarItem>
                  <Tooltip content="Send Feedback">
                    <Button
                      aria-label="Send Feedback"
                      icon={<OutlinedCommentsIcon />}
                      variant="plain"
                      onClick={() => setFeedbackOpen(true)}
                    />
                  </Tooltip>
                </ToolbarItem>
                <ToolbarItem>
                  <span className="app-masthead-user">
                    {isAdmin ? <ShieldAltIcon /> : <UserIcon />}
                    <span>{userName}</span>
                    {isAdmin && <span className="app-masthead-admin-badge">admin</span>}
                  </span>
                </ToolbarItem>
                <ToolbarItem>
                  <Button
                    aria-label="Log out"
                    icon={<SignOutAltIcon />}
                    variant="plain"
                    onClick={() => {
                      window.location.href = '/oauth/sign_out';
                    }}
                  />
                </ToolbarItem>
              </ToolbarGroup>
            </ToolbarContent>
          </Toolbar>
        </MastheadContent>
      </Masthead>
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
};
