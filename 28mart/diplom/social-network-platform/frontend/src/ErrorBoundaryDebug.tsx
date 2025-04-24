import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryDebug extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error info to console for debugging
    console.error('Error caught by ErrorBoundaryDebug:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white shadow-lg rounded-lg p-6 max-w-3xl w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Error:</h2>
              <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">
                {this.state.error?.toString()}
              </pre>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Component Stack:</h2>
              <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-gradient-to-r from-gray-300 to-rose-500 text-white rounded hover:from-gray-400 hover:to-rose-600 transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    // Normally, just render children
    return this.props.children;
  }
}

export default ErrorBoundaryDebug; 