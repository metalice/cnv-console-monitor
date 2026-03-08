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
    isSelected={isActive}
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : undefined}
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
              <OutlinedQuestionCircleIcon style={{ cursor: 'help', opacity: 0.5, fontSize: 11 }} />
            </Tooltip>
          </>
        )}
      </Content>
    </CardBody>
  </Card>
);
