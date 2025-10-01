import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import PopularDestinations from './components/PopularDestinations';
import SpiritualExperiences from './components/SpiritualExperiences';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section id="home">
          <Hero />
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
    </div>
  );
}

export default App;