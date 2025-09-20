import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="gradient-bg text-white py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <i className="fas fa-brain mr-3"></i>Spirit Tours
              </h1>
              <p className="text-xl">Plataforma IA Completa - Dashboard Principal</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">25 Agentes IA</div>
              <div className="text-lg">Sistema Híbrido Avanzado</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Track 1 Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <i className="fas fa-bolt text-3xl text-blue-600 mr-4"></i>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Track 1</h3>
                <p className="text-blue-600">Mejoras Críticas</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Multi-Channel Integration</span>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">EN PROGRESO</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">ContentMaster AI</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">PENDIENTE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">CompetitiveIntel AI</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">PENDIENTE</span>
              </div>
            </div>
          </div>

          {/* Track 2 Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <i className="fas fa-cogs text-3xl text-green-600 mr-4"></i>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Track 2</h3>
                <p className="text-green-600">Sistemas Avanzados</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">SecurityGuard AI</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">PENDIENTE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">MarketEntry AI</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">PENDIENTE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">InfluencerMatch AI</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">PENDIENTE</span>
              </div>
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <i className="fas fa-link text-3xl text-purple-600 mr-4"></i>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Integración</h3>
                <p className="text-purple-600">Sistema Unificado</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Infrastructure Setup</span>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">EN PROGRESO</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Testing Framework</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">PENDIENTE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Deployment Pipeline</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">PENDIENTE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold gradient-text mb-8 text-center">
            <i className="fas fa-calendar-alt mr-3"></i>Timeline de Desarrollo - 12 Semanas
          </h2>
          
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            {/* Week 1-2 */}
            <div className="relative pl-12 pb-8">
              <div className="absolute left-2 w-4 h-4 bg-blue-500 rounded-full"></div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-2">
                  <i className="fas fa-rocket mr-2"></i>Semanas 1-2: Foundation Setup
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Track 1:</h4>
                    <ul className="space-y-1">
                      <li>• WhatsApp Business API integration</li>
                      <li>• Telegram bot development</li>
                      <li>• Social media connectors setup</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Track 2:</h4>
                    <ul className="space-y-1">
                      <li>• SecurityGuard AI architecture</li>
                      <li>• Risk assessment algorithms</li>
                      <li>• Data integration pipelines</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="relative pl-12 pb-8">
              <div className="absolute left-2 w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
              <div className="bg-yellow-50 border-2 border-yellow-300 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-2 text-yellow-800">
                  <i className="fas fa-tools mr-2"></i>ESTADO ACTUAL: Configuración Inicial
                </h3>
                <p className="text-yellow-700">
                  ✅ Estructura del proyecto creada<br/>
                  🔄 Frontend React con Tailwind configurado<br/>
                  ⏳ Próximo: Backend FastAPI + AI Agents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow-lg transition-colors">
            <i className="fas fa-play text-2xl mb-2"></i>
            <h3 className="text-lg font-bold">Iniciar Track 1</h3>
            <p className="text-sm opacity-90">Multi-Channel Integration</p>
          </button>
          
          <button className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow-lg transition-colors">
            <i className="fas fa-brain text-2xl mb-2"></i>
            <h3 className="text-lg font-bold">Configurar AI Agents</h3>
            <p className="text-sm opacity-90">Backend + ML Models</p>
          </button>
          
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow-lg transition-colors">
            <i className="fas fa-chart-line text-2xl mb-2"></i>
            <h3 className="text-lg font-bold">Ver Analytics</h3>
            <p className="text-sm opacity-90">Dashboard Completo</p>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="gradient-bg text-white py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-lg opacity-90">
            Spirit Tours - Plataforma IA Híbrida | Desarrollo en Progreso
          </p>
          <p className="text-sm opacity-75 mt-2">
            Sistema más avanzado del mercado turístico mundial - 25 Agentes IA Especializados
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
