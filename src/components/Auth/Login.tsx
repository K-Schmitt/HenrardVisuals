import { useState, useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { LoginFormProps } from '@/types';

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function Login({ onSuccess, onError }: LoginFormProps) {
  const { signIn, isLoading, error: authError } = useAuth();

  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formState.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formState.password) {
      newErrors.password = 'Password is required';
    } else if (formState.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormState((prev) => ({ ...prev, [name]: value }));

      // Clear field error when user types
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        await signIn({
          email: formState.email,
          password: formState.password,
        });

        onSuccess?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        setErrors({ general: message });

        if (onError && authError) {
          onError(authError);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState, validateForm, signIn, onSuccess, onError, authError]
  );

  const isButtonDisabled = isLoading || isSubmitting;

  return (
    <div className="w-full max-w-md mx-auto" data-testid="login-form-container">
      {/* Header */}
      <header className="text-center mb-8">
        <h2 className="font-display text-display-sm text-primary-50">Welcome Back</h2>
        <p className="mt-2 text-body-md text-primary-400">Sign in to access the admin panel</p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="login-form">
        {/* General Error */}
        {errors.general && (
          <div
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-elegant"
            role="alert"
            data-testid="login-error"
          >
            <p className="text-body-sm text-red-400">{errors.general}</p>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-caption text-primary-400 uppercase tracking-wider mb-2"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formState.email}
            onChange={handleChange}
            disabled={isButtonDisabled}
            className={`
              w-full px-4 py-3
              bg-primary-900/50 border rounded-elegant
              text-primary-100 placeholder:text-primary-600
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-accent-500/50
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                errors.email
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-primary-700/50 focus:border-accent-500'
              }
            `}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            data-testid="email-input"
          />
          {errors.email && (
            <p id="email-error" className="mt-2 text-body-sm text-red-400" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-caption text-primary-400 uppercase tracking-wider mb-2"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={formState.password}
            onChange={handleChange}
            disabled={isButtonDisabled}
            className={`
              w-full px-4 py-3
              bg-primary-900/50 border rounded-elegant
              text-primary-100 placeholder:text-primary-600
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-accent-500/50
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                errors.password
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-primary-700/50 focus:border-accent-500'
              }
            `}
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            data-testid="password-input"
          />
          {errors.password && (
            <p id="password-error" className="mt-2 text-body-sm text-red-400" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isButtonDisabled}
          className={`
            w-full py-4 px-6
            bg-accent-500 hover:bg-accent-600
            text-primary-900 font-medium
            rounded-elegant
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:ring-offset-2 focus:ring-offset-surface-darker
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isButtonDisabled ? '' : 'hover:shadow-glow-gold'}
          `}
          data-testid="submit-button"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </div>
  );
}

export default Login;
