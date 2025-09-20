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
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">✅ ACTIVO 95%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">ContentMaster AI</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">✅ ACTIVO 90%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">CompetitiveIntel AI</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">✅ ACTIVO 85%</span>
              </div>
            </div>
            
            {/* Progress Bar Track 1 */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-blue-700">Progreso Track 1</span>
                <span className="text-xs font-semibold text-blue-700">90%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{width: '90%'}}></div>
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

        {/* Live Metrics Dashboard */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold gradient-text mb-6 text-center">
            <i className="fas fa-chart-bar mr-3"></i>Métricas en Vivo - Últimas 24h
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">156</div>
              <div className="text-sm text-blue-800">Conversaciones Activas</div>
              <div className="text-xs text-blue-600 mt-1">↗ +23% vs ayer</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">47</div>
              <div className="text-sm text-green-800">Contenido Generado</div>
              <div className="text-xs text-green-600 mt-1">↗ +15% vs ayer</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">12</div>
              <div className="text-sm text-purple-800">Alertas Competitivas</div>
              <div className="text-xs text-purple-600 mt-1">↑ +3 nuevas</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">94.5%</div>
              <div className="text-sm text-orange-800">Satisfacción Cliente</div>
              <div className="text-xs text-orange-600 mt-1">↗ +2.1% vs ayer</div>
            </div>
          </div>
        </div>

        {/* Agent Performance Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                <i className="fas fa-comments text-blue-600 mr-2"></i>MultiChannel AI
              </h3>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">ACTIVO</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>WhatsApp:</span>
                <span className="font-semibold">145 mensajes</span>
              </div>
              <div className="flex justify-between">
                <span>Telegram:</span>
                <span className="font-semibold">89 mensajes</span>
              </div>
              <div className="flex justify-between">
                <span>Tiempo respuesta:</span>
                <span className="font-semibold text-green-600">12 seg</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                <i className="fas fa-magic text-green-600 mr-2"></i>ContentMaster AI
              </h3>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">ACTIVO</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Blogs generados:</span>
                <span className="font-semibold">23 hoy</span>
              </div>
              <div className="flex justify-between">
                <span>Posts sociales:</span>
                <span className="font-semibold">24 hoy</span>
              </div>
              <div className="flex justify-between">
                <span>SEO Score promedio:</span>
                <span className="font-semibold text-green-600">8.7/10</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                <i className="fas fa-search text-purple-600 mr-2"></i>CompetitiveIntel AI
              </h3>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">ACTIVO</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Competidores monitoreados:</span>
                <span className="font-semibold">7 activos</span>
              </div>
              <div className="flex justify-between">
                <span>Amenazas detectadas:</span>
                <span className="font-semibold text-orange-600">3 nuevas</span>
              </div>
              <div className="flex justify-between">
                <span>Último análisis:</span>
                <span className="font-semibold">5 min ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <button className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow-lg transition-colors">
            <i className="fas fa-plus text-2xl mb-2"></i>
            <h3 className="text-lg font-bold">Generar Contenido</h3>
            <p className="text-sm opacity-90">ContentMaster AI</p>
          </button>
          
          <button className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow-lg transition-colors">
            <i className="fas fa-search-dollar text-2xl mb-2"></i>
            <h3 className="text-lg font-bold">Análisis Competitivo</h3>
            <p className="text-sm opacity-90">CompetitiveIntel AI</p>
          </button>
          
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow-lg transition-colors">
            <i className="fas fa-comments text-2xl mb-2"></i>
            <h3 className="text-lg font-bold">Centro de Mensajes</h3>
            <p className="text-sm opacity-90">MultiChannel AI</p>
          </button>

          <button className="bg-orange-600 hover:bg-orange-700 text-white p-6 rounded-lg shadow-lg transition-colors">
            <i className="fas fa-cogs text-2xl mb-2"></i>
            <h3 className="text-lg font-bold">Iniciar Track 2</h3>
            <p className="text-sm opacity-90">Sistemas Avanzados</p>
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
