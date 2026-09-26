'use client';

import Link from 'next/link';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Poster from './Poster';
import { formatRuntime, formatYear, formatRating } from '../../lib/format';

export default function MovieCard({ movie, onRemove }) {
  if (!movie) return null;

  const slug = movie.slug || movie.id;
  const title = movie.title || 'Untitled film';
  const rating = movie.avg_rating ?? movie.average_rating ?? null;
  const reviewCount = Number(movie.review_count || 0);
  const runtime = formatRuntime(movie.runtime_minutes);
  const ratingLabel = rating ? `${formatRating(rating)} / 5` : 'Not yet rated';

  const handleRemove = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof onRemove === 'function') {
      onRemove(movie);
    }
  };

  return (
    <Card as="article" interactive padding="none" className="movie-card">
      <Link className="movie-card__link" href={`/movies/${slug}`}>
        <Poster title={title} hue={movie.poster_hue} size="card" />
        <div className="movie-card__body">
          <h3 className="movie-card__title">{title}</h3>
          <div className="movie-card__badges cluster">
            {movie.genre ? <Badge tone="accent">{movie.genre}</Badge> : null}
            {movie.release_year ? <Badge tone="neutral">{formatYear(movie.release_year)}</Badge> : null}
            {movie.language ? <Badge tone="neutral">{movie.language}</Badge> : null}
          </div>
          <p className="movie-card__meta">
            {runtime ? `${runtime} · ` : ''}
            {ratingLabel}
            {reviewCount > 0 ? ` · ${reviewCount} review${reviewCount === 1 ? '' : 's'}` : ''}
          </p>
        </div>
      </Link>

      {typeof onRemove === 'function' ? (
        <div className="movie-card__actions">
          <Button variant="ghost" size="sm" onClick={handleRemove} aria-label={`Remove ${title} from your watchlist`}>
            Remove
          </Button>
        </div>
      ) : null}
    </Card>
  );
}