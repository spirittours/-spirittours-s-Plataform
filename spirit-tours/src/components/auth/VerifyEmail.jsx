import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaEnvelope, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  
  const email = location.state?.email;
  const message = location.state?.message;
  const token = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (token) {
      handleVerification(token);
    }
  }, [token]);

  const handleVerification = async (verificationToken) => {
    setVerifying(true);
    setError('');
    
    const result = await verifyEmail(verificationToken);
    
    if (result.success) {
      setVerified(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } else {
      setError(result.error);
    }
    
    setVerifying(false);
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <FaSpinner className="animate-spin h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Verificando email...</h2>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <FaCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">¡Email verificado!</h2>
          <p className="text-gray-600 mb-6">
            Tu email ha sido verificado correctamente. Serás redirigido a tu dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <FaTimesCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Error en la verificación</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <FaEnvelope className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Verifica tu email</h2>
        {message && (
          <p className="text-gray-600 mb-6">{message}</p>
        )}
        {email ? (
          <>
            <p className="text-gray-600 mb-6">
              Hemos enviado un email de verificación a <strong>{email}</strong>.
              Por favor, revisa tu bandeja de entrada y haz clic en el enlace de verificación.
            </p>
            <p className="text-sm text-gray-500">
              ¿No recibiste el email? Revisa tu carpeta de spam o solicita un nuevo enlace.
            </p>
          </>
        ) : (
          <p className="text-gray-600 mb-6">
            Por favor, verifica tu email usando el enlace que te enviamos.
          </p>
        )}
        <button
          onClick={() => navigate('/')}
          className="mt-6 text-indigo-600 hover:text-indigo-500 text-sm"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;