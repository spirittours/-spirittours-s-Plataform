import React from 'react';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  Mail, 
  Phone, 
  MapPin,
  Heart,
  Shield,
  CreditCard,
  Award
} from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Trust Badges */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary-400" />
              <div>
                <p className="font-semibold">Viajes Seguros</p>
                <p className="text-sm text-gray-400">100% Garantizado</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-primary-400" />
              <div>
                <p className="font-semibold">Pago Seguro</p>
                <p className="text-sm text-gray-400">SSL Encriptado</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-primary-400" />
              <div>
                <p className="font-semibold">Mejor Precio</p>
                <p className="text-sm text-gray-400">Garantizado</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-primary-400" />
              <div>
                <p className="font-semibold">Atención 24/7</p>
                <p className="text-sm text-gray-400">Siempre Contigo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Spirit Tours</h3>
                <p className="text-xs text-gray-400">Viajes Espirituales</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              Transformamos vidas a través de experiencias espirituales únicas en los lugares más sagrados del mundo.
            </p>
            {/* Social Media */}
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Enlaces Rápidos</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Sobre Nosotros</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Nuestros Destinos</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Experiencias</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Blog Espiritual</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Testimonios</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Popular Destinations */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Destinos Populares</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Machu Picchu, Perú</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Bali, Indonesia</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Varanasi, India</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Monte Kailash, Tibet</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Sedona, USA</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">Camino de Santiago</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Contacto</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary-400 mt-1 flex-shrink-0" />
                <span className="text-gray-400">
                  Calle de la Paz, 123<br />
                  28012 Madrid, España
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <span className="text-gray-400">+34 900 123 456</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <span className="text-gray-400">info@spirittours.com</span>
              </li>
            </ul>
            
            {/* Newsletter */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Suscríbete a nuestro newsletter</h4>
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder="Tu email"
                  className="flex-1 px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors">
                  <Mail className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2024 Spirit Tours. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                Política de Privacidad
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                Términos y Condiciones
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;