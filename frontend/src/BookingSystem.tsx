import React, { useState, useEffect } from 'react';

// Types
interface TourProduct {
  product_id: string;
  name: string;
  description: string;
  tour_type: string;
  destination: string;
  duration_hours: number;
  base_price: number;
  min_price: number;
  currency: string;
  max_participants: number;
  included_services: string[];
  meeting_point: string;
  pickup_available: boolean;
  cancellation_hours: number;
  languages: string[];
  difficulty_level: string;
  tags: string[];
  rating: number;
  review_count: number;
  available_slots: number;
  next_available_date: string;
}

interface AvailabilitySlot {
  slot_id: string;
  time: string;
  available_spots: number;
  total_spots: number;
  price: number;
  currency: string;
  special_offer?: string;
  guide_assigned: boolean;
}

interface DateAvailability {
  date: string;
  slots: AvailabilitySlot[];
}

interface CartItem {
  cart_item_id: string;
  product_id: string;
  product_name: string;
  slot_id: string;
  date: string;
  time: string;
  participants: number;
  unit_price: number;
  total_price: number;
  currency: string;
}

interface ShoppingCart {
  cart_id: string;
  customer_id: string;
  items: CartItem[];
  subtotal: number;
  taxes: number;
  discounts: number;
  total: number;
  currency: string;
  coupon_code?: string;
  items_count: number;
  total_participants: number;
  expires_at: string;
}

