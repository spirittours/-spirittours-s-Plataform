import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaShoppingCart,
  FaTrash,
  FaPlus,
  FaMinus,
  FaTag,
  FaArrowRight,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaGift,
  FaPercent
} from 'react-icons/fa';

const BookingCart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    cartItems,
    cartCount,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyPromoCode,
    removePromoCode,
    getCartSummary,
    prepareCheckout,
    getRecommendedItems
  } = useCart();

  const [promoInput, setPromoInput] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const cartSummary = getCartSummary();
  const recommendedItems = getRecommendedItems();

  const handleQuantityChange = (itemId, newQuantity) => {
    const result = updateQuantity(itemId, newQuantity);
    if (result.success) {
      showMessage(result.message, 'success');
    }
  };

  const handleRemoveItem = (itemId, itemName) => {
    if (window.confirm(`¿Eliminar ${itemName} del carrito?`)) {
      const result = removeFromCart(itemId);
      if (result.success) {
        showMessage(result.message, 'success');
      }
    }
  };

  const handleClearCart = () => {
    if (window.confirm('¿Vaciar todo el carrito?')) {
      const result = clearCart();
      if (result.success) {
        showMessage(result.message, 'success');
      }
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    
    const result = await applyPromoCode(promoInput);
    if (result.success) {
      showMessage(result.message, 'success');
      setShowPromoInput(false);
      setPromoInput('');
    } else {
      showMessage(result.error, 'error');
    }
  };

  const handleRemovePromo = () => {
    const result = removePromoCode();
    if (result.success) {
      showMessage(result.message, 'success');
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      // Guardar intención de checkout y redirigir a login
      sessionStorage.setItem('checkoutIntent', 'true');
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    const result = await prepareCheckout();
    if (result.success) {
      navigate('/checkout');
    } else {
      showMessage(result.error || 'Error al procesar checkout', 'error');
    }
  };

  const handleAddRecommended = (item) => {
    const result = addToCart(item);
    if (result.success) {
      showMessage(`${item.name} agregado al carrito`, 'success');
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  if (cartCount === 0) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <FaShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Tu carrito está vacío</h2>
            <p className="text-gray-600 mb-8">
              Explora nuestras experiencias espirituales y agrega las que más te inspiren
            </p>
            <Link
              to="/search"
              className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              <FaArrowLeft />
              <span>Explorar Experiencias</span>
            </Link>
          </div>

          {/* Recomendaciones cuando el carrito está vacío */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Experiencias Populares</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedItems.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{item.image}</span>
                    <div>
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-indigo-600 font-bold">${item.price}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddRecommended(item)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                  >
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Carrito de Reservas</h1>

        {/* Mensajes */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {messageType === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
            <span>{message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start space-x-4">
                  {/* Imagen */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                      {item.image || '🎫'}
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                    {item.date && (
                      <p className="text-sm text-gray-500 mt-2">
                        📅 {new Date(item.date).toLocaleDateString('es-ES')}
                      </p>
                    )}
                    {item.location && (
                      <p className="text-sm text-gray-500">
                        📍 {item.location}
                      </p>
                    )}
                    
                    <div className="mt-4 flex items-center justify-between">
                      {/* Controles de cantidad */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
                          disabled={item.quantity <= 1}
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
                          disabled={item.quantity >= item.maxQuantity}
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>

                      {/* Precio */}
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Precio unitario: ${item.price}</p>
                        <p className="text-xl font-bold text-indigo-600">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={() => handleRemoveItem(item.id, item.name)}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}

            {/* Botón limpiar carrito */}
            <div className="flex justify-between items-center">
              <Link
                to="/search"
                className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition"
              >
                <FaArrowLeft />
                <span>Continuar Comprando</span>
              </Link>
              
              <button
                onClick={handleClearCart}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition"
              >
                <FaTrash />
                <span>Vaciar Carrito</span>
              </button>
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Resumen del Pedido</h2>

              {/* Código promocional */}
              <div className="mb-4">
                {cartSummary.promoCode ? (
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FaTag className="text-green-600" />
                      <span className="text-green-800 font-medium">
                        {cartSummary.promoCode} (-{cartSummary.discount}%)
                      </span>
                    </div>
                    <button
                      onClick={handleRemovePromo}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                ) : (
                  <div>
                    {showPromoInput ? (
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          placeholder="Código promocional"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={isLoading}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                          Aplicar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowPromoInput(true)}
                        className="w-full flex items-center justify-center space-x-2 text-indigo-600 hover:text-indigo-700 py-2 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
                      >
                        <FaTag />
                        <span>Agregar código promocional</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Desglose de precios */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cartCount} items)</span>
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
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-indigo-600">${cartSummary.total}</span>
                  </div>
                </div>
              </div>

              {/* Botón de checkout */}
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Proceder al Pago</span>
                    <FaArrowRight />
                  </>
                )}
              </button>

              {/* Información adicional */}
              <div className="mt-4 space-y-2 text-xs text-gray-500">
                <div className="flex items-start space-x-2">
                  <FaCheckCircle className="text-green-500 mt-0.5" />
                  <span>Cancelación gratuita hasta 24h antes</span>
                </div>
                <div className="flex items-start space-x-2">
                  <FaCheckCircle className="text-green-500 mt-0.5" />
                  <span>Pago seguro con encriptación SSL</span>
                </div>
                <div className="flex items-start space-x-2">
                  <FaCheckCircle className="text-green-500 mt-0.5" />
                  <span>Atención al cliente 24/7</span>
                </div>
              </div>
            </div>

            {/* Productos recomendados */}
            {recommendedItems.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold mb-3 flex items-center space-x-2">
                  <FaGift className="text-indigo-600" />
                  <span>Completa tu experiencia</span>
                </h3>
                <div className="space-y-3">
                  {recommendedItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{item.image}</span>
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-indigo-600 font-bold">${item.price}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddRecommended(item)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        + Agregar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCart;