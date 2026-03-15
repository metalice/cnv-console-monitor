import React from 'react';
import { Banner } from '@patternfly/react-core';
import type { WebSocketStatus } from '../../hooks/useWebSocket';

interface ConnectionBannerProps {
  status: WebSocketStatus;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ status }) => {
  if (status !== 'disconnected') return null;

  return (
    <Banner color="yellow">
      Connection lost — live updates paused. The page will reconnect automatically.
    </Banner>
  );
};
