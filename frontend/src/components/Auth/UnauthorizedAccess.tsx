/**
 * Unauthorized Access Component
 * Display when user tries to access a resource without proper permissions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiArrowLeft, FiShield, FiAlertTriangle } from 'react-icons/fi';

interface UnauthorizedAccessProps {
  message?: string;
  title?: string;
  showBackButton?: boolean;
}

const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({
  message = 'No tienes permisos suficientes para acceder a esta sección.',
  title = 'Acceso Denegado',
  showBackButton = true
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/crm');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
              <FiLock className="w-10 h-10 text-red-600" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2"
          >
            <FiShield className="text-red-600" />
            {title}
          </motion.h1>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-6 leading-relaxed"
          >
            {message}
          </motion.p>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start gap-3 text-left">
              <FiAlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">¿Por qué veo esto?</p>
                <p className="text-orange-700">
                  Tu rol de usuario actual no tiene los permisos necesarios para acceder a esta funcionalidad. 
                  Contacta al administrador del sistema si crees que deberías tener acceso.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {showBackButton && (
              <button
                onClick={handleGoBack}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <FiArrowLeft />
                Volver
              </button>
            )}
            <button
              onClick={handleGoHome}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              Ir al Dashboard
            </button>
          </motion.div>

          {/* Help Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-sm text-gray-500"
          >
            ¿Necesitas ayuda? Contacta a{' '}
            <a href="mailto:admin@spirittours.us" className="text-blue-600 hover:underline font-semibold">
              admin@spirittours.us
            </a>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default UnauthorizedAccess;
