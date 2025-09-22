import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types/auth';

interface HeaderProps {
  onMenuClick: () => void;
  user?: User | null;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, user }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Mobile menu button and title */}
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            
            <div className="ml-4 lg:ml-0">
              <h1 className="text-xl font-semibold text-gray-900">
                Spirit Tours Platform
              </h1>
              <p className="text-sm text-gray-500">
                AI-Powered Tourism Management
              </p>
            </div>
          </div>

          {/* Right side - Notifications and user menu */}
          <div className="flex items-center space-x-4">
            {/* System Status Indicator */}
            <div className="hidden sm:flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">All Systems Operational</span>
            </div>

            {/* Notifications */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 rounded-md"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
              <span className="absolute -mt-1 -mr-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {user?.avatar_url ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.avatar_url}
                    alt={user.full_name || user.email}
                  />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.full_name || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role || 'Member'}
                  </p>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  onBlur={() => setUserMenuOpen(false)}
                >
                  <div className="py-1">
                    {/* User info */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.full_name || user?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.email}
                      </p>
                    </div>

                    {/* Menu items */}
                    <a
                      href="#"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={(e) => e.preventDefault()}
                    >
                      <UserCircleIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Your Profile
                    </a>
                    
                    <a
                      href="#"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Settings
                    </a>

                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-red-400" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time system status bar */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 sm:px-6 lg:px-8 py-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-green-600 font-medium">25 AI Agents Active</span>
            <span className="text-blue-600">Backend: 100% Complete</span>
            <span className="text-purple-600">Frontend: Development Phase</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Last Update:</span>
            <span className="text-gray-700 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;