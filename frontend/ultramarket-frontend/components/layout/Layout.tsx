import React, { ReactNode, useState, useEffect } from 'react';
import { NextUIProvider } from '@nextui-org/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import CartSidebar from './CartSidebar';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';

// Dynamic imports for performance
const LoadingBar = dynamic(() => import('../ui/LoadingBar'), { ssr: false });
const CookieConsent = dynamic(() => import('../ui/CookieConsent'), { ssr: false });

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
  seoData?: {
    title?: string;
    description?: string;
    canonical?: string;
  };
}

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const Layout: React.FC<LayoutProps> = ({
  children,
  showHeader = true,
  showFooter = true,
  className = '',
  seoData
}) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { cartItems, totalItems } = useCart();

  // Handle page loading states
  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    // Router events would be handled here in a real app
    // router.events.on('routeChangeStart', handleStart);
    // router.events.on('routeChangeComplete', handleComplete);

    return () => {
      // Cleanup
    };
  }, []);

  // Close mobile nav when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileNavOpen) {
        const target = event.target as Element;
        if (!target.closest('.mobile-nav') && !target.closest('.mobile-nav-toggle')) {
          setIsMobileNavOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileNavOpen]);

  // Handle cart open/close
  const handleCartToggle = () => {
    setIsCartOpen(!isCartOpen);
  };

  // Handle mobile navigation toggle
  const handleMobileNavToggle = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <NextUIProvider>
        <NextThemesProvider attribute="class" defaultTheme="light">
          <div className={`min-h-screen flex flex-col bg-white dark:bg-gray-900 ${className}`}>
            {/* Loading Bar */}
            {isLoading && <LoadingBar />}

            {/* Header */}
            {showHeader && (
              <Header
                user={user}
                isAuthenticated={isAuthenticated}
                cartItemsCount={totalItems}
                onCartClick={handleCartToggle}
                onMobileNavClick={handleMobileNavToggle}
                isMobileNavOpen={isMobileNavOpen}
              />
            )}

            {/* Mobile Navigation */}
            <MobileNav
              isOpen={isMobileNavOpen}
              onClose={() => setIsMobileNavOpen(false)}
              user={user}
              isAuthenticated={isAuthenticated}
            />

            {/* Main Content */}
            <main className="flex-1 relative">
              {children}
            </main>

            {/* Footer */}
            {showFooter && <Footer />}

            {/* Cart Sidebar */}
            <CartSidebar
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              items={cartItems}
            />

            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#22c55e',
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

            {/* Cookie Consent */}
            <CookieConsent />

            {/* Backdrop for mobile nav */}
            {isMobileNavOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={() => setIsMobileNavOpen(false)}
              />
            )}

            {/* Backdrop for cart */}
            {isCartOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setIsCartOpen(false)}
              />
            )}

            {/* Scroll to Top Button */}
            <ScrollToTopButton />
          </div>
        </NextThemesProvider>
      </NextUIProvider>
    </QueryClientProvider>
  );
};

// Scroll to Top Button Component
const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all duration-300 hover:scale-110"
      aria-label="Yuqoriga qaytish"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
};

export default Layout;