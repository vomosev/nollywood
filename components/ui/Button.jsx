'use client';

import Link from 'next/link';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZES = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function Button({
  variant = 'primary',
  size = 'md',
  as = 'button',
  href,
  type = 'button',
  disabled = false,
  loading = false,
  iconLeft = null,
  children,
  onClick,
  className = '',
  ...rest
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  const isDisabled = Boolean(disabled) || Boolean(loading);

  const classes = classNames(
    'btn',
    variantClass,
    sizeClass,
    loading ? 'is-loading' : null,
    isDisabled ? 'is-disabled' : null,
    className
  );

  const content = (
    <>
      {loading ? (
        <span className="btn__spinner" aria-hidden="true">
          <Spinner size="sm" label="Working" />
        </span>
      ) : null}
      {!loading && iconLeft ? (
        <span className="btn__icon" aria-hidden="true">
          {iconLeft}
        </span>
      ) : null}
      <span className="btn__label">{children}</span>
    </>
  );

  const handleClick = (event) => {
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (typeof onClick === 'function') {
      onClick(event);
    }
  };

  if (as === 'a' || (as === 'link' && href) || (href && as !== 'button')) {
    const isInternal =
      typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');

    const sharedLinkProps = {
      className: classes,
      'aria-busy': loading ? 'true' : undefined,
      'aria-disabled': isDisabled ? 'true' : undefined,
      tabIndex: isDisabled ? -1 : undefined,
      onClick: handleClick,
      ...rest,
    };

    if (isInternal) {
      return (
        <Link href={href} {...sharedLinkProps}>
          {content}
        </Link>
      );
    }

    return (
      <a href={href || '#'} {...sharedLinkProps}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </button>
  );
}