import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Simple Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Spirit Tours</span>
            </Link>
            <Link
              to="/"
              className="text-gray-600 hover:text-blue-600 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
            <p>&copy; {new Date().getFullYear()} Spirit Tours. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 sm:mt-0">
              <Link to="/terms" className="hover:text-blue-600 transition">
                Terms
              </Link>
              <Link to="/privacy" className="hover:text-blue-600 transition">
                Privacy
              </Link>
              <Link to="/help" className="hover:text-blue-600 transition">
                Help
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;
