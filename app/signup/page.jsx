'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PageShell from '../../components/layout/PageShell';
import AuthForm from '../../components/auth/AuthForm';
import { useAuth } from '../../components/providers/AuthProvider';

export default function SignupPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/movies');
    }
  }, [status, router]);

  const handleSuccess = () => {
    router.replace('/movies');
  };

  return (
    <PageShell
      title="Create your account"
      intro="A free viewer account lets you build a watchlist, pick up where you left off and share your verdict on every release in the Nollywood catalogue."
    >
      <div className="auth-page">
        <AuthForm mode="signup" onSuccess={handleSuccess} />

        <div className="auth-aside stack">
          <h2>What you get</h2>
          <ul>
            <li>Save titles to a personal watchlist across every device.</li>
            <li>Resume playback with automatic viewing history.</li>
            <li>Rate and review films for the wider community.</li>
          </ul>
          <p className="text-muted">
            Accounts are free. We only store your name, email address and a securely
            hashed password — never card details.
          </p>
          <p>
            Already have an account? <Link href="/login">Sign in instead</Link>.
          </p>
        </div>
      </div>
    </PageShell>
  );
}