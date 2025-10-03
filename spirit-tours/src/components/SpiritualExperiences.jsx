import React from 'react';
import { Heart, Sun, Moon, Sparkles, Mountain, Waves } from 'lucide-react';

const experiences = [
  {
    id: 1,
    title: 'Retiros de Meditación',
    icon: Heart,
    color: 'from-purple-500 to-pink-500',
    description: 'Silencio interior y paz mental en entornos naturales únicos',
    features: ['Meditación guiada', 'Mindfulness', 'Técnicas de respiración', 'Silencio contemplativo'],
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?q=80&w=2064'
  },
  {
    id: 2,
    title: 'Yoga & Bienestar',
    icon: Sun,
    color: 'from-orange-500 to-yellow-500',
    description: 'Equilibra cuerpo, mente y espíritu con prácticas ancestrales',
    features: ['Hatha Yoga', 'Vinyasa Flow', 'Kundalini', 'Yoga Nidra'],
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=2099'
  },
  {
    id: 3,
    title: 'Ceremonias Sagradas',
    icon: Moon,
    color: 'from-indigo-500 to-purple-500',
    description: 'Participa en rituales ancestrales de diferentes culturas',
    features: ['Temazcal', 'Círculos de fuego', 'Ceremonias del cacao', 'Rituales lunares'],
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070'
  },
  {
    id: 4,
    title: 'Sanación Energética',
    icon: Sparkles,
    color: 'from-teal-500 to-cyan-500',
    description: 'Terapias holísticas para restaurar tu equilibrio energético',
    features: ['Reiki', 'Cristaloterapia', 'Sonidos sanadores', 'Aromaterapia'],
    image: 'https://images.unsplash.com/photo-1600618528240-fb9fc964b853?q=80&w=2070'
  },
  {
    id: 5,
    title: 'Peregrinaciones',
    icon: Mountain,
    color: 'from-green-500 to-emerald-500',
    description: 'Camina hacia tu transformación personal en rutas sagradas',
    features: ['Rutas ancestrales', 'Caminatas conscientes', 'Conexión con la naturaleza', 'Reflexión personal'],
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2070'
  },
  {
    id: 6,
    title: 'Inmersiones Culturales',
    icon: Waves,
    color: 'from-blue-500 to-indigo-500',
    description: 'Vive con comunidades locales y aprende sus tradiciones espirituales',
    features: ['Convivencia local', 'Aprendizaje de rituales', 'Medicina tradicional', 'Artesanías sagradas'],
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1984'
  }
];

const SpiritualExperiences = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Experiencias Transformadoras
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Descubre prácticas espirituales que nutrirán tu alma y expandirán tu consciencia
          </p>
        </div>
        
        {/* Experiences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {experiences.map((experience) => {
            const Icon = experience.icon;
            return (
              <div
                key={experience.id}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500"
              >
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={experience.image}
                    alt={experience.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/60 transition-colors duration-500"></div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 p-8 h-full min-h-[400px] flex flex-col justify-between">
                  {/* Header */}
                  <div>
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${experience.color} mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {experience.title}
                    </h3>
                    <p className="text-gray-200 mb-6">
                      {experience.description}
                    </p>
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-2">
                    {experience.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        <span className="text-sm text-gray-200">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* CTA Button */}
                  <button className="mt-6 w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white hover:text-gray-900 py-3 rounded-lg font-semibold transition-all duration-300">
                    Explorar Experiencia
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Special Offer Banner */}
        <div className="mt-16 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-3xl p-8 md:p-12 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Diseña tu Viaje Espiritual Personalizado
            </h3>
            <p className="text-xl mb-8 text-white/90">
              Nuestros expertos crearán un itinerario único basado en tus necesidades espirituales y preferencias personales
            </p>
            <button className="bg-white text-primary-700 hover:bg-gray-100 px-8 py-4 rounded-lg font-bold text-lg transition-colors">
              Consulta Gratuita
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpiritualExperiences;