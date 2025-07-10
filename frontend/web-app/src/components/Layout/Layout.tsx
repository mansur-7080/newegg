import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading } = useSelector((state: RootState) => state.ui);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;