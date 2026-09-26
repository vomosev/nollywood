'use client';

import { useCallback, useEffect, useState } from 'react';
import PageShell from '../components/layout/PageShell';
import MovieGrid from '../components/movies/MovieGrid';
import Button from '../components/ui/Button';
import { getMovies } from '../lib/api';

export default function HomePage() {
  const [featured, setFeatured] = useState({ items: [], loading: true, error: null });
  const [recent, setRecent] = useState({ items: [], loading: true, error: null });

  const loadFeatured = useCallback(async () => {
    setFeatured({ items: [], loading: true, error: null });
    try {
      const data = await getMovies({ featured: true, limit: 4 });
      const items = Array.isArray(data?.items) ? data.items : [];
      setFeatured({ items, loading: false, error: null });
    } catch (err) {
      setFeatured({
        items: [],
        loading: false,
        error: err?.message || 'We could not reach the Nollywood catalogue.',
      });
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setRecent({ items: [], loading: true, error: null });
    try {
      const data = await getMovies({ limit: 8, sort: 'newest' });
      const items = Array.isArray(data?.items) ? data.items : [];
      setRecent({ items, loading: false, error: null });
    } catch (err) {
      setRecent({
        items: [],
        loading: false,
        error: err?.message || 'We could not reach the Nollywood catalogue.',
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await Promise.all([loadFeatured(), loadRecent()]);
    })();
    return () => {
      active = false;
    };
  }, [loadFeatured, loadRecent]);

  return (
    <PageShell
      title="Stream the best of Nigerian cinema"
      intro="Nollywood brings you licensed features from Lagos, Enugu and Abuja — epics, comedies, thrillers and family drama, in English, Yoruba, Igbo and Pidgin."
      actions={
        <Button as="a" href="/movies" variant="primary" size="md">
          Browse the catalogue
        </Button>
      }
    >
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__content stack">
          <p className="hero__eyebrow">New every Friday</p>
          <h2 id="hero-heading" className="hero__title">
            Cinema from Surulere to your screen
          </h2>
          <p className="hero__copy">
            Build a watchlist, pick up where you left off, and tell other viewers what you thought.
            A viewer account is free and takes less than a minute.
          </p>
          <div className="cluster">
            <Button as="a" href="/movies" variant="primary" size="lg">
              Browse the catalogue
            </Button>
            <Button as="a" href="/signup" variant="ghost" size="lg">
              Create a free account
            </Button>
          </div>
        </div>
      </section>

      <section className="page__section" aria-labelledby="featured-heading">
        <h2 id="featured-heading">Featured this week</h2>
        <p>Hand-picked releases our programmers are recommending right now.</p>
        <MovieGrid
          movies={featured.items}
          loading={featured.loading}
          error={featured.error}
          onRetry={loadFeatured}
          skeletonCount={4}
          emptyTitle="No featured titles yet"
          emptyMessage="Our programmers are still finalising this week's selection. Check the full catalogue in the meantime."
        />
      </section>

      <section className="page__section" aria-labelledby="recent-heading">
        <h2 id="recent-heading">Recently added</h2>
        <p>The newest additions to the Nollywood library, freshest first.</p>
        <MovieGrid
          movies={recent.items}
          loading={recent.loading}
          error={recent.error}
          onRetry={loadRecent}
          skeletonCount={8}
          emptyTitle="Nothing new right now"
          emptyMessage="No new films have landed since your last visit. Browse the full catalogue for something to watch tonight."
        />
      </section>
    </PageShell>
  );
}