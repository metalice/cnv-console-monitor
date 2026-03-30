import { Content, Flex, FlexItem } from '@patternfly/react-core';
import {
  ArrowRightIcon,
  BellIcon,
  DatabaseIcon,
  ExclamationCircleIcon,
  HomeIcon,
  ServerIcon,
  SyncAltIcon,
  WrenchIcon,
} from '@patternfly/react-icons';

const FlowNode = ({
  icon,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}) => (
  <div className="app-about-flow-node">
    {icon}
    <strong>{label}</strong>
    <Content className="app-text-muted" component="small">
      {sublabel}
    </Content>
  </div>
);

const FlowPhase = ({
  icon,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}) => (
  <div className="app-about-flow-phase">
    {icon}
    <strong>{label}</strong>
    <Content className="app-text-muted" component="small">
      {sublabel}
    </Content>
  </div>
);

export const DataFlowDiagram = () => (
  <Flex
    alignItems={{ default: 'alignItemsCenter' }}
    className="app-about-flow"
    flexWrap={{ default: 'wrap' }}
    justifyContent={{ default: 'justifyContentCenter' }}
    spaceItems={{ default: 'spaceItemsMd' }}
  >
    <FlexItem>
      <FlowNode
        icon={<ServerIcon className="app-about-flow-icon" />}
        label="ReportPortal"
        sublabel="Test data source"
      />
    </FlexItem>
    <FlexItem>
      <ArrowRightIcon className="app-about-flow-arrow" />
    </FlexItem>
    <FlexItem>
      <div className="app-about-flow-pipeline">
        <Content className="app-about-flow-pipeline-label" component="small">
          Data Pipeline
        </Content>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <FlowPhase
              icon={<SyncAltIcon className="app-about-flow-phase-icon" />}
              label="1. Fetch Launches"
              sublabel="Pull from RP API"
            />
          </FlexItem>
          <FlexItem>
            <ArrowRightIcon className="app-about-flow-arrow-sm" />
          </FlexItem>
          <FlexItem>
            <FlowPhase
              icon={<ExclamationCircleIcon className="app-about-flow-phase-icon" />}
              label="2. Fetch Failed Items"
              sublabel="Test items + errors"
            />
          </FlexItem>
          <FlexItem>
            <ArrowRightIcon className="app-about-flow-arrow-sm" />
          </FlexItem>
          <FlexItem>
            <FlowPhase
              icon={<WrenchIcon className="app-about-flow-phase-icon" />}
              label="3. Jenkins Enrichment"
              sublabel="Component, team, tier"
            />
          </FlexItem>
        </Flex>
      </div>
    </FlexItem>
    <FlexItem>
      <ArrowRightIcon className="app-about-flow-arrow" />
    </FlexItem>
    <FlexItem>
      <FlowNode
        icon={<DatabaseIcon className="app-about-flow-icon" />}
        label="PostgreSQL"
        sublabel="Persistent storage"
      />
    </FlexItem>
    <FlexItem>
      <ArrowRightIcon className="app-about-flow-arrow" />
    </FlexItem>
    <FlexItem>
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <FlowNode
            icon={<HomeIcon className="app-about-flow-icon" />}
            label="Dashboard"
            sublabel="Web UI"
          />
        </FlexItem>
        <FlexItem>
          <FlowNode
            icon={<BellIcon className="app-about-flow-icon" />}
            label="Notifications"
            sublabel="Slack & Email"
          />
        </FlexItem>
      </Flex>
    </FlexItem>
  </Flex>
);
