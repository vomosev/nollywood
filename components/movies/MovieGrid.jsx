'use client';

import MovieCard from './MovieCard';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';

function SkeletonTile({ index }) {
  return (
    <li className="movie-grid__item" aria-hidden="true">
      <div className="movie-skeleton" data-index={index}>
        <div className="movie-skeleton__poster skeleton" />
        <div className="movie-skeleton__lines">
          <span className="skeleton skeleton--line skeleton--line-lg" />
          <span className="skeleton skeleton--line skeleton--line-sm" />
        </div>
      </div>
    </li>
  );
}

export default function MovieGrid({
  movies,
  loading = false,
  error = null,
  onRetry,
  onRemove,
  skeletonCount = 8,
  emptyTitle = 'No films to show yet',
  emptyMessage = 'Our curators are still licensing titles for this shelf. Check back shortly.',
}) {
  if (loading) {
    const count = Number.isFinite(skeletonCount) && skeletonCount > 0 ? skeletonCount : 8;
    return (
      <ul className="movie-grid" role="list" aria-busy="true" aria-live="polite">
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonTile key={`skeleton-${index}`} index={index} />
        ))}
      </ul>
    );
  }

  if (error) {
    const message =
      typeof error === 'string'
        ? error
        : (error && error.message) || 'We could not reach the catalogue service.';

    return (
      <EmptyState
        variant="error"
        title="The catalogue is offline"
        message={message}
        action={
          onRetry ? (
            <Button variant="primary" size="md" onClick={onRetry}>
              Try again
            </Button>
          ) : null
        }
      />
    );
  }

  const items = Array.isArray(movies) ? movies : [];

  if (items.length === 0) {
    return <EmptyState variant="empty" title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <ul className="movie-grid" role="list">
      {items.map((movie, index) => {
        const key =
          movie?.id ?? movie?.slug ?? movie?.movie_id ?? `movie-${index}`;
        return (
          <li className="movie-grid__item" key={key}>
            <MovieCard movie={movie} onRemove={onRemove} />
          </li>
        );
      })}
    </ul>
  );
}