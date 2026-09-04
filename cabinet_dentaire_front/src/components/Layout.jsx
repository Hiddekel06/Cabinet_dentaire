
import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export const Layout = ({ children, hideHeader = false, hideSidebar = false, hideFooter = false, fullWidth = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="min-h-screen flex flex-col">
        {/* Header (full width) */}
        {!hideHeader && (
          <Header onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        )}
        <div className="flex flex-1 min-h-[calc(100vh-4rem)] relative">
          {/* Sidebar */}
          {!hideSidebar && (
            <Sidebar
              isMobileOpen={isMobileMenuOpen}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />
          )}
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className={fullWidth ? 'w-full px-3 sm:px-6 py-4 sm:py-6' : 'w-full mx-auto px-4 sm:px-8 py-4 sm:py-6'}>
              {children}
            </div>
          </main>
        </div>
      </div>
      {!hideFooter && <Footer />}
    </>
  );
};

