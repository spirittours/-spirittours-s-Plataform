import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaCreditCard,
  FaPaypal,
  FaLock,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCity,
  FaGlobe,
  FaCalendar,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaArrowLeft,
  FaArrowRight,
  FaInfoCircle,
  FaGooglePay,
  FaApple,
  FaBitcoin,
  FaUniversity
} from 'react-icons/fa';
import { SiStripe, SiVisa, SiMastercard, SiAmericanexpress, SiDiscover } from 'react-icons/si';

const CheckoutProcess = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, getCartSummary, clearCart, prepareCheckout } = useCart();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    // Información personal
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    
    // Dirección de facturación
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    },
    
    // Método de pago
    paymentMethod: 'card',
    
    // Información de tarjeta
    cardInfo: {
      number: '',
      name: '',
      expMonth: '',
      expYear: '',
      cvv: ''
    },
    
    // PayPal
    paypalEmail: '',
    
    // Crypto
    cryptoWallet: '',
    cryptoType: 'BTC',
    
    // Transferencia bancaria
    bankAccount: '',
    
    // Opciones adicionales
    newsletter: false,
    savePaymentInfo: false,
    termsAccepted: false,
    
    // Notas especiales
    specialRequests: ''
  });
  
  const cartSummary = getCartSummary();
  const steps = [
    { id: 1, name: 'Información Personal', icon: FaUser },
    { id: 2, name: 'Método de Pago', icon: FaCreditCard },
    { id: 3, name: 'Revisión', icon: FaCheckCircle },
    { id: 4, name: 'Confirmación', icon: FaShieldAlt }
  ];
  
  useEffect(() => {
    // Verificar que hay items en el carrito
    if (!cartItems || cartItems.length === 0) {
      navigate('/cart');
      return;
    }
    
    // Verificar autenticación
    if (!user) {
      sessionStorage.setItem('checkoutIntent', 'true');
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [cartItems, user, navigate]);
  
  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        // Validar información personal
        if (!formData.firstName.trim()) newErrors.firstName = 'Nombre requerido';
        if (!formData.lastName.trim()) newErrors.lastName = 'Apellido requerido';
        if (!formData.email.trim()) newErrors.email = 'Email requerido';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
        if (!formData.phone.trim()) newErrors.phone = 'Teléfono requerido';
        
        // Validar dirección
        if (!formData.billingAddress.street.trim()) newErrors['billingAddress.street'] = 'Dirección requerida';
        if (!formData.billingAddress.city.trim()) newErrors['billingAddress.city'] = 'Ciudad requerida';
        if (!formData.billingAddress.state.trim()) newErrors['billingAddress.state'] = 'Estado requerido';
        if (!formData.billingAddress.zipCode.trim()) newErrors['billingAddress.zipCode'] = 'Código postal requerido';
        break;
        
      case 2:
        // Validar método de pago
        if (formData.paymentMethod === 'card') {
          if (!formData.cardInfo.number.trim()) newErrors['cardInfo.number'] = 'Número de tarjeta requerido';
          else if (!validateCardNumber(formData.cardInfo.number)) newErrors['cardInfo.number'] = 'Número de tarjeta inválido';
          if (!formData.cardInfo.name.trim()) newErrors['cardInfo.name'] = 'Nombre del titular requerido';
          if (!formData.cardInfo.expMonth) newErrors['cardInfo.expMonth'] = 'Mes de expiración requerido';
          if (!formData.cardInfo.expYear) newErrors['cardInfo.expYear'] = 'Año de expiración requerido';
          if (!formData.cardInfo.cvv.trim()) newErrors['cardInfo.cvv'] = 'CVV requerido';
          else if (!/^\d{3,4}$/.test(formData.cardInfo.cvv)) newErrors['cardInfo.cvv'] = 'CVV inválido';
        } else if (formData.paymentMethod === 'paypal') {
          if (!formData.paypalEmail.trim()) newErrors.paypalEmail = 'Email de PayPal requerido';
          else if (!/\S+@\S+\.\S+/.test(formData.paypalEmail)) newErrors.paypalEmail = 'Email inválido';
        } else if (formData.paymentMethod === 'crypto') {
          if (!formData.cryptoWallet.trim()) newErrors.cryptoWallet = 'Dirección de wallet requerida';
        } else if (formData.paymentMethod === 'bank') {
          if (!formData.bankAccount.trim()) newErrors.bankAccount = 'Información bancaria requerida';
        }
        break;
        
      case 3:
        // Validar términos y condiciones
        if (!formData.termsAccepted) newErrors.termsAccepted = 'Debes aceptar los términos y condiciones';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateCardNumber = (number) => {
    // Algoritmo de Luhn básico
    const cleaned = number.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;
    
    let sum = 0;
    let isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  };
  
  const getCardType = (number) => {
    const cleaned = number.replace(/\s+/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6/.test(cleaned)) return 'discover';
    return 'unknown';
  };
  
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmitOrder();
      }
    }
  };
  
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSubmitOrder = async () => {
    setIsProcessing(true);
    setMessage({ text: '', type: '' });
    
    try {
      // Preparar datos de la orden
      const orderData = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        billing: formData.billingAddress,
        payment: {
          method: formData.paymentMethod,
          ...(formData.paymentMethod === 'card' && {
            card: {
              last4: formData.cardInfo.number.slice(-4),
              brand: getCardType(formData.cardInfo.number)
            }
          }),
          ...(formData.paymentMethod === 'paypal' && {
            paypalEmail: formData.paypalEmail
          }),
          ...(formData.paymentMethod === 'crypto' && {
            cryptoWallet: formData.cryptoWallet,
            cryptoType: formData.cryptoType
          }),
          ...(formData.paymentMethod === 'bank' && {
            bankAccount: formData.bankAccount
          })
        },
        items: cartItems,
        summary: cartSummary,
        specialRequests: formData.specialRequests,
        newsletter: formData.newsletter,
        timestamp: new Date().toISOString()
      };
      
      // Simular procesamiento del pago
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Aquí integrarías con el backend real
      // const response = await fetch('/api/orders', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(orderData)
      // });
      
      // Simular respuesta exitosa
      const mockOrderId = 'ORD-' + Date.now();
      
      // Limpiar carrito
      clearCart();
      
      // Guardar información de la orden en sessionStorage
      sessionStorage.setItem('lastOrder', JSON.stringify({
        orderId: mockOrderId,
        ...orderData
      }));
      
      // Mostrar confirmación
      setCurrentStep(4);
      setMessage({
        text: '¡Orden procesada exitosamente!',
        type: 'success'
      });
      
      // Redirigir a confirmación después de 3 segundos
      setTimeout(() => {
        navigate(`/order-confirmation/${mockOrderId}`);
      }, 3000);
      
    } catch (error) {
      console.error('Error processing order:', error);
      setMessage({
        text: 'Error al procesar la orden. Por favor intenta nuevamente.',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : isCompleted 
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? <FaCheckCircle /> : <Icon />}
                </div>
                <span className={`text-sm mt-2 ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-gray-500'
                }`}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 ${
                  step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
  
  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Información Personal</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.firstName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FaEnvelope className="inline mr-1" />
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FaPhone className="inline mr-1" />
            Teléfono *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>
      </div>
      
      <div className="border-t pt-6">
        <h3 className="text-xl font-semibold mb-4">Dirección de Facturación</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FaMapMarkerAlt className="inline mr-1" />
              Dirección *
            </label>
            <input
              type="text"
              value={formData.billingAddress.street}
              onChange={(e) => handleInputChange('billingAddress.street', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors['billingAddress.street'] ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Calle y número"
            />
            {errors['billingAddress.street'] && (
              <p className="text-red-500 text-sm mt-1">{errors['billingAddress.street']}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaCity className="inline mr-1" />
                Ciudad *
              </label>
              <input
                type="text"
                value={formData.billingAddress.city}
                onChange={(e) => handleInputChange('billingAddress.city', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors['billingAddress.city'] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors['billingAddress.city'] && (
                <p className="text-red-500 text-sm mt-1">{errors['billingAddress.city']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado/Provincia *
              </label>
              <input
                type="text"
                value={formData.billingAddress.state}
                onChange={(e) => handleInputChange('billingAddress.state', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors['billingAddress.state'] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors['billingAddress.state'] && (
                <p className="text-red-500 text-sm mt-1">{errors['billingAddress.state']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Postal *
              </label>
              <input
                type="text"
                value={formData.billingAddress.zipCode}
                onChange={(e) => handleInputChange('billingAddress.zipCode', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors['billingAddress.zipCode'] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors['billingAddress.zipCode'] && (
                <p className="text-red-500 text-sm mt-1">{errors['billingAddress.zipCode']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaGlobe className="inline mr-1" />
                País *
              </label>
              <select
                value={formData.billingAddress.country}
                onChange={(e) => handleInputChange('billingAddress.country', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USA">Estados Unidos</option>
                <option value="MEX">México</option>
                <option value="ESP">España</option>
                <option value="ARG">Argentina</option>
                <option value="COL">Colombia</option>
                <option value="CHI">Chile</option>
                <option value="PER">Perú</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.newsletter}
            onChange={(e) => handleInputChange('newsletter', e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">
            Quiero recibir ofertas especiales y noticias sobre experiencias espirituales
          </span>
        </label>
      </div>
    </div>
  );
  
  const renderPaymentInfo = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Método de Pago</h2>
      
      {/* Selector de método de pago */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => handleInputChange('paymentMethod', 'card')}
          className={`p-4 border-2 rounded-lg text-center transition ${
            formData.paymentMethod === 'card'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FaCreditCard className="text-2xl mx-auto mb-2" />
          <span className="text-sm">Tarjeta</span>
        </button>
        
        <button
          onClick={() => handleInputChange('paymentMethod', 'paypal')}
          className={`p-4 border-2 rounded-lg text-center transition ${
            formData.paymentMethod === 'paypal'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FaPaypal className="text-2xl mx-auto mb-2 text-blue-600" />
          <span className="text-sm">PayPal</span>
        </button>
        
        <button
          onClick={() => handleInputChange('paymentMethod', 'crypto')}
          className={`p-4 border-2 rounded-lg text-center transition ${
            formData.paymentMethod === 'crypto'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FaBitcoin className="text-2xl mx-auto mb-2 text-orange-500" />
          <span className="text-sm">Crypto</span>
        </button>
        
        <button
          onClick={() => handleInputChange('paymentMethod', 'bank')}
          className={`p-4 border-2 rounded-lg text-center transition ${
            formData.paymentMethod === 'bank'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FaUniversity className="text-2xl mx-auto mb-2" />
          <span className="text-sm">Transferencia</span>
        </button>
      </div>
      
      {/* Formulario según método de pago */}
      {formData.paymentMethod === 'card' && (
        <div className="space-y-4">
          {/* Tarjetas aceptadas */}
          <div className="flex items-center space-x-2 text-gray-500 mb-4">
            <span className="text-sm">Aceptamos:</span>
            <SiVisa className="text-2xl" />
            <SiMastercard className="text-2xl" />
            <SiAmericanexpress className="text-2xl" />
            <SiDiscover className="text-2xl" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Tarjeta *
            </label>
            <input
              type="text"
              value={formData.cardInfo.number}
              onChange={(e) => handleInputChange('cardInfo.number', formatCardNumber(e.target.value))}
              maxLength="19"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors['cardInfo.number'] ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="1234 5678 9012 3456"
            />
            {errors['cardInfo.number'] && (
              <p className="text-red-500 text-sm mt-1">{errors['cardInfo.number']}</p>
            )}
            {formData.cardInfo.number && (
              <p className="text-sm text-gray-500 mt-1">
                Tipo de tarjeta: {getCardType(formData.cardInfo.number)}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Titular *
            </label>
            <input
              type="text"
              value={formData.cardInfo.name}
              onChange={(e) => handleInputChange('cardInfo.name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors['cardInfo.name'] ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Como aparece en la tarjeta"
            />
            {errors['cardInfo.name'] && (
              <p className="text-red-500 text-sm mt-1">{errors['cardInfo.name']}</p>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes *
              </label>
              <select
                value={formData.cardInfo.expMonth}
                onChange={(e) => handleInputChange('cardInfo.expMonth', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors['cardInfo.expMonth'] ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">MM</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
              {errors['cardInfo.expMonth'] && (
                <p className="text-red-500 text-sm mt-1">{errors['cardInfo.expMonth']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año *
              </label>
              <select
                value={formData.cardInfo.expYear}
                onChange={(e) => handleInputChange('cardInfo.expYear', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors['cardInfo.expYear'] ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">YYYY</option>
                {[...Array(10)].map((_, i) => {
                  const year = new Date().getFullYear() + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
              {errors['cardInfo.expYear'] && (
                <p className="text-red-500 text-sm mt-1">{errors['cardInfo.expYear']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVV *
              </label>
              <input
                type="text"
                value={formData.cardInfo.cvv}
                onChange={(e) => handleInputChange('cardInfo.cvv', e.target.value)}
                maxLength="4"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors['cardInfo.cvv'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="123"
              />
              {errors['cardInfo.cvv'] && (
                <p className="text-red-500 text-sm mt-1">{errors['cardInfo.cvv']}</p>
              )}
            </div>
          </div>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.savePaymentInfo}
              onChange={(e) => handleInputChange('savePaymentInfo', e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Guardar información de pago para futuras compras
            </span>
          </label>
        </div>
      )}
      
      {formData.paymentMethod === 'paypal' && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-4">
              Serás redirigido a PayPal para completar el pago de forma segura
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de PayPal *
              </label>
              <input
                type="email"
                value={formData.paypalEmail}
                onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.paypalEmail ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="tu@email.com"
              />
              {errors.paypalEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.paypalEmail}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {formData.paymentMethod === 'crypto' && (
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-4">
              Acepta pagos en Bitcoin, Ethereum y otras criptomonedas principales
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Criptomoneda *
              </label>
              <select
                value={formData.cryptoType}
                onChange={(e) => handleInputChange('cryptoType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
                <option value="BNB">Binance Coin (BNB)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección de Wallet *
              </label>
              <input
                type="text"
                value={formData.cryptoWallet}
                onChange={(e) => handleInputChange('cryptoWallet', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.cryptoWallet ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Dirección de tu wallet"
              />
              {errors.cryptoWallet && (
                <p className="text-red-500 text-sm mt-1">{errors.cryptoWallet}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {formData.paymentMethod === 'bank' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-4">
              Recibirás los datos bancarios para realizar la transferencia después de confirmar tu pedido
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Información de Cuenta Bancaria *
              </label>
              <textarea
                value={formData.bankAccount}
                onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.bankAccount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nombre del banco y últimos 4 dígitos de la cuenta desde la cual realizarás la transferencia"
              />
              {errors.bankAccount && (
                <p className="text-red-500 text-sm mt-1">{errors.bankAccount}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Información de seguridad */}
      <div className="bg-gray-50 p-4 rounded-lg mt-6">
        <div className="flex items-start space-x-3">
          <FaLock className="text-green-600 mt-1" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Pago 100% Seguro</p>
            <p>
              Tu información de pago está protegida con encriptación SSL de 256 bits.
              Nunca almacenamos los detalles completos de tu tarjeta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Revisar y Confirmar</h2>
      
      {/* Resumen del pedido */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Resumen del Pedido</h3>
        <div className="space-y-3">
          {cartItems.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
              </div>
              <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          
          <div className="pt-3 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${cartSummary.subtotal}</span>
            </div>
            {cartSummary.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento ({cartSummary.discount}%)</span>
                <span>-${cartSummary.discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Impuestos</span>
              <span>${cartSummary.taxes}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-indigo-600">${cartSummary.total}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Información del cliente */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Información de Contacto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Nombre</p>
            <p className="font-medium">{formData.firstName} {formData.lastName}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium">{formData.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Teléfono</p>
            <p className="font-medium">{formData.phone}</p>
          </div>
          <div>
            <p className="text-gray-500">Dirección</p>
            <p className="font-medium">
              {formData.billingAddress.street}, {formData.billingAddress.city}, 
              {formData.billingAddress.state} {formData.billingAddress.zipCode}
            </p>
          </div>
        </div>
      </div>
      
      {/* Método de pago */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Método de Pago</h3>
        <div className="flex items-center space-x-3">
          {formData.paymentMethod === 'card' && (
            <>
              <FaCreditCard className="text-2xl text-gray-600" />
              <div>
                <p className="font-medium">
                  Tarjeta terminada en {formData.cardInfo.number.slice(-4)}
                </p>
                <p className="text-sm text-gray-500">
                  {getCardType(formData.cardInfo.number).toUpperCase()}
                </p>
              </div>
            </>
          )}
          {formData.paymentMethod === 'paypal' && (
            <>
              <FaPaypal className="text-2xl text-blue-600" />
              <div>
                <p className="font-medium">PayPal</p>
                <p className="text-sm text-gray-500">{formData.paypalEmail}</p>
              </div>
            </>
          )}
          {formData.paymentMethod === 'crypto' && (
            <>
              <FaBitcoin className="text-2xl text-orange-500" />
              <div>
                <p className="font-medium">{formData.cryptoType}</p>
                <p className="text-sm text-gray-500">
                  Wallet: ...{formData.cryptoWallet.slice(-8)}
                </p>
              </div>
            </>
          )}
          {formData.paymentMethod === 'bank' && (
            <>
              <FaUniversity className="text-2xl text-gray-600" />
              <div>
                <p className="font-medium">Transferencia Bancaria</p>
                <p className="text-sm text-gray-500">Pendiente de pago</p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Notas especiales */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Solicitudes Especiales</h3>
        <textarea
          value={formData.specialRequests}
          onChange={(e) => handleInputChange('specialRequests', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="¿Alguna solicitud especial para tu experiencia?"
        />
      </div>
      
      {/* Términos y condiciones */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
            className="w-4 h-4 mt-1 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <div>
            <span className="text-sm text-gray-700">
              He leído y acepto los{' '}
              <a href="#" className="text-indigo-600 hover:underline">
                términos y condiciones
              </a>
              {' '}y la{' '}
              <a href="#" className="text-indigo-600 hover:underline">
                política de privacidad
              </a>
              {' '}*
            </span>
            {errors.termsAccepted && (
              <p className="text-red-500 text-sm mt-1">{errors.termsAccepted}</p>
            )}
          </div>
        </label>
      </div>
    </div>
  );
  
  const renderConfirmation = () => (
    <div className="text-center py-12">
      <div className="mb-8">
        <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          ¡Orden Confirmada!
        </h2>
        <p className="text-lg text-gray-600">
          Tu reserva ha sido procesada exitosamente
        </p>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto mb-8">
        <p className="text-sm text-gray-700 mb-2">Número de orden:</p>
        <p className="text-2xl font-bold text-green-700">
          {sessionStorage.getItem('lastOrder') 
            ? JSON.parse(sessionStorage.getItem('lastOrder')).orderId 
            : 'ORD-' + Date.now()}
        </p>
      </div>
      
      <div className="space-y-4 max-w-md mx-auto text-left">
        <div className="flex items-start space-x-3">
          <FaCheckCircle className="text-green-500 mt-1" />
          <div>
            <p className="font-semibold">Confirmación enviada</p>
            <p className="text-sm text-gray-600">
              Hemos enviado los detalles de tu reserva a {formData.email}
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <FaCalendar className="text-blue-500 mt-1" />
          <div>
            <p className="font-semibold">Próximos pasos</p>
            <p className="text-sm text-gray-600">
              Recibirás un recordatorio 24 horas antes de tu experiencia
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <FaInfoCircle className="text-indigo-500 mt-1" />
          <div>
            <p className="font-semibold">¿Necesitas ayuda?</p>
            <p className="text-sm text-gray-600">
              Contacta a nuestro equipo de soporte 24/7
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <button
          onClick={() => navigate('/my-bookings')}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
        >
          Ver Mis Reservas
        </button>
      </div>
    </div>
  );
  
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>No hay items en el carrito</p>
          <button
            onClick={() => navigate('/search')}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Explorar Experiencias
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Indicador de pasos */}
          {renderStepIndicator()}
          
          {/* Mensajes */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
              <span>{message.text}</span>
            </div>
          )}
          
          {/* Contenido del paso actual */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            {currentStep === 1 && renderPersonalInfo()}
            {currentStep === 2 && renderPaymentInfo()}
            {currentStep === 3 && renderReview()}
            {currentStep === 4 && renderConfirmation()}
          </div>
          
          {/* Botones de navegación */}
          {currentStep < 4 && (
            <div className="flex justify-between">
              <button
                onClick={handlePreviousStep}
                disabled={currentStep === 1 || isProcessing}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaArrowLeft />
                <span>Anterior</span>
              </button>
              
              <button
                onClick={handleNextStep}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : currentStep === 3 ? (
                  <>
                    <FaLock />
                    <span>Confirmar y Pagar</span>
                  </>
                ) : (
                  <>
                    <span>Siguiente</span>
                    <FaArrowRight />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutProcess;