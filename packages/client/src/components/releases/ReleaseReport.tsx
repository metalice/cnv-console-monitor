import React, { useMemo, useState } from 'react';
import {
  Button, Modal, ModalVariant, ModalHeader, ModalBody, ModalFooter,
  ClipboardCopy, ClipboardCopyVariant, Tabs, Tab, TabTitleText,
} from '@patternfly/react-core';
import { FileAltIcon } from '@patternfly/react-icons';
import type { ReleaseInfo, ChecklistTask } from '@cnv-monitor/shared';
import type { VersionReadiness } from '../../api/releases';

type ReleaseReportProps = {
  release: ReleaseInfo;
  checklist?: ChecklistTask[];
  readiness?: VersionReadiness | null;
};

export const ReleaseReport: React.FC<ReleaseReportProps> = ({ release, checklist, readiness }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState(0);

  const openItems = (checklist ?? []).filter(t => t.status !== 'Closed');
  const closedItems = (checklist ?? []).filter(t => t.status === 'Closed');

  const slackReport = useMemo(() => {
    const version = release.shortname.replace('cnv-', 'CNV ');
    const lines: string[] = [];
    lines.push(`:rocket: *${version} Release Status*`);
    if (release.nextRelease) {
      lines.push(`> Next: *${release.nextRelease.name}* — ${new Date(release.nextRelease.date).toLocaleDateString()}${release.daysUntilNext !== null ? ` (${release.daysUntilNext} days)` : ''}`);
    }
    lines.push('');
    lines.push(`*Checklist:* ${closedItems.length}/${(checklist ?? []).length} done`);
    if (readiness?.passRate !== null && readiness?.passRate !== undefined) {
      lines.push(`*Pass Rate:* ${readiness.passRate}% (${readiness.totalLaunches} launches)`);
    }
    if (openItems.length > 0) {
      lines.push('');
      lines.push(`*Open Items (${openItems.length}):*`);
      openItems.slice(0, 10).forEach(t => {
        lines.push(`• <https://issues.redhat.com/browse/${t.key}|${t.key}> ${t.summary} (${t.assignee || 'Unassigned'})`);
      });
      if (openItems.length > 10) lines.push(`_...and ${openItems.length - 10} more_`);
    }
    return lines.join('\n');
  }, [release, checklist, readiness, openItems, closedItems]);

  const markdownReport = useMemo(() => {
    const version = release.shortname.replace('cnv-', 'CNV ');
    const lines: string[] = [];
    lines.push(`# ${version} Release Status`);
    if (release.nextRelease) {
      lines.push(`**Next:** ${release.nextRelease.name} — ${new Date(release.nextRelease.date).toLocaleDateString()}${release.daysUntilNext !== null ? ` (${release.daysUntilNext} days)` : ''}`);
    }
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Checklist | ${closedItems.length}/${(checklist ?? []).length} done |`);
    if (readiness?.passRate !== null && readiness?.passRate !== undefined) {
      lines.push(`| Pass Rate | ${readiness.passRate}% |`);
      lines.push(`| Launches | ${readiness.totalLaunches} |`);
    }
    if (openItems.length > 0) {
      lines.push('');
      lines.push(`## Open Items (${openItems.length})`);
      openItems.forEach(t => {
        lines.push(`- [${t.key}](https://issues.redhat.com/browse/${t.key}) ${t.summary} — ${t.assignee || 'Unassigned'}`);
      });
    }
    return lines.join('\n');
  }, [release, checklist, readiness, openItems, closedItems]);

  return (
    <>
      <Button variant="secondary" icon={<FileAltIcon />} onClick={() => setIsOpen(true)} size="sm">
        Generate Report
      </Button>
      <Modal variant={ModalVariant.large} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalHeader title={`${release.shortname.replace('cnv-', 'CNV ')} Release Report`} />
        <ModalBody>
          <Tabs activeKey={format} onSelect={(_e, k) => setFormat(k as number)}>
            <Tab eventKey={0} title={<TabTitleText>Slack</TabTitleText>}>
              <ClipboardCopy isBlock variant={ClipboardCopyVariant.expansion} className="app-mt-md">
                {slackReport}
              </ClipboardCopy>
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Markdown</TabTitleText>}>
              <ClipboardCopy isBlock variant={ClipboardCopyVariant.expansion} className="app-mt-md">
                {markdownReport}
              </ClipboardCopy>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="link" onClick={() => setIsOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
