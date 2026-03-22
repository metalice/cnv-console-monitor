import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Popover,
  Spinner,
  Content,
  Label,
} from '@patternfly/react-core';
import { BanIcon, LightbulbIcon, TimesIcon } from '@patternfly/react-icons';
import { useMutation } from '@tanstack/react-query';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';

interface TestBlock {
  name: string;
  line: number;
  type: string;
}

interface CodeViewerProps {
  content: string;
  language?: string;
  highlightLines?: number[];
  scrollToLine?: number;
  testBlocks?: TestBlock[];
  onQuarantine?: (testName: string, line: number) => void;
  counterpartDocPath?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  content,
  language = 'typescript',
  highlightLines,
  scrollToLine,
  testBlocks,
  onQuarantine,
  counterpartDocPath,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBlock, setSelectedBlock] = useState<TestBlock | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const highlighted = useMemo(() => {
    const grammar = Prism.languages[language] || Prism.languages.typescript;
    return Prism.highlight(content, grammar, language);
  }, [content, language]);

  const lines = useMemo(() => highlighted.split('\n'), [highlighted]);
  const highlightSet = useMemo(() => new Set(highlightLines || []), [highlightLines]);

  const blockByLine = useMemo(() => {
    const map = new Map<number, TestBlock>();
    if (testBlocks) {
      for (const block of testBlocks) {
        if (block.type === 'test' || block.type === 'it') {
          map.set(block.line, block);
        }
      }
    }
    return map;
  }, [testBlocks]);

  useEffect(() => {
    if (scrollToLine && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-line="${scrollToLine}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [scrollToLine, content]);

  useEffect(() => {
    setSelectedBlock(null);
    setAiInsight(null);
  }, [content]);

  const aiMutation = useMutation({
    mutationFn: async (block: TestBlock) => {
      const startLine = Math.max(0, block.line - 1);
      const contentLines = content.split('\n');
      let endLine = startLine;
      let braceDepth = 0;
      let foundOpen = false;
      for (let i = startLine; i < contentLines.length && i < startLine + 100; i++) {
        for (const ch of contentLines[i]) {
          if (ch === '{') { braceDepth++; foundOpen = true; }
          if (ch === '}') braceDepth--;
        }
        endLine = i;
        if (foundOpen && braceDepth <= 0) break;
      }
      const testCode = contentLines.slice(startLine, endLine + 1).join('\n');

      const { apiFetch } = await import('../../api/client');
      const response = await apiFetch<{ response?: string; content?: string; result?: Record<string, unknown> }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze this Playwright/Cypress test function and provide:
1. **What it tests** - A clear one-sentence explanation
2. **Requirements** - What feature/requirement this validates
3. **Key assertions** - What is being verified
4. **Risk if quarantined** - Impact of disabling this test
5. **Related areas** - Other tests or features that are related

Test name: "${block.name}"
Test code:
\`\`\`typescript
${testCode}
\`\`\`

Be concise. Use markdown formatting.`,
          }],
          maxTokens: 500,
        }),
      });
      return response.content || response.response || JSON.stringify(response.result) || 'No response from AI';
    },
    onSuccess: (data) => setAiInsight(data as string),
    onError: (err) => setAiInsight(`**Error:** ${err instanceof Error ? err.message : 'AI analysis failed'}`),
  });

  const handleLineClick = useCallback((lineNum: number) => {
    const block = blockByLine.get(lineNum);
    if (block) {
      setSelectedBlock(prev => prev?.line === block.line ? null : block);
      setAiInsight(null);
    }
  }, [blockByLine]);

  return (
    <div className="app-code-viewer" ref={containerRef}>
      {selectedBlock && (
        <div className="app-code-action-bar">
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }} flexWrap={{ default: 'nowrap' }}>
            <FlexItem grow={{ default: 'grow' }}>
              <Label isCompact color="blue" className="app-text-mono">{selectedBlock.name}</Label>
            </FlexItem>
            <FlexItem>
              <Button
                variant="secondary"
                size="sm"
                icon={<BanIcon />}
                onClick={() => onQuarantine?.(selectedBlock.name, selectedBlock.line)}
              >
                Quarantine
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                variant="secondary"
                size="sm"
                icon={<LightbulbIcon />}
                onClick={() => aiMutation.mutate(selectedBlock)}
                isLoading={aiMutation.isPending}
                isDisabled={aiMutation.isPending}
              >
                AI Insight
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant="plain" size="sm" icon={<TimesIcon />} onClick={() => { setSelectedBlock(null); setAiInsight(null); }} />
            </FlexItem>
          </Flex>
          {aiMutation.isPending && (
            <div className="app-code-ai-panel">
              <Spinner size="md" /> <span className="app-text-muted app-ml-sm">Analyzing test...</span>
            </div>
          )}
          {aiInsight && (
            <div className="app-code-ai-panel app-doc-content" dangerouslySetInnerHTML={{ __html: marked.parse(aiInsight, { async: false }) as string }} />
          )}
        </div>
      )}
      <pre className="app-code-pre">
        <code>
          {lines.map((lineHtml, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightSet.has(lineNum);
            const isTestLine = blockByLine.has(lineNum);
            const isSelected = selectedBlock?.line === lineNum;
            return (
              <div
                key={lineNum}
                data-line={lineNum}
                className={`app-code-line${isHighlighted ? ' app-code-line--highlight' : ''}${isTestLine ? ' app-code-line--clickable' : ''}${isSelected ? ' app-code-line--selected' : ''}`}
              >
                <span className="app-code-line-number">{lineNum}</span>
                <span className="app-code-line-content" dangerouslySetInnerHTML={{ __html: lineHtml || ' ' }} />
                {isTestLine && (
                  <span className="app-code-line-actions">
                    <button
                      type="button"
                      className="app-code-action-btn app-code-action-btn--quarantine"
                      title={`Quarantine: ${blockByLine.get(lineNum)!.name}`}
                      onClick={(e) => { e.stopPropagation(); onQuarantine?.(blockByLine.get(lineNum)!.name, lineNum); }}
                    >
                      <BanIcon /> Quarantine
                    </button>
                    <button
                      type="button"
                      className="app-code-action-btn app-code-action-btn--ai"
                      title={`AI Insight: ${blockByLine.get(lineNum)!.name}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedBlock(blockByLine.get(lineNum)!); aiMutation.mutate(blockByLine.get(lineNum)!); }}
                    >
                      <LightbulbIcon /> AI Insight
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
};
