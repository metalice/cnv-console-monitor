import React from 'react';
import { Card, CardBody, Content, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

type StatCardProps = {
  value: number | string;
  label: string;
  help?: string;
  color?: string;
  onClick?: () => void;
  isActive?: boolean;
};

export const StatCard: React.FC<StatCardProps> = ({ value, label, help, color, onClick, isActive }) => (
  <Card
    isCompact
    isClickable={!!onClick}
    isSelectable={!!onClick}
    isSelected={isActive}
    onClick={onClick}
    className={onClick ? 'app-cursor-pointer' : undefined}
  >
    <CardBody>
      <Content component="h2" style={{ textAlign: 'center', color }}>
        {value}
      </Content>
      <Content component="small" style={{ textAlign: 'center', display: 'block' }}>
        {label}
        {help && (
          <>
            {' '}
            <Tooltip content={help}>
              <OutlinedQuestionCircleIcon className="app-cursor-help" style={{ opacity: 0.5, fontSize: 'var(--pf-t--global--font--size--xs)' }} />
            </Tooltip>
          </>
        )}
      </Content>
    </CardBody>
  </Card>
);
