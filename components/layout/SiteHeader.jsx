'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import Button from '../ui/Button';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/movies', label: 'Catalogue' },
  { href: '/watchlist', label: 'Watchlist' },
];

export default function SiteHeader() {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } catch (err) {
      // Session is cleared client-side by the provider even if the network call fails.
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
    }
  }

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return typeof pathname === 'string' && pathname.startsWith(href);
  }

  const authed = status === 'authenticated' && user;

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="Nollywood home">
          <svg
            className="site-header__logo"
            width="32"
            height="32"
            viewBox="0 0 32 32"
            role="img"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="1" y="5" width="30" height="22" rx="4" fill="currentColor" opacity="0.16" />
            <rect x="1" y="5" width="30" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <rect x="4.5" y="8.5" width="3" height="3" rx="0.8" fill="currentColor" />
            <rect x="4.5" y="20.5" width="3" height="3" rx="0.8" fill="currentColor" />
            <rect x="24.5" y="8.5" width="3" height="3" rx="0.8" fill="currentColor" />
            <rect x="24.5" y="20.5" width="3" height="3" rx="0.8" fill="currentColor" />
            <path d="M13.5 11.2 L21 16 L13.5 20.8 Z" fill="currentColor" />
          </svg>
          <span className="site-header__wordmark">Nollywood</span>
        </Link>

        <button
          type="button"
          className="site-header__toggle"
          aria-expanded={menuOpen}
          aria-controls="site-header-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {menuOpen ? (
              <path
                d="M6 6 L18 18 M18 6 L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <path
                d="M4 7 H20 M4 12 H20 M4 17 H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </svg>
          <span className="visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>

        <div
          id="site-header-nav"
          className={menuOpen ? 'site-header__panel is-open' : 'site-header__panel'}
        >
          <nav className="site-nav" aria-label="Primary">
            <ul className="site-nav__list">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isActive(link.href) ? 'site-nav__link is-active' : 'site-nav__link'}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-header__auth">
            {status === 'loading' ? (
              <span className="site-header__status" aria-live="polite">
                Checking session…
              </span>
            ) : authed ? (
              <>
                <Link href="/account" className="site-header__user user-name">
                  {user.name || user.email}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  loading={signingOut}
                  disabled={signingOut}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button as="a" href="/login" variant="ghost" size="sm">
                  Sign in
                </Button>
                <Button as="a" href="/signup" variant="primary" size="sm">
                  Create account
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}