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

export const StatCard: React.FC<StatCardProps> = ({
  color,
  help,
  isActive,
  label,
  onClick,
  value,
}) => (
  <Card
    isCompact
    className={onClick ? 'app-cursor-pointer' : undefined}
    isClickable={Boolean(onClick)}
    isSelectable={Boolean(onClick)}
    isSelected={isActive}
    onClick={onClick}
  >
    <CardBody>
      <Content className="app-text-center" component="h2" style={{ color }}>
        {value}
      </Content>
      <Content className="app-text-block-center" component="small">
        {label}
        {help && (
          <>
            {' '}
            <Tooltip content={help}>
              <OutlinedQuestionCircleIcon className="app-cursor-help app-help-icon-xs" />
            </Tooltip>
          </>
        )}
      </Content>
    </CardBody>
  </Card>
);
