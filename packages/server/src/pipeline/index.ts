import { autoGenerateMappings } from '../componentMap';
import { backfillComponentFromSiblings } from '../db/store';
import { logger } from '../logger';

import { EnrichJenkinsPhase } from './phases/EnrichJenkins';
import { FetchItemsPhase } from './phases/FetchItems';
import { FetchLaunchesPhase } from './phases/FetchLaunches';
import { getPipelineManager } from './PipelineManager';

const log = logger.child({ module: 'Pipeline' });

export { EnrichJenkinsPhase } from './phases/EnrichJenkins';
export { FetchItemsPhase } from './phases/FetchItems';
export { FetchLaunchesPhase } from './phases/FetchLaunches';
export { getPipelineManager, initPipelineManager } from './PipelineManager';

export const registerDefaultPhases = (): {
  launches: FetchLaunchesPhase;
  items: FetchItemsPhase;
  jenkins: EnrichJenkinsPhase;
} => {
  const manager = getPipelineManager();
  const launches = new FetchLaunchesPhase();
  const items = new FetchItemsPhase();
  const jenkins = new EnrichJenkinsPhase();

  manager.registerPhase(launches);
  manager.registerPhase(items);
  manager.registerPhase(jenkins);

  manager.onPhaseComplete = phaseName => {
    if (phaseName === 'launches') {
      const launchData = launches.getLaunches();
      items.setLaunches(launchData);
      jenkins.setLaunches(launchData);
      log.info({ count: launchData.length }, 'Launches fed to items and jenkins phases');
    }
    if (phaseName === 'jenkins') {
      autoGenerateMappings()
        .then(() => backfillComponentFromSiblings())
        .catch(err => log.warn({ err }, 'Post-jenkins mapping failed'));
    }
  };

  return { items, jenkins, launches };
};

export const startPipeline = async (options: {
  mode: 'incremental' | 'full';
  lookbackHours: number;
  clearData: boolean;
}): Promise<void> => {
  const manager = getPipelineManager();
  const launchesPhase = [
    ...(manager as unknown as { phases: Map<string, unknown> }).phases.values(),
  ].find((p: unknown) => (p as { name: string }).name === 'launches') as
    | FetchLaunchesPhase
    | undefined;

  if (launchesPhase) {
    launchesPhase.configure(options.lookbackHours, options.clearData);
  }

  await manager.start(options);
};
