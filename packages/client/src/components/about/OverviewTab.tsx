import { type PublicConfig } from '@cnv-monitor/shared';

import { Card, CardBody, Content } from '@patternfly/react-core';

import { type AIStatus } from '../../api/ai';
import { type PollStatusResponse } from '../../api/poll';

import { DataFlowDiagram } from './DataFlowDiagram';
import { IntegrationsGallery } from './IntegrationsGallery';

type OverviewTabProps = {
  config: PublicConfig | undefined;
  pollStatus: PollStatusResponse | undefined;
  aiStatus: AIStatus | undefined;
};

export const OverviewTab = ({ aiStatus, config, pollStatus }: OverviewTabProps) => (
  <div className="app-mt-lg">
    <Content className="app-mb-md" component="h2">
      How It Works
    </Content>
    <Card className="app-mb-lg">
      <CardBody>
        <DataFlowDiagram />
      </CardBody>
    </Card>

    <Content className="app-mb-md" component="h2">
      Integrations
    </Content>
    <IntegrationsGallery aiStatus={aiStatus} config={config} pollStatus={pollStatus} />
  </div>
);
