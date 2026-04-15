import { useState } from 'react';

import type { Subscription } from '@cnv-monitor/shared';

import { Alert, Card, CardBody, Flex, FlexItem, Spinner } from '@patternfly/react-core';

import { SubscriptionCardHeader } from './SubscriptionCardHeader';
import { SubscriptionCardMeta } from './SubscriptionCardMeta';
import { SubscriptionChannels } from './SubscriptionChannels';
import { SubscriptionEditForm } from './SubscriptionEditForm';
import type { AlertMessage } from './types';

type SubscriptionCardProps = {
  sub: Subscription;
  availableComponents: string[];
  testingSubId: number | string | null;
  subTestMessages: Record<number | string, AlertMessage[]>;
  canEdit: boolean;
  onUpdate: (data: Partial<Subscription>) => void;
  onToggle: (checked: boolean) => void;
  onTest: () => void;
  onDelete: () => void;
};

export const SubscriptionCard = ({
  availableComponents,
  canEdit,
  onDelete,
  onTest,
  onToggle,
  onUpdate,
  sub,
  subTestMessages,
  testingSubId,
}: SubscriptionCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const cardClass = `app-sub-card ${sub.enabled ? '' : 'app-sub-card--disabled'}`;

  return (
    <Card isCompact className={cardClass}>
      <SubscriptionCardHeader
        canEdit={canEdit}
        sub={sub}
        testingSubId={testingSubId}
        onDelete={onDelete}
        onEdit={() => setIsEditing(true)}
        onTest={onTest}
        onToggle={onToggle}
      />

      <CardBody>
        <SubscriptionCardMeta sub={sub} />
        <SubscriptionChannels sub={sub} />

        {testingSubId === sub.id && (
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            className="app-mt-sm"
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Spinner size="md" />
            </FlexItem>
            <FlexItem>
              <span className="app-text-muted">Testing delivery...</span>
            </FlexItem>
          </Flex>
        )}

        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
        {subTestMessages[sub.id]?.map((msg, idx) => (
          <Alert
            isInline
            isPlain
            className="app-mt-sm"
            // eslint-disable-next-line react/no-array-index-key -- static list from test result
            key={idx}
            title={msg.text}
            variant={msg.type}
          />
        ))}

        {isEditing && (
          <SubscriptionEditForm
            availableComponents={availableComponents}
            sub={sub}
            onClose={() => setIsEditing(false)}
            onUpdate={onUpdate}
          />
        )}
      </CardBody>
    </Card>
  );
};
