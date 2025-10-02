import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

// Componentes principales
import Header from './components/Header';
import Hero from './components/Hero';
import PopularDestinations from './components/PopularDestinations';
import SpiritualExperiences from './components/SpiritualExperiences';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';

// Componentes de autenticación
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import UserProfile from './components/auth/UserProfile';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import VerifyEmail from './components/auth/VerifyEmail';

// Dashboards
import CustomerDashboard from './components/dashboards/CustomerDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import AgentDashboard from './components/dashboards/AgentDashboard';
import OperatorDashboard from './components/dashboards/OperatorDashboard';

// Componentes de búsqueda y reservas
import SearchEngine from './components/booking/SearchEngine';
import SearchResults from './components/booking/SearchResults';
import TourDetails from './components/booking/TourDetails';
import BookingCart from './components/booking/BookingCart';
import CheckoutProcess from './components/booking/CheckoutProcess';
import OrderConfirmation from './components/booking/OrderConfirmation';

// Componente de IA
import AIAssistant from './components/ai/AIAssistant';

// Guards de rutas
import PrivateRoute from './components/auth/PrivateRoute';
import PublicRoute from './components/auth/PublicRoute';

import './App.css';

// Página principal con todas las secciones
const HomePage = () => (
  <>
    <Header />
    <main>
      <section id="home">
        <Hero />
      </section>
      <section id="search" className="py-8 bg-gray-50">
        <SearchEngine />
      </section>
      <section id="destinations">
        <PopularDestinations />
      </section>
      <section id="experiences">
        <SpiritualExperiences />
      </section>
      <section id="testimonials">
        <Testimonials />
      </section>
    </main>
    <Footer />
    <AIAssistant />
  </>
);

// Layout para páginas con header y footer
const MainLayout = ({ children }) => (
  <>
    <Header />
    <main className="min-h-screen">
      {children}
    </main>
    <Footer />
    <AIAssistant />
  </>
);

// Layout para dashboards
const DashboardLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-100">
    {children}
    <AIAssistant />
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen">
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Rutas de búsqueda y reservas (públicas con opciones privadas) */}
            <Route path="/search" element={
              <MainLayout>
                <SearchEngine />
              </MainLayout>
            } />
            <Route path="/search-results" element={
              <MainLayout>
                <SearchResults />
              </MainLayout>
            } />
            <Route path="/tour/:id" element={
              <MainLayout>
                <TourDetails />
              </MainLayout>
            } />
            
            {/* Rutas de proceso de reserva (carrito público, checkout privado) */}
            <Route path="/cart" element={
              <MainLayout>
                <BookingCart />
              </MainLayout>
            } />
            <Route path="/checkout" element={
              <PrivateRoute>
                <MainLayout>
                  <CheckoutProcess />
                </MainLayout>
              </PrivateRoute>
            } />
            <Route path="/order-confirmation/:orderId" element={
              <PrivateRoute>
                <MainLayout>
                  <OrderConfirmation />
                </MainLayout>
              </PrivateRoute>
            } />

            {/* Rutas privadas - Perfil */}
            <Route path="/profile" element={
              <PrivateRoute>
                <MainLayout>
                  <UserProfile />
                </MainLayout>
              </PrivateRoute>
            } />

            {/* Dashboards según rol */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <DashboardLayout>
                  <CustomerDashboard />
                </DashboardLayout>
              </PrivateRoute>
            } />
            <Route path="/admin/*" element={
              <PrivateRoute requiredRole="admin">
                <DashboardLayout>
                  <AdminDashboard />
                </DashboardLayout>
              </PrivateRoute>
            } />
            <Route path="/agent/*" element={
              <PrivateRoute requiredRole="agent">
                <DashboardLayout>
                  <AgentDashboard />
                </DashboardLayout>
              </PrivateRoute>
            } />
            <Route path="/operator/*" element={
              <PrivateRoute requiredRole="operator">
                <DashboardLayout>
                  <OperatorDashboard />
                </DashboardLayout>
              </PrivateRoute>
            } />

            {/* Ruta 404 */}
            <Route path="*" element={
              <MainLayout>
                <div className="flex flex-col items-center justify-center py-20">
                  <h1 className="text-4xl font-bold text-gray-800 mb-4">404 - Página no encontrada</h1>
                  <p className="text-gray-600 mb-8">La página que buscas no existe</p>
                  <a href="/" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition">
                    Volver al inicio
                  </a>
                </div>
              </MainLayout>
            } />
          </Routes>
        </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;