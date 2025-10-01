import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'María González',
    location: 'Madrid, España',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150',
    rating: 5,
    journey: 'Retiro en Bali',
    date: 'Octubre 2024',
    text: 'Mi viaje a Bali con Spirit Tours fue una experiencia que cambió mi vida por completo. La organización fue impecable y los guías espirituales realmente entendían el propósito profundo del viaje. Las ceremonias de purificación en los templos y las sesiones de meditación al amanecer me conectaron con una parte de mí que no sabía que existía.',
    highlight: 'Una transformación profunda del alma'
  },
  {
    id: 2,
    name: 'Carlos Mendoza',
    location: 'Ciudad de México',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
    rating: 5,
    journey: 'Peregrinación a Machu Picchu',
    date: 'Septiembre 2024',
    text: 'La energía de Machu Picchu es indescriptible. Spirit Tours no solo organizó un viaje, crearon una experiencia espiritual completa. Desde las ceremonias con los chamanes locales hasta la meditación en el Huayna Picchu, cada momento fue mágico. Volví a casa con una perspectiva completamente nueva de la vida.',
    highlight: 'Conexión ancestral inolvidable'
  },
  {
    id: 3,
    name: 'Ana Rodríguez',
    location: 'Buenos Aires, Argentina',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150',
    rating: 5,
    journey: 'Inmersión en India',
    date: 'Agosto 2024',
    text: 'Varanasi me enseñó sobre la vida y la muerte de una manera que ningún libro podría hacerlo. El equipo de Spirit Tours fue excepcional, especialmente en momentos culturalmente sensibles. Las clases de yoga al amanecer junto al Ganges y las ceremonias Aarti fueron experiencias que llevaré en mi corazón para siempre.',
    highlight: 'Despertar espiritual genuino'
  },
  {
    id: 4,
    name: 'Diego Silva',
    location: 'Santiago, Chile',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150',
    rating: 5,
    journey: 'Camino de Santiago',
    date: 'Julio 2024',
    text: 'Hacer el Camino con Spirit Tours fue la decisión perfecta. No solo caminé 800 km, sino que también recorrí un camino interior de autodescubrimiento. El grupo fue increíble, los alojamientos cuidadosamente seleccionados, y las reflexiones diarias guiadas añadieron una dimensión espiritual profunda a la experiencia.',
    highlight: 'Un viaje de transformación personal'
  },
  {
    id: 5,
    name: 'Lucía Fernández',
    location: 'Barcelona, España',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=150',
    rating: 5,
    journey: 'Retiro en Tibet',
    date: 'Junio 2024',
    text: 'El Monte Kailash superó todas mis expectativas. A pesar de los desafíos físicos, el apoyo del equipo de Spirit Tours fue constante. Las enseñanzas budistas, la meditación en los monasterios y la energía del lugar sagrado crearon una experiencia que redefinió mi comprensión de la espiritualidad.',
    highlight: 'Una peregrinación que toca el alma'
  }
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Historias de Transformación
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Descubre cómo nuestros viajeros han encontrado su camino espiritual
          </p>
        </div>

        {/* Main Testimonial Carousel */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="relative bg-white rounded-3xl shadow-xl p-8 md:p-12">
            {/* Quote Icon */}
            <Quote className="absolute top-8 left-8 w-12 h-12 text-primary-200" />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              {/* Highlight */}
              <p className="text-2xl md:text-3xl font-bold text-primary-700 mb-6">
                "{testimonials[currentIndex].highlight}"
              </p>
              
              {/* Full Testimonial */}
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                {testimonials[currentIndex].text}
              </p>
              
              {/* Author Info */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={testimonials[currentIndex].avatar}
                    alt={testimonials[currentIndex].name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {testimonials[currentIndex].name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {testimonials[currentIndex].location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600">
                    {testimonials[currentIndex].journey}
                  </p>
                  <p className="text-sm text-gray-500">
                    {testimonials[currentIndex].date}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <button
              onClick={prevTestimonial}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:shadow-xl transition-shadow"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:shadow-xl transition-shadow"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          
          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 bg-primary-600' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary-600">2,500+</p>
            <p className="text-gray-600 mt-2">Viajeros Transformados</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary-600">98%</p>
            <p className="text-gray-600 mt-2">Satisfacción</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary-600">45+</p>
            <p className="text-gray-600 mt-2">Destinos Sagrados</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary-600">12+</p>
            <p className="text-gray-600 mt-2">Años de Experiencia</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;