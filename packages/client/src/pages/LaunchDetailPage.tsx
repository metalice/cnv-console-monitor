import { useNavigate } from 'react-router-dom';

import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { JiraLinkModal } from '../components/modals/JiraLinkModal';
import { TriageModal } from '../components/modals/TriageModal';

import { LaunchDetailContent } from './LaunchDetailContent';
import { LaunchDetailHeader } from './LaunchDetailHeader';
import { useLaunchDetail } from './useLaunchDetail';

export const LaunchDetailPage = () => {
  const navigate = useNavigate();
  const detail = useLaunchDetail();

  const subtitle = detail.items
    ? detail.isGroupMode
      ? `${detail.failedItems.length} total failures across ${detail.launchIds.length} launches (${detail.displayItems.length} unique tests)`
      : `${detail.passedItems.length} passed / ${detail.failedItems.length} failed / ${detail.skippedItems.length} skipped`
    : 'Loading...';

  return (
    <>
      <LaunchDetailHeader
        autoAnalysis={detail.autoAnalysis}
        config={detail.config}
        isGroupMode={detail.isGroupMode}
        launchRpId={detail.launchRpId}
        patternAnalysis={detail.patternAnalysis}
        subtitle={subtitle}
        title={detail.title}
        uniqueAnalysis={detail.uniqueAnalysis}
        onNavigateBack={() => navigate('/')}
      />

      <LaunchDetailContent
        config={detail.config}
        displayItems={detail.displayItems}
        isGroupMode={detail.isGroupMode}
        isLoading={detail.isLoading}
        items={detail.items}
        launchIds={detail.launchIds}
        launchRpId={detail.launchRpId}
        onCreateJira={detail.setJiraCreateItem}
        onLinkJira={detail.setJiraLinkItemId}
        onNavigate={navigate}
        onTriage={detail.setTriageItemIds}
      />

      {detail.triageItemIds && (
        <TriageModal
          isOpen
          itemIds={detail.triageItemIds}
          onClose={() => detail.setTriageItemIds(null)}
        />
      )}
      {detail.jiraCreateItem && (
        <JiraCreateModal
          isOpen
          polarionId={detail.jiraCreateItem.polarion_id}
          testItemId={detail.jiraCreateItem.rp_id}
          testName={detail.jiraCreateItem.name}
          onClose={() => detail.setJiraCreateItem(null)}
        />
      )}
      {detail.jiraLinkItemId && (
        <JiraLinkModal
          isOpen
          testItemId={detail.jiraLinkItemId}
          onClose={() => detail.setJiraLinkItemId(null)}
        />
      )}
    </>
  );
};
