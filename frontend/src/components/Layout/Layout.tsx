import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { useRBACStore } from '../../store/rbacStore';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useRBACStore();

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:relative lg:translate-x-0"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-64 lg:bg-white lg:shadow-xl">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            user={user}
          />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="min-h-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;