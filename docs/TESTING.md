# HenrardVisuals - Testing Guide

## Overview

This project uses a comprehensive testing stack:

- **Vitest** - Fast unit test runner with Vite integration
- **React Testing Library** - Component testing utilities
- **MSW (Mock Service Worker)** - API mocking for Supabase
- **Coverage V8** - Code coverage reporting

---

## Quick Start

### Run All Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:ci

# Run with coverage report
pnpm test:coverage

# Run with UI
pnpm test:ui
```

---

## Test Structure

```
src/
├── components/
│   ├── Auth/
│   │   ├── Login.tsx
│   │   └── Login.test.tsx        ← Component test
│   ├── Gallery/
│   │   ├── MasonryGallery.tsx
│   │   └── MasonryGallery.test.tsx
│   └── Layout/
│       ├── Sidebar.tsx
│       └── Sidebar.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts           ← Hook test
tests/
├── setup.ts                      ← Global test setup
└── mocks/
    ├── handlers.ts               ← MSW request handlers
    └── server.ts                 ← MSW server config
```

---

## Running Tests

### Watch Mode (Development)

```bash
pnpm test
```

Tests will re-run automatically when files change.

### Single Run (CI)

```bash
pnpm test:ci
```

Runs all tests once and exits. Used in CI/CD pipelines.

### Coverage Report

```bash
pnpm test:coverage
```

Generates a coverage report in `./coverage/` directory.

### Visual UI

```bash
pnpm test:ui
```

Opens an interactive UI at http://localhost:51204/__vitest__/

---

## Coverage Requirements

The project enforces **80% minimum coverage** across all metrics:

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 80% |
| Statements | 80% |

The CI build will **fail** if coverage drops below these thresholds.

### Reading Coverage Reports

After running `pnpm test:coverage`:

1. **Terminal Output**: Summary table with percentages
2. **HTML Report**: `./coverage/index.html` - detailed interactive report
3. **LCOV Report**: `./coverage/lcov.info` - for CI integrations

```bash
# Open HTML report in browser
open coverage/index.html
```

### Coverage Output Example

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   85.23 |    81.45 |   88.12 |   85.67 |
 components/Auth       |   92.00 |    88.00 |   90.00 |   92.00 |
  Login.tsx            |   92.00 |    88.00 |   90.00 |   92.00 |
 components/Gallery    |   88.50 |    82.00 |   85.00 |   88.00 |
  MasonryGallery.tsx   |   88.50 |    82.00 |   85.00 |   88.00 |
 hooks                 |   84.00 |    78.00 |   90.00 |   84.00 |
  useAuth.ts           |   84.00 |    78.00 |   90.00 |   84.00 |
-----------------------|---------|----------|---------|---------|
```

---

## Writing Tests

### Component Test Example

```tsx
// src/components/Example/Example.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Example } from './Example';

describe('Example Component', () => {
  it('should render correctly', () => {
    render(<Example title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Example onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Test Example

```tsx
// src/hooks/useExample.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExample } from './useExample';

describe('useExample Hook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useExample());
    expect(result.current.value).toBe(null);
  });

  it('should update value when action is called', async () => {
    const { result } = renderHook(() => useExample());
    
    await act(async () => {
      await result.current.updateValue('new value');
    });

    await waitFor(() => {
      expect(result.current.value).toBe('new value');
    });
  });
});
```

### Testing with MSW

Supabase API calls are mocked using MSW. See `tests/mocks/handlers.ts`:

```typescript
// Override handler for specific test
import { server } from '../../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

it('should handle API error', async () => {
  // Override the default handler
  server.use(
    http.get('http://localhost:8000/rest/v1/photos', () => {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    })
  );

  // Your test that expects an error...
});
```

---

## Testing Patterns

### Testing User Events

```tsx
import userEvent from '@testing-library/user-event';

it('should submit form with user input', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

### Testing Async Operations

```tsx
it('should load data asynchronously', async () => {
  render(<DataComponent />);

  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // Verify data is displayed
  expect(screen.getByText('Loaded Data')).toBeInTheDocument();
});
```

### Testing Error States

```tsx
it('should display error message on API failure', async () => {
  server.use(
    http.post('http://localhost:8000/auth/v1/token', () => {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    })
  );

  render(<LoginForm />);
  
  await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
  await user.type(screen.getByLabelText(/password/i), 'wrongpass');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid/i);
  });
});
```

---

## Debugging Tests

### Verbose Output

```bash
pnpm test -- --reporter=verbose
```

### Debug Specific Test

```bash
pnpm test -- -t "should render correctly"
```

### Screen Debug

```tsx
it('debug test', () => {
  render(<Component />);
  screen.debug(); // Prints DOM to console
});
```

### Log Test Names

```bash
pnpm test -- --reporter=dot
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - run: pnpm install
      
      - run: pnpm test:ci
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Coverage Badge

Add to README:

```markdown
[![Coverage](https://codecov.io/gh/K-Schmitt/HenrardVisuals/branch/main/graph/badge.svg)](https://codecov.io/gh/K-Schmitt/HenrardVisuals)
```

---

## Best Practices

### ✅ Do

- Test user-visible behavior, not implementation details
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test accessibility (roles, labels, ARIA)
- Mock external dependencies (API, browser APIs)
- Keep tests focused and isolated
- Use meaningful test descriptions

### ❌ Don't

- Test internal state or implementation
- Use `getByTestId` as first choice (use as last resort)
- Share mutable state between tests
- Test third-party library behavior
- Write tests that depend on test order

---

## Test Files Summary

| File | Tests | Coverage Target |
|------|-------|-----------------|
| `useAuth.test.ts` | Auth state, login, logout | 80%+ |
| `MasonryGallery.test.tsx` | Rendering, loading, clicks | 80%+ |
| `Login.test.tsx` | Form, validation, errors | 80%+ |
| `Sidebar.test.tsx` | Navigation, responsive | 80%+ |

---

## Troubleshooting

### Tests Hang

```bash
# Increase timeout
pnpm test -- --testTimeout=10000
```

### MSW Not Working

Ensure `tests/setup.ts` is properly configured in `vite.config.ts`:

```typescript
test: {
  setupFiles: ['./tests/setup.ts'],
}
```

### Import Errors

Check path aliases in both `tsconfig.json` and `vite.config.ts`.

### Coverage Too Low

Check excluded files in `vite.config.ts`:

```typescript
coverage: {
  exclude: ['**/*.test.tsx', 'tests/', ...],
}
```
