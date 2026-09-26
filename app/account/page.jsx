'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '../../components/layout/PageShell';
import Card, { CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../components/providers/AuthProvider';
import { getWatchHistory } from '../../lib/api';
import { formatDate, formatRuntime } from '../../lib/format';

function progressLabel(seconds, runtimeMinutes) {
  const secs = Number(seconds) || 0;
  if (secs <= 0) return 'Not started';
  const total = Number(runtimeMinutes) > 0 ? Number(runtimeMinutes) * 60 : 0;
  const watched = formatRuntime(Math.max(1, Math.round(secs / 60)));
  if (!total) return `${watched} watched`;
  const percent = Math.min(100, Math.round((secs / total) * 100));
  return `${watched} · ${percent}%`;
}

export default function AccountPage() {
  const { user, status, logout } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWatchHistory();
      const items = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
      setHistory(items);
    } catch (err) {
      setError(err && err.message ? err.message : 'We could not load your viewing history.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (status === 'authenticated') {
      loadHistory();
    } else if (status === 'anonymous') {
      if (active) {
        setLoading(false);
        setHistory([]);
        setError(null);
      }
    }
    return () => {
      active = false;
    };
  }, [status, loadHistory]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      router.replace('/');
    } catch (err) {
      setError(err && err.message ? err.message : 'Sign out failed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Film',
      render: (row) => (
        <a className="table__link" href={`/movies/${row.slug || row.movie_id}`}>
          {row.title || 'Untitled film'}
        </a>
      ),
    },
    {
      key: 'genre',
      label: 'Genre',
      render: (row) => (row.genre ? <Badge tone="accent">{row.genre}</Badge> : <span className="text-muted">—</span>),
    },
    {
      key: 'progress',
      label: 'Progress',
      align: 'right',
      render: (row) => progressLabel(row.progress_seconds, row.runtime_minutes),
    },
    {
      key: 'watched_at',
      label: 'Last watched',
      align: 'right',
      render: (row) => (row.watched_at ? formatDate(row.watched_at) : '—'),
    },
  ];

  if (status === 'loading') {
    return (
      <PageShell title="Your account" intro="Loading your profile and viewing history…">
        <div className="stack">
          <div className="skeleton skeleton--panel" aria-hidden="true" />
          <div className="skeleton skeleton--panel" aria-hidden="true" />
        </div>
      </PageShell>
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <PageShell
        title="Your account"
        intro="Sign in to see your profile details and everything you have been watching on Nollywood."
      >
        <EmptyState
          variant="auth"
          title="You are not signed in"
          message="Your profile, watchlist and viewing history live behind a free viewer account."
          action={
            <Button as="a" href="/login?redirect=/account" variant="primary" size="md">
              Sign in
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Your account"
      intro="Manage your Nollywood viewer profile and review the titles you have been streaming."
      actions={
        <Button variant="danger" size="md" onClick={handleSignOut} loading={signingOut} disabled={signingOut}>
          Sign out
        </Button>
      }
    >
      <div className="stack">
        <Card padding="md">
          <CardHeader>
            <h2>Profile</h2>
          </CardHeader>
          <CardBody>
            <dl className="detail-list">
              <div className="detail-list__row">
                <dt>Name</dt>
                <dd className="user-name">{user.name || 'Nollywood viewer'}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Email</dt>
                <dd className="user-name">{user.email}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Account type</dt>
                <dd>
                  <Badge tone={user.role === 'admin' ? 'warning' : 'neutral'}>
                    {user.role === 'admin' ? 'Administrator' : 'Viewer'}
                  </Badge>
                </dd>
              </div>
              <div className="detail-list__row">
                <dt>Member since</dt>
                <dd>{user.created_at ? formatDate(user.created_at) : 'Recently joined'}</dd>
              </div>
            </dl>
          </CardBody>
          <CardFooter>
            <div className="cluster">
              <Button as="a" href="/watchlist" variant="secondary" size="sm">
                View watchlist
              </Button>
              <Button as="a" href="/movies" variant="ghost" size="sm">
                Browse the catalogue
              </Button>
            </div>
          </CardFooter>
        </Card>

        <section className="panel">
          <h2>Recent viewing history</h2>
          <p>The last 25 titles you started or finished, newest first.</p>

          {loading ? (
            <div className="stack" aria-busy="true">
              <div className="skeleton skeleton--row" aria-hidden="true" />
              <div className="skeleton skeleton--row" aria-hidden="true" />
              <div className="skeleton skeleton--row" aria-hidden="true" />
              <div className="skeleton skeleton--row" aria-hidden="true" />
            </div>
          ) : error ? (
            <EmptyState
              variant="error"
              title="We could not load your history"
              message={error}
              action={
                <Button variant="primary" size="md" onClick={loadHistory}>
                  Try again
                </Button>
              }
            />
          ) : history.length === 0 ? (
            <EmptyState
              variant="empty"
              title="Nothing watched yet"
              message="Press play on any title and it will show up here so you can pick up where you left off."
              action={
                <Button as="a" href="/movies" variant="primary" size="md">
                  Find something to watch
                </Button>
              }
            />
          ) : (
            <Table
              columns={columns}
              rows={history}
              getRowKey={(row, index) => row.id || `${row.movie_id}-${index}`}
              emptyMessage="Nothing watched yet."
            />
          )}
        </section>
      </div>
    </PageShell>
  );
}