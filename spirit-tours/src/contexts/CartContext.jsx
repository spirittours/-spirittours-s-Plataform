import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext({});

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState('');

  // Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem('spiritToursCart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          setCartItems(parsedCart);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    };
    loadCart();
  }, []);

  // Guardar carrito en localStorage cuando cambia
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('spiritToursCart', JSON.stringify(cartItems));
    } else {
      localStorage.removeItem('spiritToursCart');
    }
    calculateTotals();
  }, [cartItems]);

  // Calcular totales
  const calculateTotals = () => {
    const count = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;
    
    setCartCount(count);
    setCartTotal(total);
  };

  // Agregar item al carrito
  const addToCart = (item) => {
    setIsLoading(true);
    try {
      const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        // Si el item ya existe, aumentar cantidad
        updateQuantity(item.id, existingItem.quantity + 1);
      } else {
        // Agregar nuevo item con campos necesarios
        const newItem = {
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.image,
          category: item.category,
          quantity: 1,
          maxQuantity: item.maxQuantity || 10,
          date: item.date || null,
          location: item.location || '',
          addedAt: new Date().toISOString()
        };
        setCartItems([...cartItems, newItem]);
      }
      return { success: true, message: 'Agregado al carrito' };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, error: 'Error al agregar al carrito' };
    } finally {
      setIsLoading(false);
    }
  };

  // Remover item del carrito
  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
    return { success: true, message: 'Eliminado del carrito' };
  };

  // Actualizar cantidad
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      return removeFromCart(itemId);
    }
    
    setCartItems(cartItems.map(item => {
      if (item.id === itemId) {
        const maxQty = item.maxQuantity || 10;
        const quantity = Math.min(newQuantity, maxQty);
        return { ...item, quantity };
      }
      return item;
    }));
    
    return { success: true, message: 'Cantidad actualizada' };
  };

  // Aplicar código promocional
  const applyPromoCode = async (code) => {
    setIsLoading(true);
    try {
      // Simulación de validación de código promocional
      const validCodes = {
        'SPIRIT10': 10,
        'WELCOME20': 20,
        'VIP30': 30,
        'SUMMER15': 15
      };
      
      const discountPercent = validCodes[code.toUpperCase()];
      
      if (discountPercent) {
        setDiscount(discountPercent);
        setPromoCode(code);
        return { success: true, message: `Descuento del ${discountPercent}% aplicado` };
      } else {
        return { success: false, error: 'Código promocional inválido' };
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      return { success: false, error: 'Error al aplicar código' };
    } finally {
      setIsLoading(false);
    }
  };

  // Remover código promocional
  const removePromoCode = () => {
    setDiscount(0);
    setPromoCode('');
    return { success: true, message: 'Descuento removido' };
  };

  // Limpiar carrito
  const clearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setPromoCode('');
    localStorage.removeItem('spiritToursCart');
    return { success: true, message: 'Carrito vaciado' };
  };

  // Obtener resumen del carrito
  const getCartSummary = () => {
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discountAmount = subtotal * (discount / 100);
    const taxes = (subtotal - discountAmount) * 0.18; // 18% tax
    const total = subtotal - discountAmount + taxes;
    
    return {
      items: cartItems,
      itemCount: cartCount,
      subtotal: subtotal.toFixed(2),
      discount: discount,
      discountAmount: discountAmount.toFixed(2),
      promoCode: promoCode,
      taxes: taxes.toFixed(2),
      total: total.toFixed(2)
    };
  };

  // Validar disponibilidad de items
  const validateAvailability = async () => {
    setIsLoading(true);
    try {
      // Aquí se haría la validación real con el backend
      // Por ahora simulamos
      const unavailableItems = [];
      
      for (const item of cartItems) {
        // Simulación de verificación
        const isAvailable = Math.random() > 0.1; // 90% disponible
        if (!isAvailable) {
          unavailableItems.push(item);
        }
      }
      
      if (unavailableItems.length > 0) {
        return {
          success: false,
          unavailableItems,
          message: 'Algunos items no están disponibles'
        };
      }
      
      return {
        success: true,
        message: 'Todos los items están disponibles'
      };
    } catch (error) {
      console.error('Error validating availability:', error);
      return {
        success: false,
        error: 'Error al validar disponibilidad'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Preparar checkout
  const prepareCheckout = async () => {
    setIsLoading(true);
    try {
      // Validar disponibilidad
      const availabilityCheck = await validateAvailability();
      if (!availabilityCheck.success) {
        return availabilityCheck;
      }
      
      // Crear sesión de checkout
      const checkoutData = {
        user: user?.id || 'guest',
        items: cartItems,
        summary: getCartSummary(),
        timestamp: new Date().toISOString()
      };
      
      // Guardar en sessionStorage para el proceso de checkout
      sessionStorage.setItem('checkoutSession', JSON.stringify(checkoutData));
      
      return {
        success: true,
        checkoutData,
        message: 'Checkout preparado'
      };
    } catch (error) {
      console.error('Error preparing checkout:', error);
      return {
        success: false,
        error: 'Error al preparar checkout'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Sincronizar carrito con servidor (cuando el usuario se loguea)
  const syncCartWithServer = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Aquí se sincronizaría con el backend
      // Por ahora solo simulamos
      console.log('Syncing cart with server for user:', user.id);
      
      return {
        success: true,
        message: 'Carrito sincronizado'
      };
    } catch (error) {
      console.error('Error syncing cart:', error);
      return {
        success: false,
        error: 'Error al sincronizar carrito'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener items recomendados basados en el carrito
  const getRecommendedItems = () => {
    // Lógica simple de recomendaciones
    const categories = [...new Set(cartItems.map(item => item.category))];
    
    // Aquí se obtendrían recomendaciones del backend
    // Por ahora retornamos datos de ejemplo
    return [
      {
        id: 'rec1',
        name: 'Tour Complementario',
        price: 99,
        category: categories[0] || 'tours',
        image: '🎯'
      },
      {
        id: 'rec2',
        name: 'Seguro de Viaje',
        price: 45,
        category: 'insurance',
        image: '🛡️'
      }
    ];
  };

  const value = {
    // Estado
    cartItems,
    cartTotal,
    cartCount,
    discount,
    promoCode,
    isLoading,
    
    // Funciones
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyPromoCode,
    removePromoCode,
    getCartSummary,
    validateAvailability,
    prepareCheckout,
    syncCartWithServer,
    getRecommendedItems
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Hook para usar el contexto del carrito
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;