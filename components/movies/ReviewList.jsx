'use client';

import { useMemo, useState } from 'react';
import Card, { CardBody, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { Field, Textarea } from '../ui/Field';
import { formatDate, formatRating, pluralise } from '../../lib/format';

function StarIcon({ filled }) {
  return (
    <svg
      className={filled ? 'star star--on' : 'star'}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5 7.3 14.03 2.6 9.45l6.5-.95L12 2.6z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRow({ value, max = 5 }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className="star-row" aria-label={`${rounded} out of ${max} stars`}>
      {Array.from({ length: max }, (_, index) => (
        <StarIcon key={index} filled={index < rounded} />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange, disabled }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={`${score} ${pluralise(score, 'star', 'stars')}`}
          className={
            value >= score
              ? 'star-picker__btn star-picker__btn--on'
              : 'star-picker__btn'
          }
          disabled={disabled}
          onClick={() => onChange(score)}
        >
          <StarIcon filled={value >= score} />
        </button>
      ))}
    </div>
  );
}

function ReviewSkeletons({ count = 3 }) {
  return (
    <ul className="review-list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="review review--skeleton">
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--medium" />
        </li>
      ))}
    </ul>
  );
}

export default function ReviewList({
  movieId,
  reviews,
  loading = false,
  error = null,
  canReview = false,
  onSubmit,
}) {
  const items = Array.isArray(reviews) ? reviews : [];
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const average = useMemo(() => {
    if (!items.length) return 0;
    const total = items.reduce(
      (sum, review) => sum + (Number(review.rating) || 0),
      0
    );
    return total / items.length;
  }, [items]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaved(false);

    const trimmed = body.trim();
    if (trimmed.length < 10) {
      setFormError('Please write at least 10 characters about the film.');
      return;
    }
    if (trimmed.length > 1000) {
      setFormError('Reviews are limited to 1000 characters.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setFormError('Choose a rating between 1 and 5 stars.');
      return;
    }

    setFormError('');
    setSubmitting(true);
    try {
      if (typeof onSubmit === 'function') {
        await onSubmit({ movieId, rating, body: trimmed });
      }
      setBody('');
      setSaved(true);
    } catch (err) {
      setFormError(
        (err && err.message) ||
          'We could not save your review just now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="reviews" aria-labelledby="reviews-heading">
      <div className="reviews__header">
        <h2 id="reviews-heading">Viewer reviews</h2>
        <div className="reviews__summary">
          <StarRow value={average} />
          <span className="reviews__average">
            {items.length ? formatRating(average) : '—'}
          </span>
          <span className="reviews__count text-muted">
            {items.length
              ? `${items.length} ${pluralise(items.length, 'review', 'reviews')}`
              : 'No reviews yet'}
          </span>
        </div>
      </div>

      {canReview ? (
        <Card className="review-form-card">
          <CardHeader>
            <h3>Share your verdict</h3>
          </CardHeader>
          <CardBody>
            <form className="review-form stack" onSubmit={handleSubmit} noValidate>
              {formError ? (
                <p className="form-banner form-banner--error" role="alert">
                  {formError}
                </p>
              ) : null}
              {saved && !formError ? (
                <p className="form-banner form-banner--success" role="status">
                  Thanks — your review has been posted.
                </p>
              ) : null}

              <Field label="Your rating" htmlFor="review-rating" required>
                <div id="review-rating">
                  <StarPicker
                    value={rating}
                    onChange={setRating}
                    disabled={submitting}
                  />
                </div>
              </Field>

              <Field
                label="Your review"
                htmlFor="review-body"
                hint="Tell other viewers what worked — performances, story, sound, the lot."
                required
              >
                <Textarea
                  id="review-body"
                  name="body"
                  rows={4}
                  value={body}
                  maxLength={1000}
                  placeholder="The pacing in the second act carried the whole film…"
                  onChange={(event) => setBody(event.target.value)}
                  disabled={submitting}
                />
              </Field>

              <div className="cluster">
                <Button type="submit" variant="primary" size="md" loading={submitting}>
                  Post review
                </Button>
                <span className="text-muted">{body.trim().length}/1000</span>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        <Card className="review-form-card">
          <CardBody>
            <p>
              Sign in to your free viewer account to rate this film and join the
              conversation.
            </p>
            <Button as="a" href="/login" variant="secondary" size="md">
              Sign in to review
            </Button>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <ReviewSkeletons count={3} />
      ) : error ? (
        <EmptyState
          variant="error"
          title="Reviews could not load"
          message="The review service is not responding right now. Please try again shortly."
        />
      ) : items.length === 0 ? (
        <EmptyState
          variant="empty"
          title="Be the first to review"
          message="No one has reviewed this title yet — your take could help the next viewer decide."
        />
      ) : (
        <ul className="review-list">
          {items.map((review, index) => (
            <li
              key={review.id != null ? review.id : `${review.name || 'viewer'}-${index}`}
              className="review"
            >
              <div className="review__meta">
                <span className="user-name">{review.name || 'Nollywood viewer'}</span>
                <StarRow value={review.rating} />
                <span className="review__date text-muted">
                  {formatDate(review.created_at)}
                </span>
              </div>
              <p className="review__body">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}