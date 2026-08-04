import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last line of defence. React has no hook equivalent for error boundaries, so
 * this stays a class component.
 *
 * The copy is deliberately untranslated: LanguageProvider sits inside this
 * boundary, so t() may itself be the thing that failed.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No error-reporting service is wired up; the console is the only sink.
    console.error('Unhandled render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black px-6 text-center">
        <h1 className="font-serif text-4xl text-white">Something went wrong</h1>
        <a
          href="/"
          className="border border-white px-6 py-2 text-sm uppercase tracking-wider text-white hover:bg-white hover:text-black transition-colors"
        >
          Back to the portfolio
        </a>
      </div>
    );
  }
}

export default ErrorBoundary;
