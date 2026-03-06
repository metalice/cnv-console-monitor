import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Label,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { CheckCircleIcon, TimesIcon } from '@patternfly/react-icons';
import { fetchAckStatus, submitAcknowledgment, deleteAcknowledgment } from '../../api/acknowledgment';
import { useDate } from '../../context/DateContext';
import { useAuth } from '../../context/AuthContext';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export const AckBanner: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { dateTo } = useDate();
  const isToday = dateTo === todayStr();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const { data } = useQuery({
    queryKey: ['acknowledgment', dateTo],
    queryFn: () => fetchAckStatus(dateTo),
    refetchInterval: isToday ? 60000 : false,
  });

  const ackMutation = useMutation({
    mutationFn: (ackNotes?: string) => submitAcknowledgment({ reviewer: user.name, notes: ackNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgment'] });
      setShowNotes(false);
      setNotes('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (reviewer: string) => deleteAcknowledgment(dateTo, reviewer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgment'] });
    },
  });

  if (!data) return null;

  if (data.acknowledged && data.acknowledgments.length > 0) {
    return (
      <Alert
        variant="success"
        isInline
        isPlain
        title={
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }} flexWrap={{ default: 'wrap' }}>
            <FlexItem>
              <CheckCircleIcon /> Reviewed
            </FlexItem>
            {data.acknowledgments.map((ack) => (
              <FlexItem key={ack.reviewer}>
                <Tooltip
                  content={
                    <>
                      {ack.acknowledged_at && <div>{new Date(ack.acknowledged_at).toLocaleString()}</div>}
                      {ack.notes && <div>{ack.notes}</div>}
                    </>
                  }
                >
                  <Label
                    color="green"
                    onClose={() => removeMutation.mutate(ack.reviewer)}
                  >
                    {ack.reviewer}
                    {ack.acknowledged_at && ` · ${new Date(ack.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </Label>
                </Tooltip>
              </FlexItem>
            ))}
          </Flex>
        }
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <Alert
      variant="warning"
      isInline
      title={
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }}>
          <FlexItem>
            {isToday ? "Today's report has not been reviewed." : `Report for ${dateTo} was not reviewed.`}
          </FlexItem>
          {isToday && (
            <>
              <FlexItem>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => ackMutation.mutate(notes || undefined)}
                  isLoading={ackMutation.isPending}
                >
                  Acknowledge
                </Button>
              </FlexItem>
              <FlexItem>
                {showNotes ? (
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <TextInput
                        value={notes}
                        onChange={(_e, val) => setNotes(val)}
                        placeholder="Optional notes..."
                        aria-label="Acknowledgment notes"
                        style={{ width: 250 }}
                      />
                    </FlexItem>
                    <FlexItem>
                      <Button variant="plain" size="sm" onClick={() => { setShowNotes(false); setNotes(''); }} aria-label="Cancel notes">
                        <TimesIcon />
                      </Button>
                    </FlexItem>
                  </Flex>
                ) : (
                  <Button variant="link" size="sm" isInline onClick={() => setShowNotes(true)}>
                    + Add notes
                  </Button>
                )}
              </FlexItem>
            </>
          )}
        </Flex>
      }
      style={{ marginBottom: 16 }}
    />
  );
};
