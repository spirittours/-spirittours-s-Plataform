import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Phone, Mail, Globe, User, LogOut, Settings, ShoppingCart } from 'lucide-react';
import NotificationCenter from './notifications/NotificationCenter';
import { useCart } from '../contexts/CartContext';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', href: '/' },
    { name: 'Destinos', href: '/#destinations' },
    { name: 'Experiencias', href: '/#experiences' },
    { name: 'Testimonios', href: '/#testimonials' },
    { name: 'Sobre Nosotros', href: '/#about' },
    { name: 'Contacto', href: '/#contact' }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowUserMenu(false);
  };

  const getDashboardRoute = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'admin': return '/admin/dashboard';
      case 'agent': return '/agent/dashboard';
      case 'operator': return '/operator/dashboard';
      default: return '/dashboard';
    }
  };

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
              {isAuthenticated ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 hover:text-primary-200"
                  >
                    <User className="w-3 h-3" />
                    {user?.first_name || 'Mi Cuenta'}
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                      <Link
                        to={getDashboardRoute()}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="inline w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="inline w-4 h-4 mr-2" />
                        Mi Perfil
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                      >
                        <LogOut className="inline w-4 h-4 mr-2" />
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 hover:text-primary-200"
                >
                  <User className="w-3 h-3" />
                  Iniciar Sesión
                </Link>
              )}
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
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-secondary-700 bg-clip-text text-transparent">
                    Spirit Tours
                  </h1>
                  <p className="text-xs text-gray-600">Viajes Espirituales</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  {/* Notifications */}
                  <NotificationCenter />
                  
                  {/* Cart */}
                  <Link 
                    to="/cart"
                    className="relative text-gray-700 hover:text-primary-600 font-medium p-2"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to={getDashboardRoute()}
                    className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Mi Dashboard
                  </Link>
                </>
              ) : (
                <>
                  {/* Cart for non-authenticated users */}
                  <Link 
                    to="/cart"
                    className="relative text-gray-700 hover:text-primary-600 font-medium p-2"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </Link>
                  
                  <Link
                    to="/register"
                    className="text-gray-700 hover:text-primary-600 font-medium"
                  >
                    Registrarse
                  </Link>
                  <Link
                    to="/login"
                    className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Iniciar Sesión
                  </Link>
                </>
              )}
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
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-gray-700 hover:text-primary-600 font-medium py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/cart"
                      className="text-gray-700 hover:text-primary-600 font-medium py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      🛒 Mi Carrito
                    </Link>
                    <Link
                      to={getDashboardRoute()}
                      className="text-gray-700 hover:text-primary-600 font-medium py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-red-600 hover:text-red-700 font-medium py-2 text-left"
                    >
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-gray-700 hover:text-primary-600 font-medium py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      to="/register"
                      className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-3 rounded-lg font-semibold text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Registrarse
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;