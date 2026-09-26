'use client';

import React from 'react';

const ICONS = {
  empty: (
    <svg
      className="empty-state__art"
      viewBox="0 0 96 96"
      role="img"
      aria-hidden="true"
      focusable="false"
      width="96"
      height="96"
    >
      <rect
        x="10"
        y="20"
        width="76"
        height="56"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.5"
      />
      <path
        d="M10 34h76M10 62h76"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <circle cx="20" cy="27" r="3" fill="currentColor" opacity="0.45" />
      <circle cx="32" cy="27" r="3" fill="currentColor" opacity="0.45" />
      <circle cx="20" cy="69" r="3" fill="currentColor" opacity="0.45" />
      <circle cx="32" cy="69" r="3" fill="currentColor" opacity="0.45" />
      <path
        d="M40 42h28v12H40z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.6"
      />
    </svg>
  ),
  error: (
    <svg
      className="empty-state__art"
      viewBox="0 0 96 96"
      role="img"
      aria-hidden="true"
      focusable="false"
      width="96"
      height="96"
    >
      <path
        d="M48 14 88 80H8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <path
        d="M48 40v18"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="48" cy="68" r="3.5" fill="currentColor" />
    </svg>
  ),
  auth: (
    <svg
      className="empty-state__art"
      viewBox="0 0 96 96"
      role="img"
      aria-hidden="true"
      focusable="false"
      width="96"
      height="96"
    >
      <rect
        x="22"
        y="44"
        width="52"
        height="36"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.6"
      />
      <path
        d="M34 44V34a14 14 0 0 1 28 0v10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="48" cy="60" r="4" fill="currentColor" />
      <path
        d="M48 64v6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const DEFAULT_COPY = {
  empty: {
    title: 'Nothing here yet',
    message: 'There is no content to show in this view right now.',
  },
  error: {
    title: 'Something went wrong',
    message:
      'We could not load this content. Check your connection and try again.',
  },
  auth: {
    title: 'Sign in to continue',
    message: 'This part of Nollywood is reserved for signed-in viewers.',
  },
};

export default function EmptyState({
  variant = 'empty',
  title,
  message,
  action,
  className = '',
}) {
  const safeVariant = ICONS[variant] ? variant : 'empty';
  const copy = DEFAULT_COPY[safeVariant];
  const heading = title || copy.title;
  const body = message || copy.message;

  const classes = ['empty-state', `empty-state--${safeVariant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role={safeVariant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {ICONS[safeVariant]}
      <h2 className="empty-state__title">{heading}</h2>
      <p className="empty-state__message">{body}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}