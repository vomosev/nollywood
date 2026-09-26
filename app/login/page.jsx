'use client';

import { Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell from '../../components/layout/PageShell';
import AuthForm from '../../components/auth/AuthForm';
import Spinner from '../../components/ui/Spinner';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawRedirect = searchParams ? searchParams.get('redirect') : null;
  const redirectTo =
    typeof rawRedirect === 'string' && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/watchlist';

  const handleSuccess = useCallback(() => {
    try {
      router.replace(redirectTo);
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo);
      }
    }
  }, [router, redirectTo]);

  return (
    <PageShell
      title="Sign in"
      intro="Welcome back. Sign in to pick up your watchlist, continue where you left off and share your take on the latest Nollywood releases."
    >
      <div className="auth-page">
        <AuthForm mode="login" onSuccess={handleSuccess} />
        <p className="auth-page__alt">
          New to Nollywood? <Link href="/signup">Create a free viewer account</Link> — it takes less
          than a minute.
        </p>
      </div>
    </PageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Sign in" intro="Preparing the sign-in form…">
          <div className="auth-page">
            <Spinner size="md" label="Loading sign-in form" />
          </div>
        </PageShell>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}