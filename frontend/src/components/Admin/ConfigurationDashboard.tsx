import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Database,
  MessageSquare,
  Mail,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Play,
  Pause,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Globe,
  Smartphone,
  Link2
} from 'lucide-react';

interface ConfigItem {
  id: string;
  name: string;
  category: 'oauth' | 'api' | 'security' | 'migration' | 'training';
  status: 'configured' | 'pending' | 'error' | 'testing';
  provider?: string;
  lastSync?: string;
  description: string;
  requiresApproval?: boolean;
  configurable: boolean;
}

interface OAuthCredentials {
  provider: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  webhookUrl?: string;
}

interface MigrationTask {
  id: string;
  name: string;
  source: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalRecords?: number;
  processedRecords?: number;
  errors?: number;
  startTime?: string;
  endTime?: string;
}

const ConfigurationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'migration' | 'security' | 'training'>('oauth');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [configurations, setConfigurations] = useState<ConfigItem[]>([
    {
      id: 'google-oauth',
      name: 'Google Contacts API',
      category: 'oauth',
      status: 'pending',
      provider: 'Google',
      description: 'Sincronización bidireccional con Google Contacts',
      configurable: true
    },
    {
      id: 'outlook-oauth',
      name: 'Microsoft Outlook',
      category: 'oauth',
      status: 'pending',
      provider: 'Microsoft',
      description: 'Integración con Azure AD y Outlook',
      configurable: true
    },
    {
      id: 'whatsapp-api',
      name: 'WhatsApp Business API',
      category: 'api',
      status: 'pending',
      provider: 'Meta',
      description: 'Envío de itinerarios y notificaciones',
      configurable: true
    },
    {
      id: 'data-migration',
      name: 'Migración de Datos',
      category: 'migration',
      status: 'pending',
      description: 'Herramienta de importación y limpieza de datos',
      configurable: true
    },
    {
      id: 'security-training',
      name: 'Capacitación de Seguridad',
      category: 'training',
      status: 'pending',
      description: 'Módulos de entrenamiento para empleados',
      requiresApproval: true,
      configurable: true
    }
  ]);

  const [migrationTasks, setMigrationTasks] = useState<MigrationTask[]>([]);
  const [oauthCredentials, setOAuthCredentials] = useState<Record<string, Partial<OAuthCredentials>>>({
    'google-oauth': {
      provider: 'Google',
      clientId: '',
      clientSecret: '',
      redirectUri: 'https://spirittours.com/auth/google/callback',
      scopes: ['https://www.googleapis.com/auth/contacts']
    },
    'outlook-oauth': {
      provider: 'Microsoft',
      clientId: '',
      clientSecret: '',
      redirectUri: 'https://spirittours.com/auth/microsoft/callback',
      scopes: ['Contacts.Read', 'Contacts.ReadWrite']
    },
    'whatsapp-api': {
      provider: 'WhatsApp',
      clientId: '',
      clientSecret: '',
      webhookUrl: 'https://spirittours.com/webhooks/whatsapp',
      scopes: []
    }
  });

  const handleOAuthSave = async (providerId: string) => {
    const creds = oauthCredentials[providerId];
    if (!creds?.clientId || !creds?.clientSecret) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      // Simular guardado de configuración
      const response = await fetch('/api/admin/oauth/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          credentials: creds
        })
      });

      if (response.ok) {
        setConfigurations(prev =>
          prev.map(config =>
            config.id === providerId
              ? { ...config, status: 'configured', lastSync: new Date().toISOString() }
              : config
          )
        );
        alert('Configuración guardada exitosamente');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error al guardar la configuración');
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      // Simular test de conexión
      const response = await fetch(`/api/admin/oauth/test/${providerId}`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('✅ Conexión exitosa');
        setConfigurations(prev =>
          prev.map(config =>
            config.id === providerId
              ? { ...config, status: 'configured' }
              : config
          )
        );
      } else {
        alert('❌ Error en la conexión. Verifique las credenciales.');
      }
    } catch (error) {
      alert('❌ Error al probar la conexión');
    } finally {
      setTestingProvider(null);
    }
  };

  const startMigration = async (source: string) => {
    const newTask: MigrationTask = {
      id: `migration-${Date.now()}`,
      name: `Importación desde ${source}`,
      source,
      status: 'running',
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      startTime: new Date().toISOString()
    };

    setMigrationTasks(prev => [...prev, newTask]);

    // Simular progreso de migración
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setMigrationTasks(prev =>
        prev.map(task =>
          task.id === newTask.id
            ? {
                ...task,
                progress,
                processedRecords: Math.floor((progress / 100) * 1000),
                totalRecords: 1000
              }
            : task
        )
      );

      if (progress >= 100) {
        clearInterval(interval);
        setMigrationTasks(prev =>
          prev.map(task =>
            task.id === newTask.id
              ? {
                  ...task,
                  status: 'completed',
                  endTime: new Date().toISOString()
                }
              : task
          )
        );
      }
    }, 1000);
  };

  const renderOAuthConfiguration = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2 text-blue-500" />
          Configuración de OAuth 2.0
        </h3>

        {configurations
          .filter(c => c.category === 'oauth' || c.category === 'api')
          .map(config => (
            <div key={config.id} className="border rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  {config.provider === 'Google' && <Globe className="h-5 w-5 mr-2 text-blue-500" />}
                  {config.provider === 'Microsoft' && <Mail className="h-5 w-5 mr-2 text-blue-600" />}
                  {config.provider === 'Meta' && <MessageSquare className="h-5 w-5 mr-2 text-green-500" />}
                  <h4 className="font-medium">{config.name}</h4>
                  {config.status === 'configured' && (
                    <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                  )}
                  {config.status === 'error' && (
                    <XCircle className="h-4 w-4 ml-2 text-red-500" />
                  )}
                  {config.status === 'pending' && (
                    <AlertTriangle className="h-4 w-4 ml-2 text-yellow-500" />
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleTestConnection(config.id)}
                    disabled={testingProvider === config.id}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    {testingProvider === config.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => window.open(`/docs/OAUTH_CONFIGURATION_GUIDE.md#${config.provider?.toLowerCase()}`, '_blank')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    📚 Guía
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{config.description}</p>

              {config.configurable && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client ID / App ID
                    </label>
                    <input
                      type="text"
                      value={oauthCredentials[config.id]?.clientId || ''}
                      onChange={(e) =>
                        setOAuthCredentials(prev => ({
                          ...prev,
                          [config.id]: {
                            ...prev[config.id],
                            clientId: e.target.value
                          }
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder={`${config.provider} Client ID`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Secret / API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets[config.id] ? 'text' : 'password'}
                        value={oauthCredentials[config.id]?.clientSecret || ''}
                        onChange={(e) =>
                          setOAuthCredentials(prev => ({
                            ...prev,
                            [config.id]: {
                              ...prev[config.id],
                              clientSecret: e.target.value
                            }
                          }))
                        }
                        className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder={`${config.provider} Secret`}
                      />
                      <button
                        onClick={() => setShowSecrets(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
                        className="absolute right-2 top-2.5"
                      >
                        {showSecrets[config.id] ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {config.id === 'whatsapp-api' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Webhook URL
                      </label>
                      <input
                        type="text"
                        value={oauthCredentials[config.id]?.webhookUrl || ''}
                        onChange={(e) =>
                          setOAuthCredentials(prev => ({
                            ...prev,
                            [config.id]: {
                              ...prev[config.id],
                              webhookUrl: e.target.value
                            }
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="https://spirittours.com/webhooks/whatsapp"
                      />
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOAuthSave(config.id)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Configuración
                    </button>
                    {config.status === 'configured' && (
                      <button
                        onClick={() => handleTestConnection(config.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Sincronizar Ahora
                      </button>
                    )}
                  </div>

                  {config.lastSync && (
                    <p className="text-xs text-gray-500">
                      Última sincronización: {new Date(config.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );

  const renderMigrationTools = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2 text-purple-500" />
          Herramientas de Migración de Datos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => startMigration('CSV')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium">Importar desde CSV</p>
            <p className="text-xs text-gray-500 mt-1">Archivos .csv con contactos</p>
          </button>

          <button
            onClick={() => startMigration('Excel')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium">Importar desde Excel</p>
            <p className="text-xs text-gray-500 mt-1">Archivos .xlsx, .xls</p>
          </button>

          <button
            onClick={() => startMigration('Google Contacts')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
          >
            <Globe className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium">Sincronizar Google</p>
            <p className="text-xs text-gray-500 mt-1">Importar contactos de Google</p>
          </button>
        </div>

        {migrationTasks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Tareas de Migración Activas</h4>
            {migrationTasks.map(task => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{task.name}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700' :
                    task.status === 'failed' ? 'bg-red-100 text-red-700' :
                    task.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.status === 'running' ? 'En progreso' :
                     task.status === 'completed' ? 'Completado' :
                     task.status === 'failed' ? 'Fallido' : 'Pendiente'}
                  </span>
                </div>
                
                {task.status === 'running' && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {task.processedRecords || 0} de {task.totalRecords || 0} registros procesados
                    </p>
                  </>
                )}

                {task.status === 'completed' && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-green-600">
                      ✅ {task.totalRecords} registros importados exitosamente
                    </p>
                    <button className="text-sm text-blue-500 hover:underline">
                      Ver Reporte
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Configuración Avanzada</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Detectar y fusionar duplicados automáticamente</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Validar formato de emails y teléfonos</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">Ejecutar en modo de prueba (dry-run)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Generar reporte de calidad de datos</span>
            </label>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
            <Download className="h-4 w-4 inline mr-2" />
            Descargar Plantilla CSV
          </button>
          <button 
            onClick={() => window.open('/docs/data_migration_guide.pdf', '_blank')}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            📚 Guía de Migración
          </button>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-red-500" />
          Políticas de Seguridad y Control de Acceso
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Límites de Exportación por Rol</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Empleado</span>
                <input type="number" defaultValue="100" className="w-20 px-2 py-1 border rounded" />
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Supervisor</span>
                <input type="number" defaultValue="500" className="w-20 px-2 py-1 border rounded" />
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Gerente</span>
                <input type="number" defaultValue="2000" className="w-20 px-2 py-1 border rounded" />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Director</span>
                <span className="text-sm text-gray-500">Sin límite</span>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Controles Anti-Fraude</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Auditoría completa de exportaciones</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Aprobación para exportaciones masivas</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Watermark en exportaciones</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Notificación de actividad sospechosa</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Bloqueo automático por intentos excesivos</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-xs text-yellow-700">Último 24h</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">3</p>
            <p className="text-sm text-yellow-600">Alertas de Seguridad</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-xs text-green-700">Este mes</span>
            </div>
            <p className="text-2xl font-bold text-green-700">127</p>
            <p className="text-sm text-green-600">Exportaciones Auditadas</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-xs text-red-700">Total</span>
            </div>
            <p className="text-2xl font-bold text-red-700">0</p>
            <p className="text-sm text-red-600">Intentos Bloqueados</p>
          </div>
        </div>

        <div className="mt-6">
          <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            <Shield className="h-4 w-4 inline mr-2" />
            Aplicar Políticas
          </button>
          <button 
            onClick={() => window.open('/docs/SECURITY_POLICIES_GUIDE.md', '_blank')}
            className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            📚 Ver Guía Completa
          </button>
        </div>
      </div>
    </div>
  );

  const renderTrainingModule = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-green-500" />
          Módulo de Capacitación del Personal
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">📚 Introducción al Sistema</h4>
            <p className="text-sm text-gray-600 mb-3">Conceptos básicos y navegación</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">15 minutos</span>
              <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                Iniciar
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">🔒 Políticas de Seguridad</h4>
            <p className="text-sm text-gray-600 mb-3">Manejo seguro de datos</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">30 minutos</span>
              <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                Iniciar
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">📊 Exportación de Datos</h4>
            <p className="text-sm text-gray-600 mb-3">Límites y procedimientos</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">20 minutos</span>
              <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                Iniciar
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">🚨 Prevención de Fraude</h4>
            <p className="text-sm text-gray-600 mb-3">Identificar actividad sospechosa</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">25 minutos</span>
              <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                Iniciar
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">📱 WhatsApp Business</h4>
            <p className="text-sm text-gray-600 mb-3">Envío de itinerarios</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">15 minutos</span>
              <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                Iniciar
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-yellow-50">
            <h4 className="font-medium mb-2">✅ Evaluación Final</h4>
            <p className="text-sm text-gray-600 mb-3">Certificación obligatoria</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">45 minutos</span>
              <button className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600">
                Tomar Examen
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Estado de Capacitación por Departamento</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Ventas</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm text-gray-600">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Operaciones</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <span className="text-sm text-gray-600">92%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Administración</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
                <span className="text-sm text-gray-600">67%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            <Play className="h-4 w-4 inline mr-2" />
            Lanzar Campaña de Capacitación
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
            <Download className="h-4 w-4 inline mr-2" />
            Descargar Materiales
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Configuración del Sistema</h1>
          <p className="text-gray-600 mt-2">
            Configure las integraciones, seguridad y herramientas del sistema
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6 py-3">
              <button
                onClick={() => setActiveTab('oauth')}
                className={`py-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'oauth'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Key className="h-4 w-4 inline mr-2" />
                OAuth & APIs
              </button>
              <button
                onClick={() => setActiveTab('migration')}
                className={`py-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'migration'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Database className="h-4 w-4 inline mr-2" />
                Migración
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Shield className="h-4 w-4 inline mr-2" />
                Seguridad
              </button>
              <button
                onClick={() => setActiveTab('training')}
                className={`py-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'training'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Capacitación
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'oauth' && renderOAuthConfiguration()}
            {activeTab === 'migration' && renderMigrationTools()}
            {activeTab === 'security' && renderSecuritySettings()}
            {activeTab === 'training' && renderTrainingModule()}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
            <div>
              <h4 className="font-medium text-blue-900">Recordatorio Importante</h4>
              <p className="text-sm text-blue-700 mt-1">
                Todas las configuraciones requieren permisos de administrador. 
                Los cambios en las políticas de seguridad se aplicarán inmediatamente a todos los usuarios.
                Asegúrese de capacitar al personal antes de activar nuevas restricciones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationDashboard;