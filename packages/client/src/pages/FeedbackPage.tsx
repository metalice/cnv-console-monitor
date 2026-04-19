import { useState } from 'react';

import {
  Bullseye,
  Content,
  EmptyState,
  EmptyStateBody,
  Gallery,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  PageSection,
  Pagination,
  Spinner,
} from '@patternfly/react-core';
import { OutlinedCommentsIcon } from '@patternfly/react-icons';

import { FeedbackCard } from '../components/feedback/FeedbackCard';
import { FeedbackDetail } from '../components/feedback/FeedbackDetail';
import { FeedbackFilters } from '../components/feedback/FeedbackFilters';
import { useFeedbackDetail, useFeedbackList } from '../hooks/useFeedback';

const PAGE_SIZE = 12;

export const FeedbackPage = () => {
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | undefined>();

  const { data, isError, isPending } = useFeedbackList({
    category: category || undefined,
    limit: PAGE_SIZE,
    page,
    priority: priority || undefined,
    sort,
    status: status || undefined,
  });

  const {
    data: detailItem,
    isError: isDetailError,
    isPending: isDetailLoading,
  } = useFeedbackDetail(selectedId);

  const handleFilterChange = (setter: (val: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content component="h1">Feedback Board</Content>
        <Content component="p">
          Submit bug reports, feature requests, and suggestions. Upvote items you agree with.
        </Content>
      </PageSection>
      <PageSection hasBodyWrapper={false}>
        <FeedbackFilters
          category={category}
          priority={priority}
          sort={sort}
          status={status}
          onCategoryChange={handleFilterChange(setCategory)}
          onPriorityChange={handleFilterChange(setPriority)}
          onSortChange={handleFilterChange(setSort)}
          onStatusChange={handleFilterChange(setStatus)}
        />

        {isPending && (
          <Bullseye className="app-mt-lg">
            <Spinner aria-label="Loading feedback" />
          </Bullseye>
        )}

        {isError && (
          <EmptyState
            headingLevel="h2"
            icon={OutlinedCommentsIcon}
            titleText="Error loading feedback"
          >
            <EmptyStateBody>Failed to load feedback. Please try again.</EmptyStateBody>
          </EmptyState>
        )}

        {data?.items.length === 0 && (
          <EmptyState headingLevel="h2" icon={OutlinedCommentsIcon} titleText="No feedback yet">
            <EmptyStateBody>
              Be the first to share your thoughts! Use the feedback button in the header.
            </EmptyStateBody>
          </EmptyState>
        )}

        {data && data.items.length > 0 && (
          <>
            <Gallery hasGutter className="app-feedback-gallery">
              {data.items.map(item => (
                <FeedbackCard item={item} key={item.id} onSelect={setSelectedId} />
              ))}
            </Gallery>
            <Pagination
              isCompact
              className="app-mt-md"
              itemCount={data.total}
              page={page}
              perPage={PAGE_SIZE}
              onSetPage={(_e, newPage) => setPage(newPage)}
            />
          </>
        )}
      </PageSection>

      {selectedId !== undefined && (
        <Modal isOpen variant={ModalVariant.large} onClose={() => setSelectedId(undefined)}>
          <ModalHeader title={`Feedback #${selectedId}`} />
          <ModalBody>
            {isDetailLoading && (
              <Bullseye>
                <Spinner aria-label="Loading feedback detail" />
              </Bullseye>
            )}
            {isDetailError && (
              <EmptyState
                headingLevel="h3"
                icon={OutlinedCommentsIcon}
                titleText="Error loading feedback"
              >
                <EmptyStateBody>Could not load this feedback item.</EmptyStateBody>
              </EmptyState>
            )}
            {detailItem && <FeedbackDetail item={detailItem} />}
          </ModalBody>
        </Modal>
      )}
    </>
  );
};
