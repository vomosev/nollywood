'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import PageShell from '../../../components/layout/PageShell';
import Poster from '../../../components/movies/Poster';
import VideoPlayer from '../../../components/movies/VideoPlayer';
import ReviewList from '../../../components/movies/ReviewList';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { useAuth } from '../../../components/providers/AuthProvider';
import {
  getMovie,
  getReviews,
  createReview,
  addToWatchlist,
  removeFromWatchlist,
  saveWatchProgress,
} from '../../../lib/api';
import { formatRuntime, formatYear } from '../../../lib/format';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, status } = useAuth();

  const rawId = params?.id;
  const movieId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);
  const [watchlistNotice, setWatchlistNotice] = useState('');

  const [playing, setPlaying] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const loadMovie = useCallback(async () => {
    if (!movieId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getMovie(movieId);
      const item = data && data.movie ? data.movie : data;
      if (!item || !item.id) {
        setNotFound(true);
        setMovie(null);
      } else {
        setMovie(item);
        setInWatchlist(Boolean(item.in_watchlist));
      }
    } catch (err) {
      if (err && err.status === 404) {
        setNotFound(true);
        setMovie(null);
      } else {
        setError(
          (err && err.message) ||
            'We could not load this film right now. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  const loadReviews = useCallback(async () => {
    if (!movieId) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await getReviews(movieId);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data && data.reviews)
        ? data.reviews
        : Array.isArray(data && data.items)
        ? data.items
        : [];
      setReviews(list);
    } catch (err) {
      setReviewsError(
        (err && err.message) || 'Reviews could not be loaded at the moment.'
      );
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    loadMovie();
  }, [loadMovie]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (movie) setInWatchlist(Boolean(movie.in_watchlist));
  }, [movie]);

  const handleWatchlistToggle = async () => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    if (!movie) return;
    setWatchlistBusy(true);
    setWatchlistNotice('');
    try {
      if (inWatchlist) {
        await removeFromWatchlist(movie.id);
        setInWatchlist(false);
        setWatchlistNotice(`Removed “${movie.title}” from your watchlist.`);
      } else {
        await addToWatchlist(movie.id);
        setInWatchlist(true);
        setWatchlistNotice(`Saved “${movie.title}” to your watchlist.`);
      }
    } catch (err) {
      setWatchlistNotice(
        (err && err.message) || 'We could not update your watchlist.'
      );
    } finally {
      setWatchlistBusy(false);
    }
  };

  const handleWatchNow = () => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    setPlaying(true);
  };

  const handleProgress = useCallback(
    (seconds) => {
      if (!user || !movie) return;
      saveWatchProgress(movie.id, Math.floor(seconds)).catch(() => {
        /* progress saving is best-effort */
      });
    },
    [user, movie]
  );

  const handleReviewSubmit = async ({ rating, body }) => {
    if (!movie) return;
    await createReview(movie.id, { rating, body });
    await loadReviews();
  };

  const goToSignIn = () => {
    const target = movieId ? `/movies/${movieId}` : '/movies';
    setSignInOpen(false);
    router.push(`/login?redirect=${encodeURIComponent(target)}`);
  };

  if (loading) {
    return (
      <PageShell title="Loading film…" intro="Fetching the details for this title.">
        <div className="detail-layout">
          <div className="detail-layout__media">
            <div className="skeleton skeleton--poster" aria-hidden="true" />
          </div>
          <div className="detail-layout__body stack">
            <div className="skeleton skeleton--title" aria-hidden="true" />
            <div className="skeleton skeleton--line" aria-hidden="true" />
            <div className="skeleton skeleton--line" aria-hidden="true" />
            <div className="skeleton skeleton--line" aria-hidden="true" />
            <span className="sr-only" role="status">
              Loading film details
            </span>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Something went wrong">
        <EmptyState
          variant="error"
          title="We could not load this film"
          message={error}
          action={
            <Button variant="primary" size="md" onClick={loadMovie}>
              Try again
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (notFound || !movie) {
    return (
      <PageShell title="Title unavailable">
        <EmptyState
          variant="empty"
          title="We couldn't find that reel"
          message="This film may have been removed from the catalogue or the link is out of date."
          action={
            <Button as="a" href="/movies" variant="primary" size="md">
              Browse the catalogue
            </Button>
          }
        />
      </PageShell>
    );
  }

  const castList = (movie.cast_list || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return (
    <PageShell
      title={movie.title}
      intro={movie.synopsis}
      actions={
        <div className="cluster">
          <Button variant="primary" size="md" onClick={handleWatchNow}>
            Watch now
          </Button>
          <Button
            variant={inWatchlist ? 'secondary' : 'ghost'}
            size="md"
            onClick={handleWatchlistToggle}
            loading={watchlistBusy}
            disabled={watchlistBusy || status === 'loading'}
          >
            {inWatchlist ? 'In your watchlist' : 'Add to watchlist'}
          </Button>
        </div>
      }
    >
      <div className="detail-layout">
        <div className="detail-layout__media stack">
          <Poster title={movie.title} hue={movie.poster_hue} size="detail" />
          {watchlistNotice ? (
            <p className="form-hint" role="status">
              {watchlistNotice}
            </p>
          ) : null}
        </div>

        <div className="detail-layout__body stack">
          <div className="cluster">
            {movie.genre ? <Badge tone="accent">{movie.genre}</Badge> : null}
            {movie.release_year ? (
              <Badge tone="neutral">{formatYear(movie.release_year)}</Badge>
            ) : null}
            {movie.rating_certificate ? (
              <Badge tone="warning">{movie.rating_certificate}</Badge>
            ) : null}
            {movie.runtime_minutes ? (
              <Badge tone="neutral">{formatRuntime(movie.runtime_minutes)}</Badge>
            ) : null}
            {movie.language ? <Badge tone="success">{movie.language}</Badge> : null}
          </div>

          {playing ? (
            <VideoPlayer movie={movie} onProgress={handleProgress} />
          ) : null}

          <h2>Synopsis</h2>
          <p>{movie.synopsis || 'A synopsis for this title is coming soon.'}</p>

          <h2>Cast &amp; crew</h2>
          <dl className="detail-meta">
            <div className="detail-meta__row">
              <dt>Director</dt>
              <dd className="user-name">{movie.director || 'Not credited'}</dd>
            </div>
            <div className="detail-meta__row">
              <dt>Starring</dt>
              <dd className="user-name">
                {castList.length ? castList.join(', ') : 'Cast details to follow'}
              </dd>
            </div>
            <div className="detail-meta__row">
              <dt>Language</dt>
              <dd>{movie.language || 'English'}</dd>
            </div>
          </dl>

          {!user && status !== 'loading' ? (
            <p className="form-hint">
              <Link href={`/login?redirect=/movies/${movieId}`}>Sign in</Link> to
              stream this title, save it to your watchlist and post a review.
            </p>
          ) : null}
        </div>
      </div>

      <section className="page-section">
        <h2>Audience reviews</h2>
        <ReviewList
          movieId={movie.id}
          reviews={reviews}
          loading={reviewsLoading}
          error={reviewsError}
          canReview={Boolean(user)}
          onSubmit={handleReviewSubmit}
        />
      </section>

      <Modal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        title="Sign in to keep watching"
        footer={
          <div className="cluster">
            <Button variant="ghost" size="md" onClick={() => setSignInOpen(false)}>
              Not now
            </Button>
            <Button variant="primary" size="md" onClick={goToSignIn}>
              Sign in
            </Button>
          </div>
        }
      >
        <p>
          A free viewer account lets you stream {movie.title}, build a watchlist and
          pick up exactly where you left off on any device.
        </p>
      </Modal>
    </PageShell>
  );
}