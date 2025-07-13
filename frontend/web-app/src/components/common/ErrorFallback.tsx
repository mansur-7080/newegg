import React from 'react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportError = () => {
    // Send error to monitoring service
    console.error('Error reported:', error);
    // You can integrate with Sentry or other error tracking service here
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Xatolik yuz berdi
        </h2>
        
        <p className="text-gray-600 mb-6">
          Nimadir noto'g'ri ketdi. Iltimos, sahifani yangilashga harakat qiling yoki bosh sahifaga qayting.
        </p>

        <details className="text-left mb-4">
          <summary className="cursor-pointer text-sm text-gray-500 mb-2">
            Xatolik tafsilotlari
          </summary>
          <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
            {error.message}
            {error.stack && (
              <>
                {'\n'}
                {error.stack}
              </>
            )}
          </pre>
        </details>

        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200"
          >
            Qayta urinish
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition duration-200"
          >
            Bosh sahifa
          </button>
          
          <button
            onClick={handleReportError}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200"
          >
            Xatolikni hisobot qilish
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;