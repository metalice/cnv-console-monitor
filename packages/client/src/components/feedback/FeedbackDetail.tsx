import { useState } from 'react';

import type { Feedback, FeedbackPriority, FeedbackStatus } from '@cnv-monitor/shared';
import { timeAgo } from '@cnv-monitor/shared';

import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  FormSelect,
  FormSelectOption,
  Label,
  LabelGroup,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

import { useAuth } from '../../context/AuthContext';
import { useRespondToFeedback, useUpdateFeedback } from '../../hooks/useFeedback';

type FeedbackDetailProps = {
  item: Feedback;
};

const STATUS_OPTIONS = ['new', 'acknowledged', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['', 'low', 'medium', 'high', 'critical'];

export const FeedbackDetail = ({ item }: FeedbackDetailProps) => {
  const { isAdmin } = useAuth();
  const updateMutation = useUpdateFeedback();
  const respondMutation = useRespondToFeedback();

  const [responseText, setResponseText] = useState('');
  const [newTag, setNewTag] = useState('');

  const handleStatusChange = (_e: React.FormEvent, val: string) => {
    updateMutation.mutate({ data: { status: val as FeedbackStatus }, id: item.id });
  };

  const handlePriorityChange = (_e: React.FormEvent, val: string) => {
    updateMutation.mutate({
      data: { priority: (val || null) as FeedbackPriority | null },
      id: item.id,
    });
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || item.tags.includes(trimmed)) return;
    updateMutation.mutate({ data: { tags: [...item.tags, trimmed] }, id: item.id });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    updateMutation.mutate({
      data: { tags: item.tags.filter(existing => existing !== tag) },
      id: item.id,
    });
  };

  const handleRespond = () => {
    if (!responseText.trim()) return;
    respondMutation.mutate(
      { data: { message: responseText.trim() }, id: item.id },
      { onSuccess: () => setResponseText('') },
    );
  };

  return (
    <div className="app-feedback-detail">
      <DescriptionList isHorizontal>
        <DescriptionListGroup>
          <DescriptionListTerm>Submitted By</DescriptionListTerm>
          <DescriptionListDescription>{item.submittedBy}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Page</DescriptionListTerm>
          <DescriptionListDescription>{item.pageUrl}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Created</DescriptionListTerm>
          <DescriptionListDescription>
            {new Date(item.createdAt).toLocaleString()} (
            {timeAgo(new Date(item.createdAt).getTime())})
          </DescriptionListDescription>
        </DescriptionListGroup>
        {item.componentFilter && (
          <DescriptionListGroup>
            <DescriptionListTerm>Component Filter</DescriptionListTerm>
            <DescriptionListDescription>{item.componentFilter}</DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>

      <Content className="app-mt-md" component="h4">
        Description
      </Content>
      <Content className="app-feedback-description" component="p">
        {item.description}
      </Content>

      {item.screenshot && (
        <>
          <Content className="app-mt-md" component="h4">
            Screenshot
          </Content>
          <div className="app-feedback-screenshot-full">
            <img alt="Feedback screenshot" src={item.screenshot} />
          </div>
        </>
      )}

      {isAdmin && (
        <div className="app-feedback-admin-controls app-mt-lg">
          <Content component="h4">Admin Controls</Content>
          <div className="app-feedback-admin-row">
            <FormSelect
              aria-label="Status"
              className="app-feedback-admin-select"
              value={item.status}
              onChange={handleStatusChange}
            >
              {STATUS_OPTIONS.map(opt => (
                <FormSelectOption key={opt} label={opt} value={opt} />
              ))}
            </FormSelect>
            <FormSelect
              aria-label="Priority"
              className="app-feedback-admin-select"
              value={item.priority ?? ''}
              onChange={handlePriorityChange}
            >
              {PRIORITY_OPTIONS.map(opt => (
                <FormSelectOption key={opt} label={opt || 'No priority'} value={opt} />
              ))}
            </FormSelect>
          </div>
          <div className="app-feedback-tags app-mt-sm">
            <LabelGroup isEditable categoryName="Tags">
              {item.tags.map(tag => (
                <Label isEditable key={tag} onClose={() => handleRemoveTag(tag)}>
                  {tag}
                </Label>
              ))}
            </LabelGroup>
            <div className="app-feedback-add-tag">
              <TextInput
                aria-label="New tag"
                placeholder="Add tag..."
                value={newTag}
                onChange={(_e, val) => setNewTag(val)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              />
              <Button
                icon={<PlusCircleIcon />}
                isDisabled={!newTag.trim()}
                size="sm"
                variant="plain"
                onClick={handleAddTag}
              />
            </div>
          </div>
        </div>
      )}

      <div className="app-feedback-responses app-mt-lg">
        <Content component="h4">Responses ({item.responses.length})</Content>
        {item.responses.map(resp => (
          <div className="app-feedback-response" key={resp.id}>
            <Content component="p">
              <strong>{resp.authorName}</strong>{' '}
              <span className="app-text-muted">{timeAgo(new Date(resp.createdAt).getTime())}</span>
            </Content>
            <Content component="p">{resp.message}</Content>
          </div>
        ))}
        {isAdmin && (
          <div className="app-feedback-respond-form app-mt-md">
            <TextArea
              aria-label="Response"
              placeholder="Write a response..."
              rows={3}
              value={responseText}
              onChange={(_e, val) => setResponseText(val)}
            />
            <Button
              className="app-mt-sm"
              isDisabled={!responseText.trim() || respondMutation.isPending}
              isLoading={respondMutation.isPending}
              variant="primary"
              onClick={handleRespond}
            >
              Send Response
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
