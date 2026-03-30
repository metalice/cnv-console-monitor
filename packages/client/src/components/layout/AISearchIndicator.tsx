import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { MagicIcon, SearchIcon } from '@patternfly/react-icons';

export const AISearchIndicator = () => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [aiStatus, setAiStatus] = React.useState<{ enabled: boolean } | null>(null);

  React.useEffect(() => {
    fetch('/api/ai/status')
      .then(response => response.json() as Promise<{ enabled: boolean }>)
      .then(setAiStatus)
      .catch(() => {
        // no-op
      });
  }, []);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      return;
    }
    try {
      const res = await fetch('/api/ai/nl-search', {
        body: JSON.stringify({ query: searchValue }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await res.json()) as {
        result?: { page?: string; filters?: Record<string, string> };
      };
      if (data.result?.page) {
        const params = new URLSearchParams(data.result.filters ?? {});
        navigate(`/${data.result.page}?${params.toString()}`);
        setSearchOpen(false);
        setSearchValue('');
      }
    } catch {
      /* Ignore */
    }
  };

  return (
    <>
      {aiStatus?.enabled && (
        <ToolbarItem>
          <Tooltip content="AI features are enabled. Use natural language search, smart triage suggestions, changelog generation, and more.">
            <span className="app-ai-indicator">
              <MagicIcon />
            </span>
          </Tooltip>
        </ToolbarItem>
      )}
      <ToolbarItem>
        {searchOpen ? (
          <span className="app-masthead-search">
            {/* eslint-disable jsx-a11y/no-autofocus -- search input should focus when opened */}
            <input
              autoFocus
              className="app-search-input"
              placeholder="Ask AI: 'storage failures last week'..."
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  void handleSearch();
                }
                if (e.key === 'Escape') {
                  setSearchOpen(false);
                }
              }}
            />
            {/* eslint-enable jsx-a11y/no-autofocus */}
            <Button
              aria-label="Close search"
              size="sm"
              variant="plain"
              onClick={() => setSearchOpen(false)}
            >
              &times;
            </Button>
          </span>
        ) : (
          <Tooltip content="AI natural language search. Ask questions like 'storage failures last week' and AI will navigate to the right page with filters applied.">
            <Button
              aria-label="AI Search"
              icon={<SearchIcon />}
              variant="plain"
              onClick={() => setSearchOpen(true)}
            />
          </Tooltip>
        )}
      </ToolbarItem>
    </>
  );
};
