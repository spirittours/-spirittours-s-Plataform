import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/UI';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const popularLinks = [
    { title: 'Browse Tours', path: '/tours', icon: '🗺️' },
    { title: 'Search', path: '/search', icon: '🔍' },
    { title: 'My Bookings', path: '/my-bookings', icon: '📋' },
    { title: 'Profile', path: '/profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full">
        {/* Main 404 Section */}
        <div className="text-center mb-12">
          {/* Animated 404 */}
          <div className="relative inline-block mb-8">
            <h1 className="text-[200px] sm:text-[250px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 leading-none">
              404
            </h1>
            <div className="absolute inset-0 animate-pulse">
              <h1 className="text-[200px] sm:text-[250px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 leading-none opacity-20">
                404
              </h1>
            </div>
          </div>

          {/* Message */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              Oops! Page Not Found
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <p className="text-gray-500">
              Don't worry, even the best explorers get lost sometimes! 🧭
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="lg"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              }
            >
              Go Back
            </Button>
            <Link to="/">
              <Button
                size="lg"
                icon={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                }
              >
                Go Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Popular Links */}
        <Card padding="lg">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Try These Popular Pages
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularLinks.map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className="group p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all duration-300 text-center"
              >
                <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                  {link.icon}
                </div>
                <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {link.title}
                </h4>
              </Link>
            ))}
          </div>
        </Card>

        {/* Helpful Tips */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Helpful Tips:</strong>
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Check the URL for typos</li>
            <li>• Use the search feature to find what you're looking for</li>
            <li>• Visit our homepage to explore available tours</li>
          </ul>
        </div>

        {/* Support Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Still can't find what you're looking for?{' '}
            <Link to="/contact" className="text-blue-600 hover:text-blue-700 font-semibold">
              Contact Support →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
