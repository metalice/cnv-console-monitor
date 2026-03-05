import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banner, Button, Flex, FlexItem } from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { fetchAckStatus, deleteAcknowledgment } from '../../api/acknowledgment';
import { useDate } from '../../context/DateContext';

type AckBannerProps = {
  onAcknowledge: () => void;
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export const AckBanner: React.FC<AckBannerProps> = ({ onAcknowledge }) => {
  const queryClient = useQueryClient();
  const { dateTo } = useDate();
  const isToday = dateTo === todayStr();

  const { data } = useQuery({
    queryKey: ['acknowledgment', dateTo],
    queryFn: () => fetchAckStatus(dateTo),
    refetchInterval: isToday ? 60000 : false,
  });

  const removeMutation = useMutation({
    mutationFn: (reviewer: string) => deleteAcknowledgment(dateTo, reviewer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgment'] });
    },
  });

  if (!data) return null;

  if (data.acknowledged && data.acknowledgments.length > 0) {
    const reviewers = data.acknowledgments;
    return (
      <Banner color="green" style={{ marginBottom: 16 }}>
        <Flex alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            Reviewed by{' '}
            {reviewers.map((ack, i) => (
              <span key={ack.reviewer}>
                {i > 0 && ', '}
                <strong>{ack.reviewer}</strong>
                {ack.acknowledged_at && ` at ${new Date(ack.acknowledged_at).toLocaleTimeString()}`}
                {ack.notes ? ` ("${ack.notes}")` : ''}
                <Button
                  variant="plain"
                  aria-label={`Remove ${ack.reviewer}'s acknowledgment`}
                  onClick={() => removeMutation.mutate(ack.reviewer)}
                  isLoading={removeMutation.isPending}
                  style={{ padding: '0 4px', marginLeft: 4 }}
                >
                  <TimesIcon />
                </Button>
              </span>
            ))}
          </FlexItem>
        </Flex>
      </Banner>
    );
  }

  return (
    <Banner color="yellow" style={{ marginBottom: 16 }}>
      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
        <FlexItem>
          {isToday
            ? "Today's report has not been reviewed yet."
            : `Report for ${dateTo} was not reviewed.`}
        </FlexItem>
        {isToday && (
          <FlexItem>
            <Button variant="link" onClick={onAcknowledge} isInline>
              I Reviewed It
            </Button>
          </FlexItem>
        )}
      </Flex>
    </Banner>
  );
};
