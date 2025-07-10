import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h2>
        
        <p className="text-gray-600 mb-6">
          We're sorry, but something unexpected happened. Please try again.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
              Error Details
            </summary>
            <pre className="text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;