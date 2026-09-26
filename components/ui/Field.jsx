'use client';

import { forwardRef, useId } from 'react';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}) {
  const generatedId = useId();
  const controlId = htmlFor || `field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const child =
    typeof children === 'function'
      ? children({
          id: controlId,
          'aria-describedby': describedBy,
          'aria-invalid': error ? 'true' : undefined,
          required,
        })
      : children;

  return (
    <div className={cx('field', error && 'field--invalid', className)}>
      {label ? (
        <label className="field__label" htmlFor={controlId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div className="field__control">{child}</div>

      {hint && !error ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { type = 'text', invalid = false, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cx('input', invalid && 'input--invalid', className)}
      aria-invalid={invalid ? 'true' : rest['aria-invalid']}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  { rows = 4, invalid = false, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cx('textarea', invalid && 'input--invalid', className)}
      aria-invalid={invalid ? 'true' : rest['aria-invalid']}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select(
  { options, children, invalid = false, className, placeholder, ...rest },
  ref
) {
  const items = Array.isArray(options) ? options : null;

  return (
    <select
      ref={ref}
      className={cx('select', invalid && 'input--invalid', className)}
      aria-invalid={invalid ? 'true' : rest['aria-invalid']}
      {...rest}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {items
        ? items.map((option) => {
            const value =
              typeof option === 'object' && option !== null ? option.value : option;
            const label =
              typeof option === 'object' && option !== null
                ? option.label ?? String(option.value)
                : String(option);
            return (
              <option key={String(value)} value={value}>
                {label}
              </option>
            );
          })
        : children}
    </select>
  );
});

export default Field;