// src/components/ErrorBoundary.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary para capturar erros de React e exibir fallback acessível
 * Essencial para aplicações robustas e experiência acessível
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Aqui você pode enviar o erro para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI acessível
      return (
        <div 
          className="min-h-screen flex items-center justify-center bg-background p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 
                className="text-xl font-semibold text-white"
                id="error-title"
              >
                Algo deu errado
              </h1>
              <p 
                className="text-white/70 text-sm"
                id="error-description"
              >
                {this.props.fallbackMessage || 'Ocorreu um erro inesperado. Tente recarregar a página.'}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-red-500/5 border border-red-500/20 rounded p-3">
                <summary className="text-red-400 cursor-pointer mb-2">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <pre className="text-xs text-red-300 whitespace-pre-wrap overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="
                  flex items-center justify-center gap-2 px-4 py-2 
                  bg-purple-600 hover:bg-purple-700 
                  text-white font-medium rounded-lg 
                  transition-colors focus:outline-none focus:ring-2 
                  focus:ring-purple-500 focus:ring-offset-2 
                  focus:ring-offset-background
                "
                aria-describedby="error-title error-description"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>

              <button
                onClick={() => window.location.reload()}
                className="
                  px-4 py-2 border border-white/20 text-white 
                  hover:bg-white/10 font-medium rounded-lg 
                  transition-colors focus:outline-none focus:ring-2 
                  focus:ring-white/50 focus:ring-offset-2 
                  focus:ring-offset-background
                "
                aria-describedby="error-title error-description"
              >
                Recarregar página
              </button>
            </div>

            {this.props.onError && (
              <button
                onClick={() => this.props.onError(this.state.error)}
                className="text-sm text-white/50 hover:text-white/70 underline focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
              >
                Reportar problema
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallbackMessage: PropTypes.string,
  onError: PropTypes.func,
};

export default ErrorBoundary;