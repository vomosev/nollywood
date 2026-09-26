'use client';

import { useCallback, useEffect, useState } from 'react';
import PageShell from '../../components/layout/PageShell';
import MovieGrid from '../../components/movies/MovieGrid';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { useAuth } from '../../components/providers/AuthProvider';
import { getWatchlist, removeFromWatchlist } from '../../lib/api';
import { pluralise } from '../../lib/format';

export default function WatchlistPage() {
  const { user, status } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWatchlist();
      const items = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
      setMovies(items);
    } catch (err) {
      setError((err && err.message) || 'We could not load your watchlist right now.');
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated' || !user) {
      setMovies([]);
      setLoading(false);
      setError('');
      return;
    }
    load();
  }, [status, user, load]);

  const handleRemove = useCallback(
    async (movie) => {
      if (!movie || removingId) return;
      const id = movie.id;
      setRemovingId(id);
      const previous = movies;
      setMovies((current) => current.filter((item) => item.id !== id));
      try {
        await removeFromWatchlist(id);
      } catch (err) {
        setMovies(previous);
        setError((err && err.message) || 'That title could not be removed. Please try again.');
      } finally {
        setRemovingId(null);
      }
    },
    [movies, removingId]
  );

  if (status === 'loading') {
    return (
      <PageShell title="Your watchlist" intro="Checking your session…">
        <MovieGrid movies={[]} loading skeletonCount={4} />
      </PageShell>
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <PageShell
        title="Your watchlist"
        intro="Keep track of the Nollywood titles you want to watch next. Sign in to build and revisit your list on any device."
      >
        <EmptyState
          variant="auth"
          title="Sign in to see your watchlist"
          message="A free viewer account saves the films you bookmark, your reviews and where you stopped watching."
          action={
            <Button as="a" href="/login?redirect=/watchlist" variant="primary" size="md">
              Sign in
            </Button>
          }
        />
      </PageShell>
    );
  }

  const count = movies.length;

  return (
    <PageShell
      title="Your watchlist"
      intro={
        loading
          ? 'Loading the titles you saved for later.'
          : error
          ? 'Something interrupted the request to our catalogue service.'
          : count > 0
          ? `You have ${count} ${pluralise(count, 'film', 'films')} saved for later.`
          : 'Bookmark any title from the catalogue and it will appear here.'
      }
      actions={
        <Button as="a" href="/movies" variant="secondary" size="sm">
          Browse the catalogue
        </Button>
      }
    >
      <MovieGrid
        movies={movies}
        loading={loading}
        error={error}
        onRetry={load}
        onRemove={handleRemove}
        skeletonCount={4}
        emptyTitle="Your watchlist is empty"
        emptyMessage="Nothing saved yet. Explore the catalogue and tap “Add to watchlist” on any film you want to come back to."
      />
    </PageShell>
  );
}