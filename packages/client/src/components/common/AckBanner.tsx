import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banner, Button, Flex, FlexItem } from '@patternfly/react-core';
import { fetchAckStatus } from '../../api/acknowledgment';

interface AckBannerProps {
  onAcknowledge: () => void;
}

export const AckBanner: React.FC<AckBannerProps> = ({ onAcknowledge }) => {
  const { data } = useQuery({
    queryKey: ['acknowledgment'],
    queryFn: fetchAckStatus,
    refetchInterval: 60000,
  });

  if (!data) return null;

  if (data.acknowledged) {
    const lastAck = data.acknowledgments[data.acknowledgments.length - 1];
    return (
      <Banner color="green" style={{ marginBottom: 16 }}>
        <Flex>
          <FlexItem>
            Reviewed by <strong>{lastAck.reviewer}</strong> at{' '}
            {new Date(lastAck.acknowledged_at || '').toLocaleTimeString()}
            {lastAck.notes ? ` — "${lastAck.notes}"` : ''}
          </FlexItem>
        </Flex>
      </Banner>
    );
  }

  return (
    <Banner color="yellow" style={{ marginBottom: 16 }}>
      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
        <FlexItem>Today's report has not been reviewed yet.</FlexItem>
        <FlexItem>
          <Button variant="link" onClick={onAcknowledge} isInline>
            I Reviewed It
          </Button>
        </FlexItem>
      </Flex>
    </Banner>
  );
};
