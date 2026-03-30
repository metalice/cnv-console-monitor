import { Content, Grid, GridItem } from '@patternfly/react-core';

import { QUICK_START_GUIDES } from './quickStartData';
import { QuickStartGuide } from './QuickStartGuide';

export const QuickStartTab = () => (
  <div className="app-mt-lg">
    <Content className="app-text-muted app-mb-md" component="p">
      Step-by-step guides for common workflows. Follow the steps and use the links to jump to the
      right page.
    </Content>
    <Grid hasGutter>
      {QUICK_START_GUIDES.map(guide => (
        <GridItem key={guide.title} md={6} span={12}>
          <QuickStartGuide {...guide} />
        </GridItem>
      ))}
    </Grid>
  </div>
);
