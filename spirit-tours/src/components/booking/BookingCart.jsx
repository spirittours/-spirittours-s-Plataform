import React from 'react';

const BookingCart = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Carrito de Reservas</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Tu carrito está vacío</p>
      </div>
    </div>
  );
};

export default BookingCart;