import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Content,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  BarsIcon,
  UserIcon,
  SignOutAltIcon,
  ShieldAltIcon,
  SyncAltIcon,
  SearchIcon,
  MagicIcon,
} from '@patternfly/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DateToolbar } from '../common/DateToolbar';
import { ComponentToolbar } from '../common/ComponentToolbar';
import { usePollProgress, useJenkinsProgress } from '../../hooks/useWebSocket';
import { fetchPollStatus, triggerPollNow } from '../../api/poll';

type AppMastheadProps = {
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  userName: string;
  isAdmin: boolean;
};

const formatTimeAgo = (ts: number): string => {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatTimeUntil = (ts: number): string => {
  const diffMs = ts - Date.now();
  if (diffMs <= 0) return 'soon';
  const mins = Math.ceil(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  return `in ${Math.floor(mins / 60)}h`;
};

const PollIndicator: React.FC = () => {
  const queryClient = useQueryClient();
  const wsPoll = usePollProgress();
  const wsJenkins = useJenkinsProgress();
  const { data: httpPoll } = useQuery({
    queryKey: ['pollStatus'],
    queryFn: fetchPollStatus,
    refetchInterval: (query) => query.state.data?.active ? 2000 : 30000,
  });
  const pollNow = useMutation({
    mutationFn: () => triggerPollNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['pollStatus'] });
    },
  });

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const poll = wsPoll ?? httpPoll;
  const jenkinsActive = wsJenkins && (wsJenkins.phase === 'enriching' || wsJenkins.phase === 'mapping');
  const pollActive = poll && (poll.active || poll.phase === 'fetching' || poll.phase === 'starting' || poll.phase === 'enriching');
  const isActive = pollActive || jenkinsActive;

  const lastPoll = httpPoll?.lastPollAt;
  const interval = httpPoll?.pollIntervalMinutes;

  let nextPollAt: number | null = null;
  if (lastPoll && interval) {
    const intervalMs = interval * 60000;
    let next = lastPoll + intervalMs;
    const now = Date.now();
    while (next <= now) next += intervalMs;
    nextPollAt = next;
  }

  let statusText: string;
  let tooltipText: string;

  if (isActive) {
    const activePoll = jenkinsActive ? wsJenkins : poll;
    const percentage = activePoll!.total > 0 ? Math.round((activePoll!.current / activePoll!.total) * 100) : 0;
    statusText = activePoll!.total > 0 ? `Syncing ${percentage}%` : 'Syncing...';
    tooltipText = activePoll!.message || (jenkinsActive ? 'Jenkins enrichment...' : 'Syncing with ReportPortal...');
  } else if (lastPoll) {
    statusText = `Synced ${formatTimeAgo(lastPoll)}`;
    tooltipText = [
      new Date(lastPoll).toLocaleString(),
      nextPollAt ? `Next sync ${formatTimeUntil(nextPollAt)}` : null,
    ].filter(Boolean).join('\n');
  } else {
    statusText = 'Not synced';
    tooltipText = 'Click to sync now';
  }

  return (
    <>
      <ToolbarItem>
        <Tooltip content={<span className="app-tooltip-pre">{tooltipText}</span>}>
          <button
            type="button"
            className={`app-poll-indicator${isActive ? '' : ' app-poll-indicator--idle'}`}
            onClick={() => !isActive && setConfirmOpen(true)}
            disabled={!!isActive}
          >
            <SyncAltIcon className={isActive ? 'app-spin' : undefined} />
            <span className="app-poll-indicator-time">{statusText}</span>
          </button>
        </Tooltip>
      </ToolbarItem>

      <Modal variant={ModalVariant.small} isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <ModalHeader title="Sync Now" />
        <ModalBody>
          <Content component="p">
            This will trigger a full sync with ReportPortal — fetching new launches and test items, then storing them locally. This may take 10–30 seconds.
          </Content>
          {lastPoll && (
            <Content component="small" className="app-text-muted">
              Last synced: {new Date(lastPoll).toLocaleString()}
            </Content>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => { pollNow.mutate(); setConfirmOpen(false); }}
            isLoading={pollNow.isPending}
          >
            Sync Now
          </Button>
          <Button variant="link" onClick={() => setConfirmOpen(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

const AISearchIndicator: React.FC = () => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [aiStatus, setAiStatus] = React.useState<{ enabled: boolean } | null>(null);

  React.useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(setAiStatus).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    try {
      const res = await fetch('/api/ai/nl-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: searchValue }) });
      const data = await res.json();
      if (data.result?.page) {
        const params = new URLSearchParams(data.result.filters || {});
        navigate(`/${data.result.page}?${params.toString()}`);
        setSearchOpen(false);
        setSearchValue('');
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      {aiStatus?.enabled && (
        <ToolbarItem>
          <Tooltip content="AI features are enabled. Use natural language search, smart triage suggestions, changelog generation, and more.">
            <span className="app-ai-indicator"><MagicIcon /></span>
          </Tooltip>
        </ToolbarItem>
      )}
      <ToolbarItem>
        {searchOpen ? (
          <span className="app-masthead-search">
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') setSearchOpen(false); }}
              placeholder="Ask AI: 'storage failures last week'..."
              className="app-search-input"
              autoFocus
            />
            <Button variant="plain" size="sm" onClick={() => setSearchOpen(false)} aria-label="Close search">&times;</Button>
          </span>
        ) : (
          <Tooltip content="AI natural language search. Ask questions like 'storage failures last week' and AI will navigate to the right page with filters applied.">
            <Button variant="plain" icon={<SearchIcon />} onClick={() => setSearchOpen(true)} aria-label="AI Search" />
          </Tooltip>
        )}
      </ToolbarItem>
    </>
  );
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
            <ComponentToolbar />
            <ToolbarGroup align={{ default: 'alignEnd' }}>
              <AISearchIndicator />
              <PollIndicator />
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
