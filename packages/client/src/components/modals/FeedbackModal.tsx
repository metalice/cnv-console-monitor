import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  FEEDBACK_DESCRIPTION_MAX,
  FEEDBACK_DESCRIPTION_MIN,
  type FeedbackCategory,
} from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Switch,
  TextArea,
} from '@patternfly/react-core';

import { searchSimilarFeedback } from '../../api/feedback';
import { useComponentFilter } from '../../context/ComponentFilterContext';
import { useToast } from '../../context/ToastContext';
import { useSubmitFeedback } from '../../hooks/useFeedback';
import { getConsoleErrorCount, getConsoleErrors } from '../../utils/consoleBuffer';
import { captureScreenshot } from '../../utils/screenshotCapture';

type FeedbackModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const CATEGORY_OPTIONS: { label: string; value: FeedbackCategory }[] = [
  { label: 'Bug Report', value: 'bug' },
  { label: 'Feature Request', value: 'feature' },
  { label: 'Improvement', value: 'improvement' },
  { label: 'General Feedback', value: 'general' },
];

type SimilarItem = { description: string; id: number; status: string; voteCount: number };

export const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const location = useLocation();
  const { selectedComponents } = useComponentFilter();
  const { addToast } = useToast();
  const submitMutation = useSubmitFeedback();

  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [description, setDescription] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [includeConsole, setIncludeConsole] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);
  const [searchedForDupes, setSearchedForDupes] = useState(false);

  const consoleErrorCount = useMemo(() => getConsoleErrorCount(), []);
  const isBug = category === 'bug';
  const charsRemaining = FEEDBACK_DESCRIPTION_MAX - description.length;
  const isDescriptionValid =
    description.trim().length >= FEEDBACK_DESCRIPTION_MIN &&
    description.length <= FEEDBACK_DESCRIPTION_MAX;

  useEffect(() => {
    if (!isOpen) {
      setCategory('bug');
      setDescription('');
      setIncludeScreenshot(false);
      setIncludeConsole(true);
      setScreenshot(null);
      setSimilarItems([]);
      setSearchedForDupes(false);
      submitMutation.reset();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScreenshotToggle = useCallback(
    async (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
      setIncludeScreenshot(checked);
      if (checked && !screenshot) {
        setCapturingScreenshot(true);
        const result = await captureScreenshot();
        setCapturingScreenshot(false);
        if ('dataUrl' in result) {
          setScreenshot(result.dataUrl);
        } else {
          addToast('warning', result.error);
          setIncludeScreenshot(false);
        }
      }
    },
    [screenshot, addToast],
  );

  const handleCheckDuplicates = useCallback(async () => {
    if (description.trim().length < FEEDBACK_DESCRIPTION_MIN) return;
    try {
      const words = description.trim().split(/\s+/).slice(0, 8).join(' ');
      const results = await searchSimilarFeedback(words, category);
      setSimilarItems(
        results.map(item => ({
          description: item.description.substring(0, 100),
          id: item.id,
          status: item.status,
          voteCount: item.voteCount,
        })),
      );
    } catch {
      setSimilarItems([]);
    }
    setSearchedForDupes(true);
  }, [description, category]);

  const handleSubmit = useCallback(() => {
    const componentFilter =
      selectedComponents.size > 0 ? [...selectedComponents].join(',') : undefined;

    submitMutation.mutate(
      {
        category,
        componentFilter,
        consoleErrors: isBug && includeConsole ? getConsoleErrors() : undefined,
        description: description.trim(),
        pageUrl: location.pathname,
        screenshot: isBug && includeScreenshot ? screenshot : undefined,
      },
      {
        onSuccess: () => {
          addToast('success', 'Feedback submitted', 'Thank you for your feedback!');
          onClose();
        },
      },
    );
  }, [
    category,
    description,
    includeConsole,
    includeScreenshot,
    isBug,
    location.pathname,
    onClose,
    screenshot,
    selectedComponents,
    submitMutation,
    addToast,
  ]);

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={onClose}>
      <ModalHeader title="Send Feedback" />
      <ModalBody>
        <Form>
          <FormGroup isRequired fieldId="feedback-category" label="Category">
            <FormSelect
              id="feedback-category"
              value={category}
              onChange={(_e, val) => {
                setCategory(val as FeedbackCategory);
                setSearchedForDupes(false);
                setSimilarItems([]);
              }}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <FormSelectOption key={opt.value} label={opt.label} value={opt.value} />
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup isRequired fieldId="feedback-description" label="Description">
            <TextArea
              aria-label="Feedback description"
              id="feedback-description"
              placeholder="Describe the issue, feature, or suggestion..."
              resizeOrientation="vertical"
              rows={6}
              value={description}
              onChange={(_e, val) => setDescription(val)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={charsRemaining < 0 ? 'error' : 'default'}>
                  {charsRemaining} characters remaining (min {FEEDBACK_DESCRIPTION_MIN})
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {isBug && (
            <>
              <FormGroup fieldId="feedback-screenshot">
                <Switch
                  id="feedback-screenshot"
                  isChecked={includeScreenshot}
                  isDisabled={capturingScreenshot}
                  label="Attach screenshot of current page"
                  onChange={handleScreenshotToggle}
                />
                {includeScreenshot && screenshot && (
                  <div className="app-feedback-screenshot-preview">
                    <img alt="Screenshot preview" src={screenshot} />
                  </div>
                )}
                {capturingScreenshot && (
                  <Content className="app-text-muted" component="small">
                    Capturing screenshot...
                  </Content>
                )}
              </FormGroup>

              {consoleErrorCount > 0 && (
                <FormGroup fieldId="feedback-console">
                  <Switch
                    id="feedback-console"
                    isChecked={includeConsole}
                    label={`Include browser console errors (${consoleErrorCount} captured)`}
                    onChange={(_e, checked) => setIncludeConsole(checked)}
                  />
                </FormGroup>
              )}
            </>
          )}

          <Content className="app-text-muted" component="p">
            Current page and active filters will be attached automatically.
          </Content>
        </Form>

        {!searchedForDupes && isDescriptionValid && (
          <Button className="app-mt-md" variant="link" onClick={handleCheckDuplicates}>
            Check for similar feedback
          </Button>
        )}

        {searchedForDupes && similarItems.length > 0 && (
          <Alert className="app-mt-md" title="Similar feedback already exists" variant="info">
            {similarItems.map(item => (
              <Content component="p" key={item.id}>
                <strong>#{item.id}</strong> ({item.status}, {item.voteCount} votes):{' '}
                {item.description}...
              </Content>
            ))}
            <Content className="app-mt-sm" component="p">
              Consider upvoting existing feedback instead of submitting a duplicate.
            </Content>
          </Alert>
        )}

        {searchedForDupes && similarItems.length === 0 && (
          <Alert className="app-mt-md" title="No similar feedback found" variant="success" />
        )}

        {submitMutation.isError && (
          <Alert className="app-mt-md" title={submitMutation.error.message} variant="danger" />
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!isDescriptionValid || submitMutation.isPending}
          isLoading={submitMutation.isPending}
          variant="primary"
          onClick={handleSubmit}
        >
          Submit Feedback
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
