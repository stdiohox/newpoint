import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { CRM_CARD, CrmHeader } from '@/components/crm/CrmChrome';
import { ReviewDecisionForm } from '@/components/crm/forms';
import {
  canReopenReview,
  formatWhen,
  isPendingReview,
  REVIEW_STATUS_LABEL,
  reviewReasonLabel,
  type ReviewRow,
} from '@/lib/crm/model';
import { requireStaff } from '@/lib/crm/supabase';

export const metadata: Metadata = { title: 'Google reviews' };

const DONE: Record<string, string> = {
  approve: 'Reply approved. It will be posted to Google within 15 minutes; you can still cancel it below until then.',
  skip: 'Done. No reply will be posted for that review.',
};

function Stars({ rating }: { rating: number }) {
  const n = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span role="img" aria-label={`${n} of 5 stars`} className="text-np-ink tracking-[0.15em]">
      {'★'.repeat(n)}
      <span className="text-np-neutral-500">{'☆'.repeat(5 - n)}</span>
    </span>
  );
}

function ReviewHeader({ review, id }: { review: ReviewRow; id: string }) {
  return (
    <p id={id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <Stars rating={review.rating} />
      <span className="text-np-ink font-medium">{review.reviewer ?? 'A Google user'}</span>
      <span className="text-np-neutral-600">
        <time dateTime={review.created_at}>{formatWhen(review.created_at)}</time> ET
      </span>
    </p>
  );
}

function ReviewBody({ body }: { body: string | null }) {
  return body ? (
    <blockquote className="text-np-ink mt-3 whitespace-pre-wrap break-words">{body}</blockquote>
  ) : (
    <p className="text-np-neutral-600 mt-3 text-sm">Rating only, no text.</p>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const headerId = `review-${review.id}`;
  const pending = isPendingReview(review.reply_status);
  const approved = review.reply_status === 'approved';
  const reopen = canReopenReview(review);
  const reason = reviewReasonLabel(review.status_reason);
  const reply = review.approved_reply ?? review.reply_draft;
  return (
    <li className={`${CRM_CARD} p-6`}>
      <ReviewHeader review={review} id={headerId} />
      <ReviewBody body={review.body} />
      {!pending && (
        <dl className="text-np-neutral-700 mt-4 grid gap-2 text-sm">
          <div>
            <dt className="sr-only">Status</dt>
            <dd className="text-np-ink font-medium">
              {REVIEW_STATUS_LABEL[review.reply_status]}
              {review.decided_by_name && review.decided_at ? (
                <span className="text-np-neutral-600 font-normal">
                  {' · '}
                  {review.decided_by_name}, <time dateTime={review.decided_at}>{formatWhen(review.decided_at)}</time>
                </span>
              ) : null}
            </dd>
          </div>
          {reason && (
            <div>
              <dt className="sr-only">Why</dt>
              <dd>{reason}</dd>
            </div>
          )}
          {reply && (approved || review.reply_status === 'posted') && (
            <div>
              <dt className="text-np-neutral-600">Reply</dt>
              <dd className="text-np-ink mt-1 whitespace-pre-wrap break-words">{reply}</dd>
            </div>
          )}
        </dl>
      )}
      {(pending || reopen || approved) && (
        <div className="border-np-neutral-200 mt-6 border-t pt-6">
          {reopen && <h3 className="text-np-ink mb-4 text-sm font-semibold">Write a reply instead</h3>}
          <ReviewDecisionForm
            id={review.id}
            draft={review.reply_draft ?? ''}
            mode={approved ? 'cancel' : 'decide'}
            describedBy={headerId}
          />
        </div>
      )}
    </li>
  );
}

export default async function CrmReviews({ searchParams }: { searchParams: Promise<{ done?: string | string[] }> }) {
  const { supabase, staff } = await requireStaff();
  const { done } = await searchParams;
  const notice = typeof done === 'string' ? DONE[done] : undefined;
  const { data, error } = await supabase.rpc('review_queue');
  if (error) throw new Error('CRM read failed');
  const reviews = (Array.isArray(data) ? data : []) as ReviewRow[];
  const pending = reviews.filter((r) => isPendingReview(r.reply_status));
  const approved = reviews.filter((r) => r.reply_status === 'approved');
  const decided = reviews.filter((r) => !isPendingReview(r.reply_status) && r.reply_status !== 'approved');

  return (
    <>
      <CrmHeader staffName={staff.display_name} />
      <div id="main" tabIndex={-1} className="outline-hidden">
        <Container className="py-10 md:py-14">
          <h1 className="text-np-ink text-3xl font-semibold tracking-tight">Google reviews</h1>
          <p className="text-np-neutral-600 mt-2 max-w-2xl text-sm">
            Each new Google review is listed here with a drafted reply. Someone on the team decides: approve it (edited
            or not) or skip it. Skipping is always fine, and nothing is posted without a decision. Replies that already
            exist on Google are left alone.
          </p>
          <p role="status" tabIndex={-1} autoFocus={Boolean(notice)} className={`${CRM_CARD} mt-6 px-4 py-3 text-sm empty:hidden`}>
            {notice ?? ''}
          </p>

          <section aria-labelledby="pending-heading" className="mt-10">
            <h2 id="pending-heading" className="text-np-ink text-base font-semibold">
              Waiting for a decision{pending.length > 0 ? ` (${pending.length})` : ''}
            </h2>
            {pending.length === 0 ? (
              <p className={`${CRM_CARD} text-np-neutral-600 mt-4 p-6 text-sm`}>Nothing is waiting.</p>
            ) : (
              <ul className="mt-4 space-y-6">
                {pending.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </ul>
            )}
          </section>

          {approved.length > 0 && (
            <section aria-labelledby="approved-heading" className="mt-12">
              <h2 id="approved-heading" className="text-np-ink text-base font-semibold">
                Approved, posting soon
              </h2>
              <ul className="mt-4 space-y-4">
                {approved.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="decided-heading" className="mt-12">
            <h2 id="decided-heading" className="text-np-ink text-base font-semibold">
              Decided
            </h2>
            {decided.length === 0 ? (
              <p className="text-np-neutral-600 mt-4 text-sm">No decisions yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {decided.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </ul>
            )}
          </section>
        </Container>
      </div>
    </>
  );
}
