
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export const Layout = ({ children, hideHeader = false, hideSidebar = false, hideFooter = false, fullWidth = false }) => {
  return (
    <>
      <div className="min-h-screen flex flex-col">
        {/* Header (full width) */}
        {!hideHeader && <Header />}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          {!hideSidebar && <Sidebar />}
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className={fullWidth ? 'w-full px-6 py-6' : 'w-full mx-auto px-8 py-6'}>
              {children}
            </div>
          </main>
        </div>
      </div>
      {!hideFooter && <Footer />}
    </>
  );
};
