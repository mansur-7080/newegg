import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
    resetErrorBoundary();
  };

  const handleRetry = () => {
    resetErrorBoundary();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Xatolik yuz berdi</h1>
          <p className="text-gray-600 mb-6">
            Kechirasiz, biror narsa noto'g'ri ketdi. Iltimos, qaytadan urinib ko'ring.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Xatolik ma'lumotlari:</h3>
            <pre className="text-xs text-red-600 overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Qaytadan urinish
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Bosh sahifaga qaytish
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Agar muammo davom etsa, iltimos biz bilan bog'laning:</p>
          <a
            href="mailto:support@ultramarket.uz"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            support@ultramarket.uz
          </a>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;