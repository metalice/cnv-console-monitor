import { Button, ExpandableSection, Tooltip } from '@patternfly/react-core';
import { MagicIcon } from '@patternfly/react-icons';

import type { BugReport } from '../../api/ai';

type AiBugReportSectionProps = {
  isPending: boolean;
  report: BugReport | null;
  isExpanded: boolean;
  onGenerate: () => void;
  onToggle: (_e: React.MouseEvent, isExpanded: boolean) => void;
};

export const AiBugReportSection = ({
  isExpanded,
  isPending,
  onGenerate,
  onToggle,
  report,
}: AiBugReportSectionProps) => (
  <div className="app-mt-md">
    <Tooltip content="AI generates a complete bug report from the test name, error message, and version context — including title, description, steps to reproduce, and expected vs actual results.">
      <Button
        icon={<MagicIcon />}
        isDisabled={isPending}
        isLoading={isPending}
        size="sm"
        variant="secondary"
        onClick={onGenerate}
      >
        Generate with AI
      </Button>
    </Tooltip>
    {report && (
      <ExpandableSection
        className="app-mt-sm"
        isExpanded={isExpanded}
        toggleText="AI-Generated Bug Report"
        onToggle={onToggle}
      >
        <div className="app-text-xs">
          {report.report.title && (
            <div>
              <strong>Title:</strong> {report.report.title}
            </div>
          )}
          {report.report.description && (
            <div className="app-mt-xs">
              <strong>Description:</strong> {report.report.description}
            </div>
          )}
          {report.report.stepsToReproduce && (
            <div className="app-mt-xs">
              <strong>Steps:</strong> {report.report.stepsToReproduce}
            </div>
          )}
          {report.report.expectedResult && (
            <div className="app-mt-xs">
              <strong>Expected:</strong> {report.report.expectedResult}
            </div>
          )}
          {report.report.actualResult && (
            <div className="app-mt-xs">
              <strong>Actual:</strong> {report.report.actualResult}
            </div>
          )}
          <div className="app-text-muted app-mt-xs">
            {report.model}
            {report.cached ? ' (cached)' : ''}
          </div>
        </div>
      </ExpandableSection>
    )}
  </div>
);
