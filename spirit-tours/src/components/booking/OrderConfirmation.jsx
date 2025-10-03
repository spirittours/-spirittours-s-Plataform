import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaCheckCircle,
  FaCalendar,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaUser,
  FaCreditCard,
  FaDownload,
  FaPrint,
  FaShare,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaArrowLeft,
  FaArrowRight,
  FaInfoCircle,
  FaQuestionCircle,
  FaClock,
  FaTicketAlt,
  FaQrcode,
  FaStar
} from 'react-icons/fa';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    // Intentar cargar datos de la orden desde sessionStorage
    const lastOrder = sessionStorage.getItem('lastOrder');
    if (lastOrder) {
      const order = JSON.parse(lastOrder);
      if (order.orderId === orderId) {
        setOrderData(order);
      }
    }
    
    // En producción, cargarías los datos desde el backend
    // fetchOrderDetails(orderId);
    
    // Simular carga
    setTimeout(() => {
      if (!orderData) {
        // Datos de prueba si no hay orden en sessionStorage
        setOrderData({
          orderId: orderId,
          customer: {
            firstName: user?.firstName || 'Juan',
            lastName: user?.lastName || 'Pérez',
            email: user?.email || 'juan@email.com',
            phone: '+1234567890'
          },
          items: [
            {
              id: 1,
              name: 'Retiro de Meditación en Machu Picchu',
              date: '2024-03-15',
              location: 'Cusco, Perú',
              quantity: 2,
              price: 299
            }
          ],
          summary: {
            subtotal: '598.00',
            taxes: '53.82',
            total: '651.82'
          },
          payment: {
            method: 'card',
            card: {
              last4: '4242',
              brand: 'visa'
            }
          },
          timestamp: new Date().toISOString()
        });
      }
      setIsLoading(false);
    }, 1000);
  }, [orderId, user]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // En producción, generarías un PDF real
    alert('Descargando PDF de confirmación...');
  };

  const handleShare = (platform) => {
    const shareText = `¡Acabo de reservar una experiencia espiritual increíble con Spirit Tours! Orden #${orderId}`;
    const shareUrl = window.location.href;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`);
        break;
      case 'email':
        window.location.href = `mailto:?subject=Mi reserva en Spirit Tours&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
        break;
    }
    setShowShareMenu(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando confirmación...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaInfoCircle className="text-6xl text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Orden no encontrada</h2>
          <p className="text-gray-600 mb-6">No pudimos encontrar la orden #{orderId}</p>
          <Link
            to="/dashboard"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition inline-flex items-center space-x-2"
          >
            <FaArrowLeft />
            <span>Ir al Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Encabezado de éxito */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center">
            <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ¡Reserva Confirmada!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Tu experiencia espiritual te está esperando
            </p>
            
            {/* Número de orden destacado */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 inline-block">
              <p className="text-sm text-gray-600 mb-1">Número de confirmación:</p>
              <p className="text-2xl font-bold text-green-700">{orderData.orderId}</p>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <FaPrint />
                <span>Imprimir</span>
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <FaDownload />
                <span>Descargar PDF</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <FaShare />
                  <span>Compartir</span>
                </button>
                
                {showShareMenu && (
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg py-2 z-10 min-w-[150px]">
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 w-full text-left"
                    >
                      <FaWhatsapp className="text-green-500" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 w-full text-left"
                    >
                      <FaFacebook className="text-blue-600" />
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 w-full text-left"
                    >
                      <FaTwitter className="text-blue-400" />
                      <span>Twitter</span>
                    </button>
                    <button
                      onClick={() => handleShare('email')}
                      className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 w-full text-left"
                    >
                      <FaEnvelope className="text-gray-600" />
                      <span>Email</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Detalles de la reserva */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                  <FaTicketAlt className="text-indigo-600" />
                  <span>Detalles de tu Experiencia</span>
                </h2>
                
                {orderData.items.map((item, index) => (
                  <div key={index} className="border-b pb-4 mb-4 last:border-0">
                    <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <FaCalendar className="text-indigo-500" />
                        <span>
                          {new Date(item.date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <FaMapMarkerAlt className="text-red-500" />
                        <span>{item.location}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <FaUser className="text-blue-500" />
                        <span>{item.quantity} {item.quantity > 1 ? 'personas' : 'persona'}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <FaCreditCard className="text-green-500" />
                        <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Código QR simulado */}
                <div className="mt-4 pt-4 border-t text-center">
                  <div className="inline-block p-4 bg-gray-100 rounded-lg">
                    <FaQrcode className="text-6xl text-gray-700" />
                    <p className="text-xs text-gray-500 mt-2">Código QR de tu reserva</p>
                  </div>
                </div>
              </div>

              {/* Información del cliente */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Información de Contacto</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Nombre completo</p>
                    <p className="font-medium flex items-center space-x-2">
                      <FaUser className="text-gray-400" />
                      <span>{orderData.customer.firstName} {orderData.customer.lastName}</span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="font-medium flex items-center space-x-2">
                      <FaEnvelope className="text-gray-400" />
                      <span>{orderData.customer.email}</span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Teléfono</p>
                    <p className="font-medium flex items-center space-x-2">
                      <FaPhone className="text-gray-400" />
                      <span>{orderData.customer.phone}</span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Fecha de reserva</p>
                    <p className="font-medium flex items-center space-x-2">
                      <FaClock className="text-gray-400" />
                      <span>
                        {new Date(orderData.timestamp).toLocaleDateString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Próximos pasos */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                  <FaInfoCircle className="text-blue-600" />
                  <span>Próximos Pasos</span>
                </h2>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-semibold">Confirmación por email</p>
                      <p className="text-sm text-gray-600">
                        Recibirás un email con todos los detalles de tu reserva en los próximos minutos
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">
                      2
                    </div>
                    <div>
                      <p className="font-semibold">Preparación</p>
                      <p className="text-sm text-gray-600">
                        24 horas antes recibirás información detallada sobre el punto de encuentro y recomendaciones
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-semibold">Día de la experiencia</p>
                      <p className="text-sm text-gray-600">
                        Presenta tu código QR o número de confirmación en el punto de encuentro
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">
                      4
                    </div>
                    <div>
                      <p className="font-semibold">Comparte tu experiencia</p>
                      <p className="text-sm text-gray-600">
                        Después de tu experiencia, nos encantaría conocer tu opinión
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna lateral */}
            <div className="space-y-6">
              {/* Resumen del pago */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4">Resumen del Pago</h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${orderData.summary.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Impuestos</span>
                    <span>${orderData.summary.taxes}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Pagado</span>
                      <span className="text-green-600">${orderData.summary.total}</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Método de pago:</p>
                  {orderData.payment.method === 'card' && (
                    <div className="flex items-center space-x-2">
                      <FaCreditCard className="text-gray-600" />
                      <span className="font-medium">
                        {orderData.payment.card.brand.toUpperCase()} ****{orderData.payment.card.last4}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Políticas */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4">Políticas Importantes</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Cancelación gratuita</p>
                    <p className="text-gray-600">
                      Hasta 24 horas antes del inicio de la experiencia
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-gray-700">Modificaciones</p>
                    <p className="text-gray-600">
                      Puedes modificar fecha y hora según disponibilidad
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-gray-700">Reembolso</p>
                    <p className="text-gray-600">
                      100% si cancelas con 24h de anticipación
                    </p>
                  </div>
                </div>
              </div>

              {/* Ayuda */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4">¿Necesitas Ayuda?</h3>
                
                <div className="space-y-3">
                  <a
                    href="/help"
                    className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700"
                  >
                    <FaQuestionCircle />
                    <span>Centro de Ayuda</span>
                  </a>
                  
                  <a
                    href="mailto:support@spirittours.com"
                    className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700"
                  >
                    <FaEnvelope />
                    <span>support@spirittours.com</span>
                  </a>
                  
                  <a
                    href="tel:+1234567890"
                    className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700"
                  >
                    <FaPhone />
                    <span>+1 (234) 567-890</span>
                  </a>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Atención al cliente disponible 24/7 para cualquier consulta sobre tu experiencia
                  </p>
                </div>
              </div>

              {/* Calificar experiencia */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                <h3 className="text-lg font-bold mb-3">¡Esperamos que disfrutes!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Después de tu experiencia, nos encantaría conocer tu opinión
                </p>
                <div className="flex justify-center space-x-1 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <FaStar key={star} className="text-2xl text-gray-300" />
                  ))}
                </div>
                <button className="w-full bg-white text-indigo-600 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition text-sm font-medium">
                  Recordarme después
                </button>
              </div>
            </div>
          </div>

          {/* Botones de navegación */}
          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <Link
              to="/dashboard"
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              <FaArrowLeft />
              <span>Ir al Dashboard</span>
            </Link>
            
            <Link
              to="/search"
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <span>Explorar Más Experiencias</span>
              <FaArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;