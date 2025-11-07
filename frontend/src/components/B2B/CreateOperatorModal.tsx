/**
 * Create Tour Operator Modal
 * Modal form for creating new tour operators
 * Only accessible by system_admin role
 * 
 * Features:
 * - Complete form validation
 * - API system type selection
 * - Credentials configuration
 * - Business terms setup
 * - Contact information
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiSave, FiAlertCircle, FiGlobe, FiDollarSign,
  FiUser, FiLock, FiServer, FiCheckCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import tourOperatorsService from '../../services/tourOperatorsService';

interface CreateOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OperatorFormData {
  name: string;
  code: string;
  businessName: string;
  type: 'receptive' | 'wholesaler' | 'dmc' | 'bedbank' | 'aggregator';
  relationship: 'supplier' | 'buyer' | 'both';
  apiSystem: {
    type: string;
    credentials: {
      username?: string;
      password?: string;
      apiKey?: string;
      agencyCode?: string;
    };
    endpoints: {
      production?: string;
      sandbox?: string;
      wsdl?: string;
    };
    config: {
      environment: 'production' | 'sandbox';
      timeout: number;
      retryAttempts: number;
    };
  };
  businessTerms: {
    defaultCommission: {
      type: 'percentage' | 'fixed';
      value: number;
    };
    currency: string;
  };
  contact: {
    primaryName: string;
    primaryEmail: string;
    primaryPhone: string;
  };
}

const CreateOperatorModal: React.FC<CreateOperatorModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OperatorFormData>({
    name: '',
    code: '',
    businessName: '',
    type: 'receptive',
    relationship: 'supplier',
    apiSystem: {
      type: 'eJuniper',
      credentials: {
        username: '',
        password: '',
        agencyCode: ''
      },
      endpoints: {
        production: '',
        sandbox: '',
        wsdl: ''
      },
      config: {
        environment: 'sandbox',
        timeout: 30000,
        retryAttempts: 3
      }
    },
    businessTerms: {
      defaultCommission: {
        type: 'percentage',
        value: 10
      },
      currency: 'USD'
    },
    contact: {
      primaryName: '',
      primaryEmail: '',
      primaryPhone: ''
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiSystemTypes = [
    { value: 'eJuniper', label: 'eJuniper (SOAP/XML)' },
    { value: 'REST', label: 'REST API' },
    { value: 'GraphQL', label: 'GraphQL' },
    { value: 'SOAP', label: 'SOAP' },
    { value: 'Custom', label: 'Custom Integration' }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Nombre requerido';
      if (!formData.code.trim()) newErrors.code = 'Código requerido';
      if (!formData.businessName.trim()) newErrors.businessName = 'Razón social requerida';
    }

    if (step === 2) {
      if (!formData.apiSystem.type) newErrors.apiSystemType = 'Sistema API requerido';
      if (formData.apiSystem.type === 'eJuniper') {
        if (!formData.apiSystem.credentials.username) {
          newErrors.username = 'Usuario requerido';
        }
        if (!formData.apiSystem.credentials.password) {
          newErrors.password = 'Contraseña requerida';
        }
        if (!formData.apiSystem.credentials.agencyCode) {
          newErrors.agencyCode = 'Código de agencia requerido';
        }
        if (!formData.apiSystem.endpoints.wsdl) {
          newErrors.wsdl = 'URL WSDL requerida';
        }
      }
    }

    if (step === 3) {
      if (formData.businessTerms.defaultCommission.value <= 0) {
        newErrors.commission = 'Comisión debe ser mayor a 0';
      }
      if (formData.businessTerms.defaultCommission.value > 100 && 
          formData.businessTerms.defaultCommission.type === 'percentage') {
        newErrors.commission = 'Comisión porcentual no puede ser mayor a 100';
      }
    }

    if (step === 4) {
      if (!formData.contact.primaryName.trim()) {
        newErrors.contactName = 'Nombre de contacto requerido';
      }
      if (!formData.contact.primaryEmail.trim()) {
        newErrors.contactEmail = 'Email requerido';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact.primaryEmail)) {
        newErrors.contactEmail = 'Email inválido';
      }
      if (!formData.contact.primaryPhone.trim()) {
        newErrors.contactPhone = 'Teléfono requerido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error('Por favor completa todos los campos requeridos');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      await tourOperatorsService.createOperator(formData);
      toast.success('✅ Operador creado exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error creando operador');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <FiGlobe className="text-white text-2xl" />
              <h2 className="text-xl font-bold text-white">Crear Nuevo Operador Turístico</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <FiX className="text-white text-xl" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        currentStep >= step
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {currentStep > step ? <FiCheckCircle /> : step}
                    </div>
                    <span className="text-xs mt-1 text-gray-600">
                      {step === 1 && 'Básico'}
                      {step === 2 && 'API'}
                      {step === 3 && 'Negocio'}
                      {step === 4 && 'Contacto'}
                    </span>
                  </div>
                  {step < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiGlobe /> Información Básica
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre del Operador *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ej: eJuniper Tourism"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FiAlertCircle /> {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Código *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => updateFormData('code', e.target.value.toUpperCase())}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.code ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ej: EJUNIPER"
                    />
                    {errors.code && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FiAlertCircle /> {errors.code}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => updateFormData('businessName', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.businessName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ej: eJuniper Tourism Solutions S.A."
                  />
                  {errors.businessName && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <FiAlertCircle /> {errors.businessName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de Operador *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateFormData('type', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="receptive">Receptivo</option>
                      <option value="wholesaler">Mayorista</option>
                      <option value="dmc">DMC</option>
                      <option value="bedbank">Bed Bank</option>
                      <option value="aggregator">Agregador</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Relación Comercial *
                    </label>
                    <select
                      value={formData.relationship}
                      onChange={(e) => updateFormData('relationship', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="supplier">Proveedor (Compramos)</option>
                      <option value="buyer">Cliente (Vendemos)</option>
                      <option value="both">Ambos (B2B Bidireccional)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: API Configuration */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiServer /> Configuración de API
                </h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sistema API *
                  </label>
                  <select
                    value={formData.apiSystem.type}
                    onChange={(e) => updateFormData('apiSystem.type', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {apiSystemTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.apiSystem.type === 'eJuniper' && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Usuario *
                        </label>
                        <input
                          type="text"
                          value={formData.apiSystem.credentials.username}
                          onChange={(e) =>
                            updateFormData('apiSystem.credentials.username', e.target.value)
                          }
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.username ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.username && (
                          <p className="text-red-500 text-xs mt-1">
                            <FiAlertCircle className="inline" /> {errors.username}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contraseña *
                        </label>
                        <input
                          type="password"
                          value={formData.apiSystem.credentials.password}
                          onChange={(e) =>
                            updateFormData('apiSystem.credentials.password', e.target.value)
                          }
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.password && (
                          <p className="text-red-500 text-xs mt-1">
                            <FiAlertCircle className="inline" /> {errors.password}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Código de Agencia *
                        </label>
                        <input
                          type="text"
                          value={formData.apiSystem.credentials.agencyCode}
                          onChange={(e) =>
                            updateFormData('apiSystem.credentials.agencyCode', e.target.value)
                          }
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.agencyCode ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.agencyCode && (
                          <p className="text-red-500 text-xs mt-1">
                            <FiAlertCircle className="inline" /> {errors.agencyCode}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        URL WSDL *
                      </label>
                      <input
                        type="url"
                        value={formData.apiSystem.endpoints.wsdl}
                        onChange={(e) =>
                          updateFormData('apiSystem.endpoints.wsdl', e.target.value)
                        }
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.wsdl ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="https://api.example.com/service?wsdl"
                      />
                      {errors.wsdl && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <FiAlertCircle /> {errors.wsdl}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ambiente
                    </label>
                    <select
                      value={formData.apiSystem.config.environment}
                      onChange={(e) =>
                        updateFormData('apiSystem.config.environment', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sandbox">Sandbox (Pruebas)</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={formData.apiSystem.config.timeout}
                      onChange={(e) =>
                        updateFormData('apiSystem.config.timeout', parseInt(e.target.value))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reintentos
                    </label>
                    <input
                      type="number"
                      value={formData.apiSystem.config.retryAttempts}
                      onChange={(e) =>
                        updateFormData('apiSystem.config.retryAttempts', parseInt(e.target.value))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Business Terms */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiDollarSign /> Términos Comerciales
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de Comisión *
                    </label>
                    <select
                      value={formData.businessTerms.defaultCommission.type}
                      onChange={(e) =>
                        updateFormData('businessTerms.defaultCommission.type', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Valor de Comisión *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.businessTerms.defaultCommission.value}
                      onChange={(e) =>
                        updateFormData(
                          'businessTerms.defaultCommission.value',
                          parseFloat(e.target.value)
                        )
                      }
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.commission ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={
                        formData.businessTerms.defaultCommission.type === 'percentage'
                          ? '10'
                          : '50.00'
                      }
                    />
                    {errors.commission && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FiAlertCircle /> {errors.commission}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Moneda *
                    </label>
                    <select
                      value={formData.businessTerms.currency}
                      onChange={(e) => updateFormData('businessTerms.currency', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD - Dólar Estadounidense</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - Libra Esterlina</option>
                      <option value="MXN">MXN - Peso Mexicano</option>
                      <option value="COP">COP - Peso Colombiano</option>
                      <option value="ARS">ARS - Peso Argentino</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Comisión predeterminada:</strong>{' '}
                    {formData.businessTerms.defaultCommission.type === 'percentage'
                      ? `${formData.businessTerms.defaultCommission.value}%`
                      : `${formData.businessTerms.currency} ${formData.businessTerms.defaultCommission.value}`}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Esta comisión se aplicará por defecto a todas las reservas, pero puede ser
                    ajustada individualmente.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Contact Information */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiUser /> Información de Contacto
                </h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Contacto Principal *
                  </label>
                  <input
                    type="text"
                    value={formData.contact.primaryName}
                    onChange={(e) => updateFormData('contact.primaryName', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.contactName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Juan Pérez"
                  />
                  {errors.contactName && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <FiAlertCircle /> {errors.contactName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.contact.primaryEmail}
                      onChange={(e) => updateFormData('contact.primaryEmail', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="contacto@ejemplo.com"
                    />
                    {errors.contactEmail && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FiAlertCircle /> {errors.contactEmail}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={formData.contact.primaryPhone}
                      onChange={(e) => updateFormData('contact.primaryPhone', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.contactPhone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+1 234 567 8900"
                    />
                    {errors.contactPhone && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FiAlertCircle /> {errors.contactPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">📋 Resumen</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Operador:</span>
                      <span className="ml-2 font-semibold">{formData.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Código:</span>
                      <span className="ml-2 font-semibold">{formData.code}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sistema:</span>
                      <span className="ml-2 font-semibold">{formData.apiSystem.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Comisión:</span>
                      <span className="ml-2 font-semibold">
                        {formData.businessTerms.defaultCommission.type === 'percentage'
                          ? `${formData.businessTerms.defaultCommission.value}%`
                          : `${formData.businessTerms.currency} ${formData.businessTerms.defaultCommission.value}`}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-4 py-2 rounded-lg font-semibold ${
                currentStep === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Atrás
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <FiSave />
                  {loading ? 'Guardando...' : 'Crear Operador'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateOperatorModal;
