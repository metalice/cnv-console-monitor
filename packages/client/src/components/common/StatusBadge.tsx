import { Label, Tooltip } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';

type StatusBadgeProps = {
  status: string;
  rpStatus?: string;
};

type BadgeConfig = {
  color: 'green' | 'red' | 'orange' | 'grey';
  icon: React.ReactNode;
  label: string;
};

const JENKINS_MAP = new Map<string, BadgeConfig>([
  ['aborted', { color: 'grey', icon: <BanIcon />, label: 'Aborted' }],
  ['failure', { color: 'red', icon: <ExclamationCircleIcon />, label: 'Failed' }],
  ['success', { color: 'green', icon: <CheckCircleIcon />, label: 'Passed' }],
  ['unstable', { color: 'orange', icon: <ExclamationTriangleIcon />, label: 'Unstable' }],
]);

export const StatusBadge = ({ rpStatus, status }: StatusBadgeProps) => {
  const jenkinsInfo = JENKINS_MAP.get(status.toLowerCase());

  if (jenkinsInfo) {
    const badge = (
      <Label color={jenkinsInfo.color} icon={jenkinsInfo.icon}>
        {jenkinsInfo.label}
      </Label>
    );
    if (rpStatus && rpStatus !== status) {
      return <Tooltip content={`RP status: ${rpStatus}`}>{badge}</Tooltip>;
    }
    return badge;
  }

  switch (status) {
    case 'PASSED':
      return (
        <Label color="green" icon={<CheckCircleIcon />}>
          Passed
        </Label>
      );
    case 'FAILED':
      return (
        <Label color="red" icon={<ExclamationCircleIcon />}>
          Failed
        </Label>
      );
    case 'IN_PROGRESS':
      return (
        <Label color="blue" icon={<InProgressIcon />}>
          In Progress
        </Label>
      );
    default:
      return (
        <Label color="grey" icon={<BanIcon />}>
          {status}
        </Label>
      );
  }
};
