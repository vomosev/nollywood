'use client';

export default function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  const sizeClass = ['sm', 'md', 'lg'].includes(size) ? `spinner-${size}` : 'spinner-md';
  const classes = ['spinner', sizeClass, className].filter(Boolean).join(' ');

  return (
    <span className={classes} role="status" aria-live="polite">
      <svg
        className="spinner__svg"
        viewBox="0 0 32 32"
        focusable="false"
        aria-hidden="true"
      >
        <circle className="spinner__track" cx="16" cy="16" r="13" fill="none" strokeWidth="4" />
        <circle
          className="spinner__indicator"
          cx="16"
          cy="16"
          r="13"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}