import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, CogIcon } from '@heroicons/react/24/outline';

interface ComingSoonProps {
  title: string;
  description?: string;
  agentName?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ 
  title, 
  description = "This feature is currently under development.",
  agentName 
}) => {
  return (
    <div className="min-h-[500px] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto h-20 w-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl mb-6"
        >
          {agentName ? (
            <CogIcon className="h-10 w-10 text-white" />
          ) : (
            <SparklesIcon className="h-10 w-10 text-white" />
          )}
        </motion.div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        
        {agentName && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-indigo-700 mb-1">AI Agent</p>
            <p className="text-lg font-semibold text-gray-900">{agentName}</p>
          </div>
        )}
        
        <p className="text-gray-600 mb-8">{description}</p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">What's Coming Soon:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
                Advanced AI-powered interface
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                Real-time analytics and insights
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-pink-400 rounded-full mr-3"></div>
                Interactive controls and configuration
              </li>
              {agentName && (
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  {agentName} specific features
                </li>
              )}
            </ul>
          </div>
          
          <div className="text-sm text-gray-500">
            Part of the Spirit Tours AI Platform • 25 Agents System
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ComingSoon;