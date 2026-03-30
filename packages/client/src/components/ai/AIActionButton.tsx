import { useState } from 'react';

import { Button, Tooltip } from '@patternfly/react-core';
import { MagicIcon } from '@patternfly/react-icons';
import { useMutation } from '@tanstack/react-query';

import { AIResultModal } from './AIResultModal';

type AIActionButtonProps = {
  label: string;
  description: string;
  help?: string;
  apiCall: () => Promise<{
    result?: Record<string, unknown>;
    response?: string;
    model: string;
    cached: boolean;
    tokensUsed?: number;
    durationMs?: number;
  }>;
  variant?: 'primary' | 'secondary' | 'link';
  size?: 'sm' | 'lg';
};

export const AIActionButton = ({
  apiCall,
  description,
  help,
  label,
  size = 'sm',
  variant = 'secondary',
}: AIActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const mutation = useMutation({ mutationFn: apiCall });

  const handleClick = () => {
    setIsOpen(true);
    mutation.mutate();
  };

  const triggerButton = (
    <Button
      icon={<MagicIcon />}
      isLoading={mutation.isPending}
      size={size}
      variant={variant}
      onClick={handleClick}
    >
      {label}
    </Button>
  );

  return (
    <>
      {help ? <Tooltip content={help}>{triggerButton}</Tooltip> : triggerButton}
      <AIResultModal
        description={description}
        isOpen={isOpen}
        mutation={mutation}
        title={label}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
