import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';

// Layout Components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorFallback from './components/common/ErrorFallback';

// Pages (Lazy loaded)
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ProductListPage = React.lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const OrderHistoryPage = React.lazy(() => import('./pages/OrderHistoryPage'));
const PCBuilderPage = React.lazy(() => import('./pages/pc-builder/index'));
const NASBuilderPage = React.lazy(() => import('./pages/NASBuilderPage'));
const MemoryFinderPage = React.lazy(() => import('./pages/MemoryFinderPage'));
const PCCompatibilityBuilder = React.lazy(() => import('./pages/PC-Compatibility-Builder'));
const AutoPartsCompatibility = React.lazy(() => import('./pages/AutoPartsCompatibility'));
const CompareProductsPage = React.lazy(() => import('./pages/CompareProductsPage'));
const WishlistPage = React.lazy(() => import('./pages/WishlistPage'));
const ShoppingToolsPage = React.lazy(() => import('./pages/ShoppingToolsPage'));
const GamingZonePage = React.lazy(() => import('./pages/GamingZonePage'));
const AIProductDetailExample = React.lazy(() => import('./pages/AIProductDetailExample'));
const TechHomePage = React.lazy(() => import('./pages/TechHomePage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// Store
import { Provider } from 'react-redux';
import { store } from './store';

// Styles
import './styles/globals.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback as any}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <HelmetProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/products" element={<ProductListPage />} />
                      <Route path="/products/:id" element={<ProductDetailPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/pc-builder" element={<PCBuilderPage />} />
                      <Route path="/nas-builder" element={<NASBuilderPage />} />
                      <Route path="/memory-finder" element={<MemoryFinderPage />} />
                      <Route path="/tech" element={<TechHomePage />} />
                      <Route path="/pc-compatibility" element={<PCCompatibilityBuilder />} />
                      <Route path="/auto-parts" element={<AutoPartsCompatibility />} />
                      <Route path="/compare" element={<CompareProductsPage />} />
                      <Route path="/wishlist" element={<WishlistPage />} />
                      <Route path="/shopping-tools" element={<ShoppingToolsPage />} />
                      <Route path="/gaming-zone" element={<GamingZonePage />} />
                      <Route path="/ai-recommendations" element={<AIProductDetailExample />} />

                      {/* Protected Routes */}
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/orders" element={<OrderHistoryPage />} />

                      {/* 404 Route */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </Layout>

                {/* Global Components */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: '#10b981',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </HelmetProvider>

          {/* React Query DevTools (only in development) */}
          {import.meta.env?.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
