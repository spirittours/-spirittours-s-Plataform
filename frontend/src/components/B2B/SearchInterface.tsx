/**
 * Search Interface Component
 * Hotel and package search interface for B2B operators
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiCalendar, FiMapPin, FiUsers, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface SearchInterfaceProps {
  operatorId: string;
  operatorName: string;
  onSearch: (params: any) => Promise<any[]>;
}

interface Room {
  adults: number;
  children: number;
  childrenAges: number[];
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({
  operatorId,
  operatorName,
  onSearch
}) => {
  const [searchType, setSearchType] = useState<'hotels' | 'packages'>('hotels');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Hotel search form
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rooms, setRooms] = useState<Room[]>([
    { adults: 2, children: 0, childrenAges: [] }
  ]);

  const addRoom = () => {
    setRooms([...rooms, { adults: 2, children: 0, childrenAges: [] }]);
  };

  const removeRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const updateRoom = (index: number, field: keyof Room, value: any) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setRooms(newRooms);
  };

  const handleSearch = async () => {
    // Validation
    if (!destination) {
      toast.error('Por favor ingresa un destino');
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error('Por favor selecciona las fechas');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkOutDate <= checkInDate) {
      toast.error('La fecha de salida debe ser posterior a la fecha de entrada');
      return;
    }

    try {
      setLoading(true);
      const searchParams = {
        destination,
        checkIn,
        checkOut,
        rooms: rooms.map(r => ({
          adults: r.adults,
          children: r.children,
          childrenAges: r.childrenAges
        }))
      };

      const results = await onSearch(searchParams);
      setResults(results);
      toast.success(`${results.length} resultados encontrados`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error en la búsqueda');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSearchType('hotels')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            searchType === 'hotels'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🏨 Hoteles
        </button>
        <button
          onClick={() => setSearchType('packages')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            searchType === 'packages'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📦 Paquetes
        </button>
      </div>

      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border-2 border-gray-200 p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FiSearch />
          Buscar en {operatorName}
        </h3>

        {searchType === 'hotels' && (
          <div className="space-y-4">
            {/* Destination */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FiMapPin className="inline mr-1" />
                Destino
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ej: Madrid, Barcelona, Londres..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiCalendar className="inline mr-1" />
                  Check-in
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiCalendar className="inline mr-1" />
                  Check-out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Rooms */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  <FiUsers className="inline mr-1" />
                  Habitaciones
                </label>
                <button
                  onClick={addRoom}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200"
                >
                  + Agregar Habitación
                </button>
              </div>

              {rooms.map((room, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-900">Habitación {index + 1}</span>
                    {rooms.length > 1 && (
                      <button
                        onClick={() => removeRoom(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-semibold"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Adultos
                      </label>
                      <select
                        value={room.adults}
                        onChange={(e) => updateRoom(index, 'adults', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Niños
                      </label>
                      <select
                        value={room.children}
                        onChange={(e) => updateRoom(index, 'children', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {[0, 1, 2, 3, 4].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <FiSearch />
                  Buscar Hoteles
                </>
              )}
            </motion.button>
          </div>
        )}

        {searchType === 'packages' && (
          <div className="text-center py-8 text-gray-500">
            <p>Búsqueda de paquetes disponible próximamente</p>
          </div>
        )}
      </motion.div>

      {/* Results */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="text-xl font-bold text-gray-900">
            {results.length} Resultados Encontrados
          </h3>

          {results.map((result, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{result.hotelName || 'Hotel'}</h4>
                  <p className="text-sm text-gray-600">{result.location || result.destination}</p>
                  {result.category && (
                    <p className="text-sm text-gray-500 mt-1">Categoría: {result.category}</p>
                  )}
                </div>
                {result.price && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      ${result.price}
                    </p>
                    <p className="text-sm text-gray-600">{result.currency || 'USD'}</p>
                  </div>
                )}
              </div>

              {result.rooms && result.rooms.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    {result.rooms.length} tipo(s) de habitación disponible(s)
                  </p>
                  <div className="space-y-2">
                    {result.rooms.slice(0, 3).map((room: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{room.roomType}</span>
                        <span className="font-semibold text-gray-900">${room.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default SearchInterface;
