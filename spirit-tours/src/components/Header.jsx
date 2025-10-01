import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail, Globe, User } from 'lucide-react';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', href: '#home' },
    { name: 'Destinos', href: '#destinations' },
    { name: 'Experiencias', href: '#experiences' },
    { name: 'Testimonios', href: '#testimonials' },
    { name: 'Sobre Nosotros', href: '#about' },
    { name: 'Contacto', href: '#contact' }
  ];

  return (
    <>
      {/* Top Bar */}
      <div className="bg-primary-800 text-white py-2 hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex gap-6">
              <a href="tel:+34900123456" className="flex items-center gap-2 hover:text-primary-200">
                <Phone className="w-3 h-3" />
                +34 900 123 456
              </a>
              <a href="mailto:info@spirittours.com" className="flex items-center gap-2 hover:text-primary-200">
                <Mail className="w-3 h-3" />
                info@spirittours.com
              </a>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 hover:text-primary-200">
                <Globe className="w-3 h-3" />
                ES
              </button>
              <button className="flex items-center gap-2 hover:text-primary-200">
                <User className="w-3 h-3" />
                Mi Cuenta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`fixed top-0 md:top-8 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <a href="#home" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-secondary-700 bg-clip-text text-transparent">
                    Spirit Tours
                  </h1>
                  <p className="text-xs text-gray-600">Viajes Espirituales</p>
                </div>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </nav>

            {/* CTA Button */}
            <div className="hidden lg:block">
              <button className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl">
                Reservar Ahora
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-gray-700 hover:text-primary-600 font-medium py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                ))}
                <button className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-3 rounded-lg font-semibold mt-4">
                  Reservar Ahora
                </button>
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;