import React from 'react';
import { Button } from '@/components/ui/button';

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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <Button onClick={() => window.location.reload()} type="button">
                Recarregar
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/dashboard')} type="button">
                Voltar para Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
