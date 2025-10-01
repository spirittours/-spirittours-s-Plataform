import React from 'react';
import { Star, MapPin, Clock, Users } from 'lucide-react';

const destinations = [
  {
    id: 1,
    name: 'Machu Picchu',
    location: 'Cusco, Perú',
    image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=2070',
    rating: 4.9,
    duration: '7 días',
    groupSize: '8-12',
    price: '$2,890',
    description: 'Conexión ancestral con la energía de los Incas',
    tags: ['Meditación', 'Cultura', 'Trekking']
  },
  {
    id: 2,
    name: 'Templos de Bali',
    location: 'Ubud, Indonesia',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2038',
    rating: 4.8,
    duration: '10 días',
    groupSize: '6-10',
    price: '$2,350',
    description: 'Retiro espiritual y purificación del alma',
    tags: ['Yoga', 'Meditación', 'Cultura']
  },
  {
    id: 3,
    name: 'Varanasi Sagrado',
    location: 'Uttar Pradesh, India',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=2070',
    rating: 4.7,
    duration: '14 días',
    groupSize: '8-15',
    price: '$3,200',
    description: 'Inmersión en la espiritualidad hindú',
    tags: ['Rituales', 'Meditación', 'Yoga']
  },
  {
    id: 4,
    name: 'Monte Kailash',
    location: 'Tibet',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070',
    rating: 5.0,
    duration: '21 días',
    groupSize: '4-8',
    price: '$5,500',
    description: 'Peregrinación a la montaña sagrada',
    tags: ['Trekking', 'Budismo', 'Meditación']
  },
  {
    id: 5,
    name: 'Sedona Vortex',
    location: 'Arizona, USA',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021',
    rating: 4.6,
    duration: '5 días',
    groupSize: '6-12',
    price: '$1,890',
    description: 'Energía transformadora del desierto rojo',
    tags: ['Energía', 'Meditación', 'Naturaleza']
  },
  {
    id: 6,
    name: 'Camino de Santiago',
    location: 'España',
    image: 'https://images.unsplash.com/photo-1523978591478-c753949ff840?q=80&w=2070',
    rating: 4.9,
    duration: '30 días',
    groupSize: '10-20',
    price: '$3,750',
    description: 'Peregrinación de transformación personal',
    tags: ['Caminata', 'Reflexión', 'Historia']
  }
];

const PopularDestinations = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Destinos Sagrados
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explora lugares de poder y transformación espiritual alrededor del mundo
          </p>
        </div>
        
        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination) => (
            <div
              key={destination.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 cursor-pointer group"
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold text-sm">{destination.rating}</span>
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent h-32"></div>
                <h3 className="absolute bottom-4 left-4 text-2xl font-bold text-white">
                  {destination.name}
                </h3>
              </div>
              
              {/* Content */}
              <div className="p-6">
                {/* Location */}
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{destination.location}</span>
                </div>
                
                {/* Description */}
                <p className="text-gray-700 mb-4">
                  {destination.description}
                </p>
                
                {/* Info Row */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{destination.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{destination.groupSize}</span>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {destination.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                {/* Price and CTA */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-sm text-gray-500">Desde</span>
                    <p className="text-2xl font-bold text-gray-900">{destination.price}</p>
                  </div>
                  <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    Ver Detalles
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* View All Button */}
        <div className="text-center mt-12">
          <button className="bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300">
            Ver Todos los Destinos
          </button>
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;