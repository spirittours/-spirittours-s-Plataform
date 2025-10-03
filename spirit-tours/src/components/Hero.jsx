import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users } from 'lucide-react';

const Hero = () => {
  const [searchData, setSearchData] = useState({
    destination: '',
    date: '',
    travelers: 1
  });

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching:', searchData);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Descubre tu Viaje
          <span className="block text-3xl md:text-5xl mt-2 text-primary-300">
            Espiritual Interior
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto">
          Conecta con lugares sagrados alrededor del mundo y transforma tu vida a través de experiencias únicas
        </p>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Destination */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="¿A dónde quieres ir?"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchData.destination}
                onChange={(e) => setSearchData({...searchData, destination: e.target.value})}
              />
            </div>
            
            {/* Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchData.date}
                onChange={(e) => setSearchData({...searchData, date: e.target.value})}
              />
            </div>
            
            {/* Travelers */}
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                value={searchData.travelers}
                onChange={(e) => setSearchData({...searchData, travelers: e.target.value})}
              >
                <option value="1">1 Viajero</option>
                <option value="2">2 Viajeros</option>
                <option value="3">3 Viajeros</option>
                <option value="4">4+ Viajeros</option>
              </select>
            </div>
            
            {/* Search Button */}
            <button
              type="submit"
              className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-105"
            >
              <Search className="w-5 h-5" />
              <span>Buscar</span>
            </button>
          </div>
        </form>
        
        {/* Popular Tags */}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <span className="text-white text-sm">Destinos populares:</span>
          {['Machu Picchu', 'Bali', 'India', 'Tibet', 'Sedona', 'Camino de Santiago'].map((dest) => (
            <button
              key={dest}
              className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-colors"
              onClick={() => setSearchData({...searchData, destination: dest})}
            >
              {dest}
            </button>
          ))}
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-8 h-12 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
        </div>
      </div>
    </div>
  );
};

export default Hero;