import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useAuth so Login.tsx doesn't trigger supabase env validation
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { Login } from './Login';

import { useAuth } from '@/hooks/useAuth';

const mockSignIn = vi.fn();

function setupMockAuth(overrides = {}) {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    signIn: mockSignIn,
    isLoading: false,
    error: null,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMockAuth();
});

describe('Login', () => {
  it('renders email and password inputs', () => {
    render(<Login />);

    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('renders the welcome header', () => {
    render(<Login />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('shows validation error when email is empty on submit', async () => {
    render(<Login />);

    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid email format', async () => {
    render(<Login />);

    await userEvent.type(screen.getByTestId('email-input'), 'not-an-email');
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('shows validation error when password is empty', async () => {
    render(<Login />);

    await userEvent.type(screen.getByTestId('email-input'), 'admin@example.com');
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('shows validation error when password is too short', async () => {
    render(<Login />);

    await userEvent.type(screen.getByTestId('email-input'), 'admin@example.com');
    await userEvent.type(screen.getByTestId('password-input'), 'short');
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('calls signIn with correct credentials on valid submit', async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<Login />);

    await userEvent.type(screen.getByTestId('email-input'), 'admin@example.com');
    await userEvent.type(screen.getByTestId('password-input'), 'securepassword');
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'securepassword',
      });
    });
  });

  it('calls onSuccess callback after successful login', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    render(<Login onSuccess={onSuccess} />);

    await userEvent.type(screen.getByTestId('email-input'), 'admin@example.com');
    await userEvent.type(screen.getByTestId('password-input'), 'securepassword');
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('displays error message when signIn fails', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'));
    render(<Login />);

    await userEvent.type(screen.getByTestId('email-input'), 'admin@example.com');
    await userEvent.type(screen.getByTestId('password-input'), 'wrongpassword');
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeInTheDocument();
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', () => {
    setupMockAuth({ isLoading: true });
    render(<Login />);

    expect(screen.getByTestId('submit-button')).toBeDisabled();
  });

  it('clears field error when user starts typing', async () => {
    render(<Login />);

    // Trigger email validation error
    fireEvent.click(screen.getByTestId('submit-button'));
    await waitFor(() => expect(screen.getByText('Email is required')).toBeInTheDocument());

    // Start typing to clear the error
    await userEvent.type(screen.getByTestId('email-input'), 'a');
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });
});
