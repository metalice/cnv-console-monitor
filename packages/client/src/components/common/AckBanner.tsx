import React from 'react';

import { Alert, Button, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAcknowledgment, fetchAckStatus } from '../../api/acknowledgment';
import { useDate } from '../../context/DateContext';

type AckBannerProps = {
  onAcknowledge: () => void;
  component?: string;
};

const todayStr = (): string => new Date().toISOString().split('T')[0];

export const AckBanner: React.FC<AckBannerProps> = ({ component, onAcknowledge }) => {
  const queryClient = useQueryClient();
  const { dateTo } = useDate();
  const isToday = dateTo === todayStr();

  const { data } = useQuery({
    queryFn: () => fetchAckStatus(dateTo, component),
    queryKey: ['acknowledgment', dateTo, component],
    refetchInterval: isToday ? 60000 : false,
  });

  const removeMutation = useMutation({
    mutationFn: (reviewer: string) => deleteAcknowledgment(dateTo, reviewer),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['acknowledgment'] });
    },
  });

  if (!data) {
    return null;
  }

  if (data.acknowledged && data.acknowledgments.length > 0) {
    return (
      <Alert
        isInline
        isPlain
        className="app-mb-md"
        title={
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            flexWrap={{ default: 'wrap' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <CheckCircleIcon /> Reviewed
            </FlexItem>
            {data.acknowledgments.map(ack => (
              <FlexItem key={ack.reviewer}>
                <Tooltip
                  content={
                    <>
                      {ack.acknowledged_at && (
                        <div>{new Date(ack.acknowledged_at).toLocaleString()}</div>
                      )}
                      {ack.notes && <div className="app-white-space-pre">{ack.notes}</div>}
                    </>
                  }
                >
                  <Label color="green" onClose={() => removeMutation.mutate(ack.reviewer)}>
                    {ack.reviewer}
                    {ack.acknowledged_at &&
                      ` · ${new Date(ack.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </Label>
                </Tooltip>
              </FlexItem>
            ))}
          </Flex>
        }
        variant="success"
      />
    );
  }

  return (
    <Alert
      isInline
      className="app-mb-md"
      title={
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'wrap' }}
          spaceItems={{ default: 'spaceItemsMd' }}
        >
          <FlexItem>
            {isToday
              ? "Today's report has not been reviewed."
              : `Report for ${dateTo} was not reviewed.`}
          </FlexItem>
          {isToday && (
            <FlexItem>
              <Button size="sm" variant="primary" onClick={onAcknowledge}>
                Acknowledge
              </Button>
            </FlexItem>
          )}
        </Flex>
      }
      variant="warning"
    />
  );
};
