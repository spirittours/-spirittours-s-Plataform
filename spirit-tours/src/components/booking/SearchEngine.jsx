import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { 
  FaSearch, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaUsers, 
  FaPlus, 
  FaMinus,
  FaChild,
  FaUserAlt,
  FaFilter,
  FaStar,
  FaDollarSign
} from 'react-icons/fa';

const SearchEngine = () => {
  const navigate = useNavigate();
  
  const [searchData, setSearchData] = useState({
    destination: '',
    checkIn: null,
    checkOut: null,
    adults: 2,
    children: 0,
    infants: 0,
    experienceType: 'all',
    priceRange: [0, 5000],
    rating: 0
  });

  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const popularDestinations = [
    { id: 1, name: 'Machu Picchu, Perú', type: 'spiritual', image: '🏔️' },
    { id: 2, name: 'Varanasi, India', type: 'spiritual', image: '🕉️' },
    { id: 3, name: 'Sedona, Arizona', type: 'wellness', image: '🏜️' },
    { id: 4, name: 'Bali, Indonesia', type: 'spiritual', image: '🏝️' },
    { id: 5, name: 'Camino de Santiago, España', type: 'pilgrimage', image: '🚶' },
    { id: 6, name: 'Monte Shasta, California', type: 'energy', image: '⛰️' },
    { id: 7, name: 'Glastonbury, Inglaterra', type: 'mystical', image: '🏰' },
    { id: 8, name: 'Rishikesh, India', type: 'yoga', image: '🧘' }
  ];

  const experienceTypes = [
    { value: 'all', label: 'Todas las experiencias', icon: '🌍' },
    { value: 'spiritual', label: 'Viajes espirituales', icon: '🕉️' },
    { value: 'wellness', label: 'Bienestar y spa', icon: '💆' },
    { value: 'yoga', label: 'Retiros de yoga', icon: '🧘' },
    { value: 'meditation', label: 'Meditación', icon: '🧘‍♂️' },
    { value: 'pilgrimage', label: 'Peregrinaciones', icon: '🚶' },
    { value: 'energy', label: 'Lugares de energía', icon: '⚡' },
    { value: 'mystical', label: 'Experiencias místicas', icon: '🔮' },
    { value: 'healing', label: 'Sanación holística', icon: '🌿' }
  ];

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setSearchData({ ...searchData, destination: value });
    
    // Filtrar sugerencias
    if (value.length > 1) {
      const filtered = popularDestinations.filter(dest => 
        dest.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectDestination = (destination) => {
    setSearchData({ ...searchData, destination: destination.name });
    setShowSuggestions(false);
  };

  const updateGuests = (type, operation) => {
    const current = searchData[type];
    let newValue = current;
    
    if (operation === 'add') {
      newValue = current + 1;
    } else if (operation === 'subtract' && current > 0) {
      newValue = current - 1;
    }
    
    // Validaciones especiales
    if (type === 'adults' && newValue < 1) {
      newValue = 1; // Mínimo 1 adulto
    }
    
    setSearchData({ ...searchData, [type]: newValue });
  };

  const getTotalGuests = () => {
    return searchData.adults + searchData.children + searchData.infants;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!searchData.destination) {
      alert('Por favor selecciona un destino');
      return;
    }
    
    if (!searchData.checkIn || !searchData.checkOut) {
      alert('Por favor selecciona las fechas');
      return;
    }
    
    // Navegar a resultados con parámetros de búsqueda
    const searchParams = new URLSearchParams({
      destination: searchData.destination,
      checkIn: searchData.checkIn.toISOString(),
      checkOut: searchData.checkOut.toISOString(),
      adults: searchData.adults,
      children: searchData.children,
      infants: searchData.infants,
      experienceType: searchData.experienceType,
      minPrice: searchData.priceRange[0],
      maxPrice: searchData.priceRange[1],
      rating: searchData.rating
    });
    
    navigate(`/search-results?${searchParams.toString()}`);
  };

  const quickSearch = (type) => {
    setSearchData({ ...searchData, experienceType: type });
    setShowFilters(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">
          Encuentra tu experiencia espiritual perfecta
        </h2>

        {/* Tipos de experiencia rápidos */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-3 pb-2">
            {experienceTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => quickSearch(type.value)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition whitespace-nowrap ${
                  searchData.experienceType === type.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span>{type.icon}</span>
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Destino */}
            <div className="md:col-span-1 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destino
              </label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchData.destination}
                  onChange={handleDestinationChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="¿A dónde vas?"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                
                {/* Sugerencias de destinos */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => selectDestination(dest)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-3"
                      >
                        <span className="text-2xl">{dest.image}</span>
                        <div>
                          <p className="font-medium text-gray-800">{dest.name}</p>
                          <p className="text-xs text-gray-500">{dest.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fecha de entrada */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in
              </label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 z-10 pointer-events-none" />
                <DatePicker
                  selected={searchData.checkIn}
                  onChange={(date) => setSearchData({ ...searchData, checkIn: date })}
                  minDate={new Date()}
                  placeholderText="Selecciona fecha"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  dateFormat="dd/MM/yyyy"
                />
              </div>
            </div>

            {/* Fecha de salida */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out
              </label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 z-10 pointer-events-none" />
                <DatePicker
                  selected={searchData.checkOut}
                  onChange={(date) => setSearchData({ ...searchData, checkOut: date })}
                  minDate={searchData.checkIn || new Date()}
                  placeholderText="Selecciona fecha"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  dateFormat="dd/MM/yyyy"
                />
              </div>
            </div>

            {/* Huéspedes */}
            <div className="md:col-span-1 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Huéspedes
              </label>
              <button
                type="button"
                onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                className="w-full flex items-center justify-between px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <div className="flex items-center space-x-2">
                  <FaUsers className="text-gray-400" />
                  <span>{getTotalGuests()} {getTotalGuests() === 1 ? 'huésped' : 'huéspedes'}</span>
                </div>
              </button>

              {/* Dropdown de huéspedes */}
              {showGuestDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <div className="space-y-4">
                    {/* Adultos */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FaUserAlt className="text-gray-600" />
                        <div>
                          <p className="font-medium">Adultos</p>
                          <p className="text-xs text-gray-500">18+ años</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => updateGuests('adults', 'subtract')}
                          disabled={searchData.adults <= 1}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="w-8 text-center font-medium">{searchData.adults}</span>
                        <button
                          type="button"
                          onClick={() => updateGuests('adults', 'add')}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>
                    </div>

                    {/* Niños */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FaChild className="text-gray-600" />
                        <div>
                          <p className="font-medium">Niños</p>
                          <p className="text-xs text-gray-500">2-17 años</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => updateGuests('children', 'subtract')}
                          disabled={searchData.children <= 0}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="w-8 text-center font-medium">{searchData.children}</span>
                        <button
                          type="button"
                          onClick={() => updateGuests('children', 'add')}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>
                    </div>

                    {/* Bebés */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FaChild className="text-gray-600 text-xs" />
                        <div>
                          <p className="font-medium">Bebés</p>
                          <p className="text-xs text-gray-500">0-2 años</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => updateGuests('infants', 'subtract')}
                          disabled={searchData.infants <= 0}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="w-8 text-center font-medium">{searchData.infants}</span>
                        <button
                          type="button"
                          onClick={() => updateGuests('infants', 'add')}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGuestDropdown(false)}
                    className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Listo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filtros avanzados */}
          <div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition"
            >
              <FaFilter />
              <span>Filtros avanzados</span>
            </button>

            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Rango de precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rango de precio por persona
                    </label>
                    <div className="flex items-center space-x-2">
                      <FaDollarSign className="text-gray-400" />
                      <input
                        type="number"
                        value={searchData.priceRange[0]}
                        onChange={(e) => setSearchData({
                          ...searchData,
                          priceRange: [parseInt(e.target.value), searchData.priceRange[1]]
                        })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded"
                        placeholder="Min"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        value={searchData.priceRange[1]}
                        onChange={(e) => setSearchData({
                          ...searchData,
                          priceRange: [searchData.priceRange[0], parseInt(e.target.value)]
                        })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded"
                        placeholder="Max"
                      />
                    </div>
                  </div>

                  {/* Calificación mínima */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calificación mínima
                    </label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSearchData({ ...searchData, rating: star })}
                          className={`text-2xl ${
                            star <= searchData.rating ? 'text-yellow-400' : 'text-gray-300'
                          } hover:text-yellow-400 transition`}
                        >
                          <FaStar />
                        </button>
                      ))}
                      {searchData.rating > 0 && (
                        <button
                          type="button"
                          onClick={() => setSearchData({ ...searchData, rating: 0 })}
                          className="text-sm text-gray-500 hover:text-gray-700 ml-2"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botón de búsqueda */}
          <div className="flex justify-center">
            <button
              type="submit"
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-full hover:from-indigo-700 hover:to-purple-700 transition transform hover:scale-105 shadow-lg"
            >
              <FaSearch />
              <span className="font-medium">Buscar experiencias</span>
            </button>
          </div>
        </form>

        {/* Destinos populares */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Destinos populares</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularDestinations.map((dest) => (
              <button
                key={dest.id}
                onClick={() => selectDestination(dest)}
                className="flex items-center space-x-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              >
                <span className="text-2xl">{dest.image}</span>
                <span className="text-sm text-gray-700 text-left">{dest.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchEngine;