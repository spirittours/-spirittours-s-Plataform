/**
 * AI Admin Panel - FASE 2: IA MULTI-MODELO UPGRADE
 * Panel completo para administrar múltiples modelos de IA
 * Permite alternar dinámicamente entre proveedores
 * Valor: $100,000 - IA Multi-Modelo Enterprise
 */

import React, { useState, useEffect } from 'react';
import {
  FiBrain, FiSettings, FiBarChart3, FiZap, FiDollarSign,
  FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw,
  FiPlay, FiPause, FiSliders, FiTrendingUp, FiTrendingDown,
  FiCpu, FiServer, FiGlobe, FiShield, FiEye, FiToggleLeft,
  FiToggleRight, FiStar, FiAward, FiTarget, FiLayers
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useRBACStore } from '../../store/rbacStore';
import toast from 'react-hot-toast';

// Interfaces para IA Multi-Modelo
interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
  strengths: string[];
  use_cases: string[];
  available: boolean;
  status?: 'active' | 'inactive' | 'error';
  responseTime?: number;
  successRate?: number;
  usage?: number;
}

interface AIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCostUSD: number;
  totalSuccessRate: string;
  averageCostPerRequest: number;
  modelsAvailable: number;
  modelUsage: { [key: string]: number };
  averageResponseTime: { [key: string]: number };
  errorRates: { [key: string]: number };
}

interface AIConfig {
  defaultModel: string;
  cacheEnabled: boolean;
  rateLimitEnabled: boolean;
  loadBalancing: boolean;
  maxRetries: number;
  timeout: number;
}

const AIAdminPanel: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useRBACStore();

  // Estados principales
  const [activeTab, setActiveTab] = useState<'dashboard' | 'models' | 'config' | 'testing'>('dashboard');
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [aiMetrics, setAiMetrics] = useState<AIMetrics | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Estados para testing
  const [testPrompt, setTestPrompt] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [consensusMode, setConsensusMode] = useState(false);
  const [selectedTestModels, setSelectedTestModels] = useState<string[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadAIData();
      
      // Auto-refresh cada 30 segundos
      const interval = setInterval(loadAIData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isAdmin]);

  const loadAIData = async () => {
    try {
      const [modelsRes, metricsRes, configRes] = await Promise.all([
        fetch('/api/ai/models', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/ai/metrics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/ai/config', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (modelsRes.ok) {
        const models = await modelsRes.json();
        setAiModels(models.data || []);
      }

      if (metricsRes.ok) {
        const metrics = await metricsRes.json();
        setAiMetrics(metrics.data || null);
      }

      if (configRes.ok) {
        const config = await configRes.json();
        setAiConfig(config.data || null);
        setSelectedModel(config.data?.defaultModel || '');
      }
    } catch (error) {
      console.error('Error loading AI data:', error);
      toast.error('Error al cargar datos de IA');
    }
  };

  // Cambiar modelo por defecto
  const changeDefaultModel = async (modelId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ defaultModel: modelId })
      });

      if (response.ok) {
        setSelectedModel(modelId);
        if (aiConfig) {
          setAiConfig({ ...aiConfig, defaultModel: modelId });
        }
        toast.success(`Modelo por defecto cambiado a ${modelId}`);
      } else {
        toast.error('Error al cambiar modelo por defecto');
      }
    } catch (error) {
      console.error('Error changing default model:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar configuración
  const updateConfig = async (newConfig: Partial<AIConfig>) => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        setAiConfig(prev => prev ? { ...prev, ...newConfig } : null);
        toast.success('Configuración actualizada');
      } else {
        toast.error('Error al actualizar configuración');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Test de modelos
  const testModels = async () => {
    if (!testPrompt.trim()) {
      toast.error('Ingresa un prompt para testear');
      return;
    }

    try {
      setLoading(true);
      setTestResults([]);

      if (consensusMode && selectedTestModels.length > 1) {
        // Test de consenso
        const response = await fetch('/api/ai/test/consensus', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: testPrompt,
            models: selectedTestModels
          })
        });

        if (response.ok) {
          const result = await response.json();
          setTestResults([result.data]);
          toast.success('Test de consenso completado');
        }
      } else {
        // Test individual
        const model = selectedTestModels[0] || selectedModel;
        const response = await fetch('/api/ai/test', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: testPrompt,
            modelId: model
          })
        });

        if (response.ok) {
          const result = await response.json();
          setTestResults([result.data]);
          toast.success('Test completado');
        }
      }
    } catch (error) {
      console.error('Error testing models:', error);
      toast.error('Error al testear modelos');
    } finally {
      setLoading(false);
    }
  };

  // Obtener color de estado del modelo
  const getModelStatusColor = (model: AIModel) => {
    if (!model.available) return 'text-red-500';
    if (model.successRate && model.successRate > 95) return 'text-green-500';
    if (model.successRate && model.successRate > 85) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Obtener icono del proveedor
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'google': return '🌟';
      case 'meta': return '🦙';
      case 'xai': return '🚀';
      case 'alibaba': return '🐉';
      case 'deepseek': return '🔍';
      case 'mistral': return '🇪🇺';
      default: return '🤖';
    }
  };

  // Renderizar dashboard principal
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div className="bg-white rounded-lg shadow-sm border p-6" whileHover={{ scale: 1.02 }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900">{aiMetrics?.totalRequests || 0}</p>
              <p className="text-sm text-green-600">
                {aiMetrics?.totalSuccessRate || '0%'} éxito
              </p>
            </div>
            <FiBarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </motion.div>

        <motion.div className="bg-white rounded-lg shadow-sm border p-6" whileHover={{ scale: 1.02 }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tokens Usados</p>
              <p className="text-3xl font-bold text-gray-900">
                {aiMetrics?.totalTokensUsed?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-500">tokens procesados</p>
            </div>
            <FiCpu className="h-8 w-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div className="bg-white rounded-lg shadow-sm border p-6" whileHover={{ scale: 1.02 }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Costo Total</p>
              <p className="text-3xl font-bold text-gray-900">
                ${aiMetrics?.totalCostUSD?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-500">
                ${aiMetrics?.averageCostPerRequest?.toFixed(4) || '0.0000'} por request
              </p>
            </div>
            <FiDollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </motion.div>

        <motion.div className="bg-white rounded-lg shadow-sm border p-6" whileHover={{ scale: 1.02 }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Modelos Activos</p>
              <p className="text-3xl font-bold text-gray-900">
                {aiModels.filter(m => m.available).length}
              </p>
              <p className="text-sm text-gray-500">
                de {aiModels.length} disponibles
              </p>
            </div>
            <FiBrain className="h-8 w-8 text-indigo-600" />
          </div>
        </motion.div>
      </div>

      {/* Modelo por defecto y configuración rápida */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Configuración Rápida</h3>
          <button
            onClick={loadAIData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiRefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo Por Defecto
            </label>
            <select
              value={selectedModel}
              onChange={(e) => changeDefaultModel(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {aiModels.filter(m => m.available).map(model => (
                <option key={model.id} value={model.id}>
                  {getProviderIcon(model.provider)} {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Cache Habilitado</span>
              <button
                onClick={() => updateConfig({ cacheEnabled: !aiConfig?.cacheEnabled })}
                className={`${aiConfig?.cacheEnabled ? 'text-blue-600' : 'text-gray-400'} transition-colors`}
              >
                {aiConfig?.cacheEnabled ? <FiToggleRight className="h-6 w-6" /> : <FiToggleLeft className="h-6 w-6" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Rate Limiting</span>
              <button
                onClick={() => updateConfig({ rateLimitEnabled: !aiConfig?.rateLimitEnabled })}
                className={`${aiConfig?.rateLimitEnabled ? 'text-blue-600' : 'text-gray-400'} transition-colors`}
              >
                {aiConfig?.rateLimitEnabled ? <FiToggleRight className="h-6 w-6" /> : <FiToggleLeft className="h-6 w-6" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Load Balancing</span>
              <button
                onClick={() => updateConfig({ loadBalancing: !aiConfig?.loadBalancing })}
                className={`${aiConfig?.loadBalancing ? 'text-blue-600' : 'text-gray-400'} transition-colors`}
              >
                {aiConfig?.loadBalancing ? <FiToggleRight className="h-6 w-6" /> : <FiToggleLeft className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Uso por modelo */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Uso por Modelo</h3>
        <div className="space-y-4">
          {aiModels.map(model => {
            const usage = aiMetrics?.modelUsage?.[model.id] || 0;
            const responseTime = aiMetrics?.averageResponseTime?.[model.id] || 0;
            const errorRate = aiMetrics?.errorRates?.[model.id] || 0;
            
            return (
              <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getProviderIcon(model.provider)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{model.name}</p>
                    <p className="text-sm text-gray-500">{model.provider}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{usage}</p>
                    <p className="text-gray-500">requests</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{Math.round(responseTime)}ms</p>
                    <p className="text-gray-500">avg time</p>
                  </div>
                  
                  <div className="text-center">
                    <p className={`font-medium ${errorRate > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
                      {(errorRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-gray-500">error rate</p>
                  </div>

                  <div className={`w-3 h-3 rounded-full ${getModelStatusColor(model).replace('text-', 'bg-')}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Renderizar gestión de modelos
  const renderModels = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Modelos IA</h2>
        <div className="text-sm text-gray-500">
          {aiModels.filter(m => m.available).length} de {aiModels.length} modelos activos
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiModels.map(model => (
          <motion.div
            key={model.id}
            className={`bg-white rounded-lg shadow-sm border p-6 ${
              selectedModel === model.id ? 'ring-2 ring-blue-500' : ''
            }`}
            whileHover={{ scale: 1.02 }}
            onClick={() => !loading && changeDefaultModel(model.id)}
            style={{ cursor: loading ? 'wait' : 'pointer' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getProviderIcon(model.provider)}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{model.name}</h3>
                  <p className="text-sm text-gray-500">{model.provider}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {selectedModel === model.id && (
                  <FiStar className="h-5 w-5 text-yellow-500" />
                )}
                <div className={`w-3 h-3 rounded-full ${
                  model.available ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{model.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Max Tokens:</span>
                <span className="font-medium">{model.maxTokens?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Costo/1K tokens:</span>
                <span className="font-medium">${model.costPer1kTokens?.toFixed(4)}</span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Fortalezas:</p>
              <div className="flex flex-wrap gap-1">
                {model.strengths?.map((strength, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Casos de Uso:</p>
              <div className="flex flex-wrap gap-1">
                {model.use_cases?.map((useCase, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                  >
                    {useCase.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // Renderizar testing
  const renderTesting = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Testing de Modelos IA</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={consensusMode}
              onChange={(e) => setConsensusMode(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Modo Consenso</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt de Prueba
            </label>
            <textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Ingresa un prompt para testear los modelos..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {consensusMode ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Modelos para Consenso (mínimo 2)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {aiModels.filter(m => m.available).map(model => (
                  <label key={model.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedTestModels.includes(model.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTestModels([...selectedTestModels, model.id]);
                        } else {
                          setSelectedTestModels(selectedTestModels.filter(id => id !== model.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{getProviderIcon(model.provider)} {model.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo a Testear
              </label>
              <select
                value={selectedTestModels[0] || selectedModel}
                onChange={(e) => setSelectedTestModels([e.target.value])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {aiModels.filter(m => m.available).map(model => (
                  <option key={model.id} value={model.id}>
                    {getProviderIcon(model.provider)} {model.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={testModels}
            disabled={loading || !testPrompt.trim() || (consensusMode && selectedTestModels.length < 2)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <FiRefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Ejecutando Test...
              </>
            ) : (
              <>
                <FiPlay className="-ml-1 mr-2 h-4 w-4" />
                Ejecutar Test
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Resultados del Test {consensusMode ? 'de Consenso' : ''}
              </h3>
              
              {consensusMode ? (
                <div>
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Resumen del Consenso:</h4>
                    <p>Modelos exitosos: {result.summary?.successfulModels} de {result.summary?.totalModels}</p>
                    <p>Tasa de éxito: {result.summary?.successRate}</p>
                    <p>Tiempo promedio: {result.summary?.averageProcessingTime}ms</p>
                    <p>Costo total: ${result.summary?.totalCost?.toFixed(4)}</p>
                  </div>
                  
                  <div className="space-y-3">
                    {result.consensus?.map((modelResult: any, idx: number) => (
                      <div key={idx} className={`p-4 border rounded-lg ${
                        modelResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {aiModels.find(m => m.id === selectedTestModels[idx])?.name}
                          </span>
                          {modelResult.success ? (
                            <FiCheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <FiXCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        {modelResult.success ? (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">
                              {modelResult.data.processingTime}ms • ${modelResult.data.estimatedCost?.toFixed(4)}
                            </p>
                            <p className="text-sm">{modelResult.data.result.content}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-red-600">{modelResult.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {result.success ? (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {result.model} • {result.processingTime}ms • ${result.estimatedCost?.toFixed(4)}
                        </span>
                        <FiCheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p>{result.result.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-red-600">
                      <FiXCircle className="h-5 w-5" />
                      <span>{result.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Verificar permisos
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiShield className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso Restringido</h3>
          <p className="mt-1 text-sm text-gray-500">Solo administradores pueden acceder al panel de IA</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <FiBrain className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">AI Multi-Modelo</h1>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                FASE 2: $100K
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {aiModels.filter(m => m.available).length} modelos activos
            </div>
          </div>
        </div>
      </div>

      {/* Navegación de tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: FiBarChart3 },
              { id: 'models', name: 'Modelos', icon: FiBrain },
              { id: 'config', name: 'Configuración', icon: FiSettings },
              { id: 'testing', name: 'Testing', icon: FiZap }
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'models' && renderModels()}
          {activeTab === 'testing' && renderTesting()}
          {activeTab === 'config' && (
            <div className="text-center py-12">
              <FiSettings className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Configuración Avanzada</h3>
              <p className="mt-1 text-sm text-gray-500">Panel de configuración en desarrollo</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AIAdminPanel;