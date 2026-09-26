'use client';

import { useState } from 'react';
import Card, { CardBody, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { useAuth } from '../providers/AuthProvider';

function validate(mode, values) {
  const errors = {};

  if (mode === 'signup') {
    const name = values.name.trim();
    if (!name) {
      errors.name = 'Please tell us your name.';
    } else if (name.length < 2) {
      errors.name = 'Your name needs at least 2 characters.';
    }
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = 'An email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = 'That does not look like a valid email address.';
  }

  if (!values.password) {
    errors.password = 'A password is required.';
  } else if (mode === 'signup' && values.password.length < 8) {
    errors.password = 'Use at least 8 characters for your password.';
  }

  return errors;
}

export default function AuthForm({ mode = 'login', onSuccess }) {
  const isSignup = mode === 'signup';
  const auth = useAuth();

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field) {
    return (event) => {
      const next = event && event.target ? event.target.value : '';
      setValues((prev) => ({ ...prev, [field]: next }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setServerError('');
    const nextErrors = validate(mode, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const name = values.name.trim();
      const email = values.email.trim().toLowerCase();
      const password = values.password;

      const result = isSignup
        ? await auth.signup(name, email, password)
        : await auth.login(email, password);

      if (result && result.ok === false) {
        setServerError(
          result.error ||
            (isSignup
              ? 'We could not create your account. Please try again.'
              : 'We could not sign you in. Please check your details.')
        );
        return;
      }

      const user = (result && result.user) || null;
      if (typeof onSuccess === 'function') {
        onSuccess(user);
      }
    } catch (err) {
      const message =
        (err && err.message) ||
        'We could not reach the Nollywood service. Please try again shortly.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="auth-card" padding="lg">
      <form className="auth-form stack" onSubmit={handleSubmit} noValidate>
        <CardBody>
          {serverError ? (
            <p className="form-banner form-banner--error" role="alert">
              {serverError}
            </p>
          ) : null}

          {isSignup ? (
            <Field
              label="Full name"
              htmlFor="auth-name"
              hint="This is the name shown beside your reviews."
              error={errors.name}
              required
            >
              <Input
                id="auth-name"
                name="name"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={handleChange('name')}
                placeholder="Adaeze Nwosu"
                aria-invalid={errors.name ? 'true' : undefined}
                disabled={submitting}
              />
            </Field>
          ) : null}

          <Field
            label="Email address"
            htmlFor="auth-email"
            error={errors.email}
            required
          >
            <Input
              id="auth-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              onChange={handleChange('email')}
              placeholder="you@example.com"
              aria-invalid={errors.email ? 'true' : undefined}
              disabled={submitting}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="auth-password"
            hint={isSignup ? 'At least 8 characters.' : undefined}
            error={errors.password}
            required
          >
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={values.password}
              onChange={handleChange('password')}
              placeholder={isSignup ? 'Choose a strong password' : 'Your password'}
              aria-invalid={errors.password ? 'true' : undefined}
              disabled={submitting}
            />
          </Field>
        </CardBody>

        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting}
          >
            {isSignup ? 'Create account' : 'Sign in'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}