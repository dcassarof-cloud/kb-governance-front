import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('ErrorBoundary capturou um erro inesperado:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-lg text-center space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Algo deu errado</h1>
            <p className="text-muted-foreground">
              Ocorreu um erro inesperado. Atualize a página ou tente novamente em alguns instantes.
            </p>
            <button
              className="px-4 py-2 rounded bg-primary text-primary-foreground"
              onClick={() => window.location.reload()}
              type="button"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