const BookingSystem: React.FC = () => {
  // State management
  const [currentStep, setCurrentStep] = useState<'search' | 'availability' | 'cart' | 'checkout' | 'confirmation'>('search');
  const [searchParams, setSearchParams] = useState({
    destination: 'Madrid',
    participants: 2,
    date: '',
    tourType: '',
    maxPrice: ''
  });
  const [searchResults, setSearchResults] = useState<TourProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);
  const [availability, setAvailability] = useState<DateAvailability[]>([]);
  const [cart, setCart] = useState<ShoppingCart | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: 'ES',
    language: 'es'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);

  // Mock API calls (replace with actual API endpoints)
  const searchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResults: TourProduct[] = [
        {
          product_id: 'madrid_city_001',
          name: 'Madrid City Tour Completo',
          description: 'Tour completo por los principales atractivos de Madrid: Prado, Retiro, Palacio Real, y centro histórico.',
          tour_type: 'city_tour',
          destination: 'Madrid',
          duration_hours: 6,
          base_price: 75.00,
          min_price: 71.25,
          currency: 'EUR',
          max_participants: 15,
          included_services: ['Guía certificado', 'Transporte', 'Entradas museos', 'Snack'],
          meeting_point: 'Puerta del Sol',
          pickup_available: true,
          cancellation_hours: 24,
          languages: ['es', 'en', 'fr'],
          difficulty_level: 'easy',
          tags: ['madrid', 'cultura', 'historia', 'museos', 'ciudad'],
          rating: 4.8,
          review_count: 234,
          available_slots: 12,
          next_available_date: new Date(Date.now() + 86400000).toISOString()
        },
        {
          product_id: 'flamenco_exp_002',
          name: 'Experiencia Flamenco Auténtica',
          description: 'Noche de flamenco en tablao tradicional con cena incluida. Espectáculo de 2 horas con artistas de primera línea.',
          tour_type: 'cultural',
          destination: 'Madrid',
          duration_hours: 4,
          base_price: 95.00,
          min_price: 90.25,
          currency: 'EUR',
          max_participants: 25,
          included_services: ['Espectáculo flamenco', 'Cena 3 platos', 'Copa de bienvenida'],
          meeting_point: 'Tablao Villa Rosa',
          pickup_available: false,
          cancellation_hours: 48,
          languages: ['es', 'en'],
          difficulty_level: 'easy',
          tags: ['flamenco', 'cultura', 'cena', 'espectáculo', 'tradición'],
          rating: 4.9,
          review_count: 189,
          available_slots: 8,
          next_available_date: new Date(Date.now() + 86400000).toISOString()
        }
      ];
      
      setSearchResults(mockResults);
    } catch (err) {
      setError('Error al buscar productos. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailability = async (productId: string) => {
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockAvailability: DateAvailability[] = [
        {
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          slots: [
            {
              slot_id: `${productId}_${Date.now()}_1`,
              time: '09:00',
              available_spots: 12,
              total_spots: 15,
              price: 75.00,
              currency: 'EUR',
              guide_assigned: true
            },
            {
              slot_id: `${productId}_${Date.now()}_2`,
              time: '14:00',
              available_spots: 8,
              total_spots: 15,
              price: 82.50,
              currency: 'EUR',
              special_offer: 'Precio Premium - Guía Especializado',
              guide_assigned: true
            }
          ]
        },
        {
          date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          slots: [
            {
              slot_id: `${productId}_${Date.now()}_3`,
              time: '09:00',
              available_spots: 15,
              total_spots: 15,
              price: 71.25,
              currency: 'EUR',
              special_offer: 'Early Bird - 5% Descuento',
              guide_assigned: true
            }
          ]
        }
      ];
      
      setAvailability(mockAvailability);
    } catch (err) {
      setError('Error al obtener disponibilidad.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (slot: AvailabilitySlot) => {
    setLoading(true);
    
    try {
      // Simulate creating customer and cart if needed
      if (!cart) {
        const mockCart: ShoppingCart = {
          cart_id: 'cart_' + Date.now(),
          customer_id: 'customer_' + Date.now(),
          items: [],
          subtotal: 0,
          taxes: 0,
          discounts: 0,
          total: 0,
          currency: 'EUR',
          items_count: 0,
          total_participants: 0,
          expires_at: new Date(Date.now() + 3600000).toISOString()
        };
        setCart(mockCart);
      }
      
      // Add item to cart
      const cartItem: CartItem = {
        cart_item_id: 'item_' + Date.now(),
        product_id: selectedProduct!.product_id,
        product_name: selectedProduct!.name,
        slot_id: slot.slot_id,
        date: availability.find(d => d.slots.includes(slot))!.date,
        time: slot.time,
        participants: searchParams.participants,
        unit_price: slot.price,
        total_price: slot.price * searchParams.participants,
        currency: slot.currency
      };
      
      const subtotal = cartItem.total_price;
      const taxes = subtotal * 0.21; // 21% IVA
      const total = subtotal + taxes;
      
      const updatedCart: ShoppingCart = {
        ...cart!,
        items: [...(cart?.items || []), cartItem],
        subtotal: (cart?.subtotal || 0) + subtotal,
        taxes: (cart?.taxes || 0) + taxes,
        total: (cart?.total || 0) + total,
        items_count: (cart?.items_count || 0) + 1,
        total_participants: (cart?.total_participants || 0) + searchParams.participants
      };
      
      setCart(updatedCart);
      setCurrentStep('cart');
      
    } catch (err) {
      setError('Error al añadir al carrito.');
    } finally {
      setLoading(false);
    }
  };

  const processCheckout = async () => {
    setLoading(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockConfirmation = {
        success: true,
        booking_id: 'booking_' + Date.now(),
        booking_reference: 'ST' + Date.now().toString().slice(-8),
        total_amount: cart!.total,
        currency: cart!.currency,
        confirmation_sent: true
      };
      
      setBookingConfirmation(mockConfirmation);
      setCurrentStep('confirmation');
      
    } catch (err) {
      setError('Error en el procesamiento del pago.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize search on component mount
  useEffect(() => {
    searchProducts();
  }, []);

  // Render components based on current step
  const renderSearchStep = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Buscar Tours</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Destino</label>
          <select 
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchParams.destination}
            onChange={(e) => setSearchParams({...searchParams, destination: e.target.value})}
          >
            <option value="Madrid">Madrid</option>
            <option value="Barcelona">Barcelona</option>
            <option value="Sevilla">Sevilla</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Participantes</label>
          <select 
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchParams.participants}
            onChange={(e) => setSearchParams({...searchParams, participants: parseInt(e.target.value)})}
          >
            {[1,2,3,4,5,6,7,8].map(num => (
              <option key={num} value={num}>{num} {num === 1 ? 'persona' : 'personas'}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
          <input 
            type="date"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchParams.date}
            onChange={(e) => setSearchParams({...searchParams, date: e.target.value})}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>
      
      <button 
        onClick={searchProducts}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mb-6"
      >
        {loading ? 'Buscando...' : 'Buscar Tours'}
      </button>
      
      {/* Search Results */}
      <div className="space-y-4">
        {searchResults.map(product => (
          <div key={product.product_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
                <p className="text-gray-600 mt-1">{product.description}</p>
                
                <div className="flex items-center mt-2 space-x-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {product.tour_type.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500">
                    <i className="fas fa-clock mr-1"></i>{product.duration_hours}h
                  </span>
                  <span className="text-sm text-gray-500">
                    <i className="fas fa-users mr-1"></i>Máx. {product.max_participants}
                  </span>
                  <span className="text-sm text-gray-500">
                    <i className="fas fa-star mr-1 text-yellow-400"></i>{product.rating} ({product.review_count})
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.included_services.slice(0, 3).map(service => (
                    <span key={service} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      <i className="fas fa-check mr-1"></i>{service}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="ml-4 text-right">
                <div className="text-2xl font-bold text-gray-800">
                  €{product.min_price.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">por persona</div>
                <div className="text-sm text-green-600 mt-1">
                  {product.available_slots} fechas disponibles
                </div>
                
                <button 
                  onClick={() => {
                    setSelectedProduct(product);
                    getAvailability(product.product_id);
                    setCurrentStep('availability');
                  }}
                  className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Ver Disponibilidad
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAvailabilityStep = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => setCurrentStep('search')}
          className="mr-4 text-blue-600 hover:text-blue-800"
        >
          <i className="fas fa-arrow-left mr-2"></i>Volver
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Disponibilidad - {selectedProduct?.name}</h2>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="spinner-border text-blue-600" role="status">
            <span className="sr-only">Cargando disponibilidad...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {availability.map(dateAvail => (
            <div key={dateAvail.date} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {new Date(dateAvail.date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dateAvail.slots.map(slot => (
                  <div key={slot.slot_id} className="border border-gray-300 rounded-lg p-4 hover:border-blue-500 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-lg font-semibold">{slot.time}</div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800">
                          €{slot.price.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">por persona</div>
                      </div>
                    </div>
                    
                    {slot.special_offer && (
                      <div className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded mb-2">
                        <i className="fas fa-tag mr-1"></i>{slot.special_offer}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">
                        <i className="fas fa-users mr-1"></i>
                        {slot.available_spots}/{slot.total_spots} disponibles
                      </span>
                      {slot.guide_assigned && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          <i className="fas fa-user-tie mr-1"></i>Guía asignado
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => addToCart(slot)}
                      disabled={slot.available_spots < searchParams.participants || loading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {slot.available_spots < searchParams.participants 
                        ? 'Sin disponibilidad' 
                        : loading 
                        ? 'Añadiendo...' 
                        : 'Añadir al Carrito'
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCartStep = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tu Carrito</h2>
      
      {cart && cart.items.length > 0 ? (
        <>
          <div className="space-y-4 mb-6">
            {cart.items.map(item => (
              <div key={item.cart_item_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.product_name}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {new Date(item.date).toLocaleDateString('es-ES')} a las {item.time}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {item.participants} {item.participants === 1 ? 'persona' : 'personas'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">€{item.total_price.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">€{item.unit_price.toFixed(2)} × {item.participants}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>€{cart.subtotal.toFixed(2)}</span>
            </div>
            {cart.discounts > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuentos:</span>
                <span>-€{cart.discounts.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>IVA (21%):</span>
              <span>€{cart.taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>Total:</span>
              <span>€{cart.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="mt-6 flex space-x-4">
            <button 
              onClick={() => setCurrentStep('search')}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-md hover:bg-gray-300 transition-colors"
            >
              Seguir Comprando
            </button>
            <button 
              onClick={() => setCurrentStep('checkout')}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors"
            >
              Proceder al Pago
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <i className="fas fa-shopping-cart text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 mb-4">Tu carrito está vacío</p>
          <button 
            onClick={() => setCurrentStep('search')}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700"
          >
            Explorar Tours
          </button>
        </div>
      )}
    </div>
  );

  const renderCheckoutStep = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Finalizar Reserva</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Información del Cliente</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customerInfo.firstName}
                  onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customerInfo.lastName}
                  onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input 
                type="tel"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                required
              />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mt-6 mb-4">Método de Pago</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 border border-gray-300 rounded-md">
              <input type="radio" name="payment" defaultChecked className="mr-3" />
              <i className="fas fa-credit-card mr-2 text-blue-600"></i>
              <span>Tarjeta de Crédito/Débito</span>
            </div>
            <div className="flex items-center p-3 border border-gray-300 rounded-md">
              <input type="radio" name="payment" className="mr-3" />
              <i className="fab fa-paypal mr-2 text-blue-600"></i>
              <span>PayPal</span>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Resumen del Pedido</h3>
          {cart && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {cart.items.map(item => (
                <div key={item.cart_item_id} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(item.date).toLocaleDateString('es-ES')} - {item.time}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.participants} × €{item.unit_price.toFixed(2)} = €{item.total_price.toFixed(2)}
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>€{cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA:</span>
                  <span>€{cart.taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>€{cart.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 flex space-x-4">
        <button 
          onClick={() => setCurrentStep('cart')}
          className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-md hover:bg-gray-300 transition-colors"
        >
          Volver al Carrito
        </button>
        <button 
          onClick={processCheckout}
          disabled={loading || !customerInfo.email || !customerInfo.firstName}
          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Procesando...' : 'Confirmar y Pagar'}
        </button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
      <div className="mb-6">
        <i className="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
        <h2 className="text-3xl font-bold text-gray-800">¡Reserva Confirmada!</h2>
      </div>
      
      {bookingConfirmation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="text-lg mb-4">
            <strong>Referencia de Reserva:</strong>
            <div className="text-2xl font-mono font-bold text-green-700 mt-1">
              {bookingConfirmation.booking_reference}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Total Pagado:</strong>
              <div className="text-lg font-semibold">
                €{bookingConfirmation.total_amount.toFixed(2)} {bookingConfirmation.currency}
              </div>
            </div>
            <div>
              <strong>Estado:</strong>
              <div className="text-green-600 font-semibold">Confirmado y Pagado</div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <i className="fas fa-envelope mr-2 text-blue-600"></i>
            Hemos enviado la confirmación y todos los detalles a tu email.
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        <button 
          onClick={() => {
            setCurrentStep('search');
            setCart(null);
            setSelectedProduct(null);
            setBookingConfirmation(null);
          }}
          className="bg-blue-600 text-white py-3 px-8 rounded-md hover:bg-blue-700 transition-colors"
        >
          Realizar Otra Reserva
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { key: 'search', label: 'Buscar', icon: 'search' },
              { key: 'availability', label: 'Disponibilidad', icon: 'calendar' },
              { key: 'cart', label: 'Carrito', icon: 'shopping-cart' },
              { key: 'checkout', label: 'Pago', icon: 'credit-card' },
              { key: 'confirmation', label: 'Confirmación', icon: 'check' }
            ].map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${currentStep === step.key ? 'bg-blue-600 text-white' :
                    ['search', 'availability', 'cart', 'checkout', 'confirmation'].indexOf(currentStep) > 
                    ['search', 'availability', 'cart', 'checkout', 'confirmation'].indexOf(step.key)
                    ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}
                `}>
                  <i className={`fas fa-${step.icon}`}></i>
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === step.key ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < 4 && (
                  <div className={`w-8 h-px mx-4 ${
                    ['search', 'availability', 'cart', 'checkout', 'confirmation'].indexOf(currentStep) > index
                    ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 'search' && renderSearchStep()}
        {currentStep === 'availability' && renderAvailabilityStep()}
        {currentStep === 'cart' && renderCartStep()}
        {currentStep === 'checkout' && renderCheckoutStep()}
        {currentStep === 'confirmation' && renderConfirmationStep()}
      </div>
    </div>
  );
};

export default BookingSystem;