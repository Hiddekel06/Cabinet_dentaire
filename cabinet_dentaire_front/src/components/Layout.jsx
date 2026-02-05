
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export const Layout = ({ children }) => {
  return (
    <>
      <div className="min-h-screen flex flex-col">
        {/* Header (full width) */}
        <Header />
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <Sidebar />
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="w-full mx-auto px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
};
