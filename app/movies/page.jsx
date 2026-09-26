'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PageShell from '../../components/layout/PageShell';
import FilterBar from '../../components/movies/FilterBar';
import MovieGrid from '../../components/movies/MovieGrid';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { getMovies, getFilterOptions } from '../../lib/api';
import { pluralise } from '../../lib/format';

const PAGE_SIZE = 12;

const DEFAULT_FILTERS = {
  q: '',
  genre: '',
  year: '',
  language: '',
  sort: 'newest'
};

export default function CataloguePage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({ genres: [], years: [], languages: [] });
  const [reloadKey, setReloadKey] = useState(0);

  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    getFilterOptions()
      .then((data) => {
        if (cancelled || !data) return;
        setOptions({
          genres: Array.isArray(data.genres) ? data.genres : [],
          years: Array.isArray(data.years) ? data.years : [],
          languages: Array.isArray(data.languages) ? data.languages : []
        });
      })
      .catch(() => {
        if (!cancelled) {
          setOptions({ genres: [], years: [], languages: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      getMovies({
        q: filters.q || undefined,
        genre: filters.genre || undefined,
        year: filters.year || undefined,
        language: filters.language || undefined,
        sort: filters.sort || 'newest',
        limit: PAGE_SIZE,
        offset: 0
      })
        .then((data) => {
          if (cancelled || requestIdRef.current !== requestId) return;
          const items = Array.isArray(data && data.items) ? data.items : [];
          setMovies(items);
          setTotal(Number(data && data.total) || items.length);
          setOffset(items.length);
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled || requestIdRef.current !== requestId) return;
          setMovies([]);
          setTotal(0);
          setOffset(0);
          setError(
            (err && err.message) ||
              'We could not reach the catalogue service. Please try again.'
          );
          setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters.q, filters.genre, filters.year, filters.language, filters.sort, reloadKey]);

  const handleChange = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleRetry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);

    getMovies({
      q: filters.q || undefined,
      genre: filters.genre || undefined,
      year: filters.year || undefined,
      language: filters.language || undefined,
      sort: filters.sort || 'newest',
      limit: PAGE_SIZE,
      offset
    })
      .then((data) => {
        const items = Array.isArray(data && data.items) ? data.items : [];
        setMovies((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = prev.slice();
          items.forEach((item) => {
            if (!seen.has(item.id)) merged.push(item);
          });
          return merged;
        });
        setOffset((prev) => prev + items.length);
        if (typeof data?.total === 'number') setTotal(data.total);
        setLoadingMore(false);
      })
      .catch((err) => {
        setError(
          (err && err.message) || 'We could not load more titles right now.'
        );
        setLoadingMore(false);
      });
  }, [filters, offset, loadingMore]);

  const hasMore = !loading && !error && movies.length > 0 && movies.length < total;

  return (
    <PageShell
      title="Catalogue"
      intro="Every film in the Nollywood library — from Lagos courtroom thrillers to Yoruba epics shot in Osun State. Filter by genre, release year or language to find your next watch."
    >
      <div className="stack">
        <FilterBar
          value={filters}
          onChange={handleChange}
          genres={options.genres}
          years={options.years}
          languages={options.languages}
          onReset={handleReset}
        />

        <p className="results-count" aria-live="polite">
          {loading
            ? 'Searching the catalogue…'
            : error
            ? 'Results unavailable'
            : total === 0
            ? 'No films match those filters'
            : `Showing ${movies.length} of ${total} ${pluralise(total, 'film', 'films')}`}
        </p>

        <MovieGrid
          movies={movies}
          loading={loading}
          error={error}
          onRetry={handleRetry}
          skeletonCount={PAGE_SIZE}
          emptyTitle="No films match those filters"
          emptyMessage="Try widening your search — clear a filter or two and the catalogue will open right back up."
        />

        {hasMore ? (
          <div className="cluster cluster--center">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleLoadMore}
              loading={loadingMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading more titles' : 'Load more'}
            </Button>
          </div>
        ) : null}

        {loadingMore ? (
          <div className="cluster cluster--center">
            <Spinner size="sm" label="Loading more films" />
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}