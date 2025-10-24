/**
 * Spirit Tours - Email Configuration Dashboard
 * 
 * Admin dashboard for managing email servers and templates
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Main Dashboard Component
const EmailConfigDashboard = () => {
  const [activeTab, setActiveTab] = useState('servers');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="email-config-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>📧 Configuración de Email</h1>
        <p>Gestiona servidores SMTP, plantillas y emails automáticos</p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
          <button onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'servers' ? 'active' : ''}`}
          onClick={() => setActiveTab('servers')}
        >
          🖥️ Servidores SMTP
        </button>
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📝 Plantillas
        </button>
        <button
          className={`tab ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          🏢 Departamentos
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'servers' && (
          <ServersTab 
            showNotification={showNotification}
            setLoading={setLoading}
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesTab 
            showNotification={showNotification}
            setLoading={setLoading}
          />
        )}
        {activeTab === 'departments' && (
          <DepartmentsTab 
            showNotification={showNotification}
            setLoading={setLoading}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab 
            showNotification={showNotification}
            setLoading={setLoading}
          />
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Procesando...</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SERVERS TAB - Manage SMTP Servers
// ============================================================================

const ServersTab = ({ showNotification, setLoading }) => {
  const [servers, setServers] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/email-config/servers`, {
        headers: { 'x-user-role': 'admin' }
      });
      setServers(response.data.data);
    } catch (error) {
      showNotification('Error al cargar servidores: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testServer = async (serverId) => {
    try {
      setLoading(true);
      const testEmail = prompt('Email para enviar prueba (opcional):');
      
      const response = await axios.post(
        `${API_BASE}/admin/email-config/servers/${serverId}/test`,
        { testEmail },
        { headers: { 'x-user-role': 'admin' } }
      );

      if (response.data.success) {
        showNotification('✅ Servidor funcionando correctamente', 'success');
      } else {
        showNotification('❌ Error en el servidor: ' + response.data.message, 'error');
      }
    } catch (error) {
      showNotification('Error al probar servidor: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteServer = async (serverId, serverName) => {
    if (!confirm(`¿Eliminar servidor "${serverName}"?`)) return;

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/admin/email-config/servers/${serverId}`, {
        headers: { 'x-user-role': 'admin' }
      });
      showNotification('Servidor eliminado exitosamente', 'success');
      loadServers();
    } catch (error) {
      showNotification('Error al eliminar servidor: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleServer = async (serverId, currentStatus) => {
    try {
      setLoading(true);
      await axios.put(
        `${API_BASE}/admin/email-config/servers/${serverId}`,
        { enabled: !currentStatus },
        { headers: { 'x-user-role': 'admin' } }
      );
      showNotification(`Servidor ${!currentStatus ? 'activado' : 'desactivado'}`, 'success');
      loadServers();
    } catch (error) {
      showNotification('Error al actualizar servidor: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="servers-tab">
      {/* Header with Actions */}
      <div className="tab-header">
        <div>
          <h2>🖥️ Servidores SMTP</h2>
          <p>{servers.length} servidor(es) configurado(s)</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => loadServers()}
          >
            🔄 Actualizar
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowWizard(true)}
          >
            ➕ Agregar Servidor
          </button>
        </div>
      </div>

      {/* Servers List */}
      <div className="servers-grid">
        {servers.map(server => (
          <div key={server.id} className="server-card">
            <div className="server-header">
              <div className="server-title">
                <h3>{server.name}</h3>
                <span className={`status-badge ${server.isAvailable ? 'active' : 'inactive'}`}>
                  {server.isAvailable ? '🟢 Activo' : '🔴 Inactivo'}
                </span>
              </div>
              <div className="server-actions">
                <button
                  className="btn-icon"
                  onClick={() => testServer(server.id)}
                  title="Probar conexión"
                >
                  🧪
                </button>
                <button
                  className="btn-icon"
                  onClick={() => {
                    setSelectedServer(server);
                    setShowEditModal(true);
                  }}
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  className="btn-icon"
                  onClick={() => deleteServer(server.id, server.name)}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="server-details">
              <div className="detail-row">
                <span className="label">Host:</span>
                <span className="value">{server.host}:{server.port}</span>
              </div>
              <div className="detail-row">
                <span className="label">Usuario:</span>
                <span className="value">{server.user}</span>
              </div>
              <div className="detail-row">
                <span className="label">Prioridad:</span>
                <span className="value">Nivel {server.priority}</span>
              </div>
              <div className="detail-row">
                <span className="label">Límite/hora:</span>
                <span className="value">
                  {server.currentHourSent} / {server.rateLimitPerHour}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Fallos:</span>
                <span className="value">{server.failureCount}</span>
              </div>
            </div>

            <div className="server-footer">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={server.enabled}
                  onChange={() => toggleServer(server.id, server.enabled)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">
                  {server.enabled ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </label>
            </div>
          </div>
        ))}

        {servers.length === 0 && (
          <div className="empty-state">
            <p>📭 No hay servidores configurados</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowWizard(true)}
            >
              Agregar Primer Servidor
            </button>
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <ServerWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            loadServers();
            showNotification('Servidor agregado exitosamente', 'success');
          }}
          showNotification={showNotification}
          setLoading={setLoading}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedServer && (
        <ServerEditModal
          server={selectedServer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedServer(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedServer(null);
            loadServers();
            showNotification('Servidor actualizado exitosamente', 'success');
          }}
          showNotification={showNotification}
          setLoading={setLoading}
        />
      )}
    </div>
  );
};

// ============================================================================
// SERVER WIZARD - Step-by-step Server Configuration
// ============================================================================

const ServerWizard = ({ onClose, onSuccess, showNotification, setLoading }) => {
  const [step, setStep] = useState(1);
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    priority: '5',
    rateLimitPerHour: '1000',
    maxConnections: '5'
  });
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/email-config/presets`, {
        headers: { 'x-user-role': 'admin' }
      });
      setPresets(response.data.data);
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const selectPreset = (preset) => {
    setSelectedPreset(preset);
    setFormData({
      ...formData,
      name: preset.name,
      host: preset.host,
      port: preset.port.toString(),
      secure: preset.secure,
      user: preset.user,
      rateLimitPerHour: preset.rateLimitPerHour.toString()
    });
    setStep(2);
  };

  const testConfiguration = async () => {
    try {
      setLoading(true);
      const testEmail = prompt('Email para prueba (opcional):');
      
      const response = await axios.post(
        `${API_BASE}/admin/email-config/servers/test-new`,
        { ...formData, testEmail },
        { headers: { 'x-user-role': 'admin' } }
      );

      setTestResults(response.data);
      
      if (response.data.success) {
        showNotification('✅ Configuración validada correctamente', 'success');
      } else {
        showNotification('❌ Error en configuración', 'error');
      }
    } catch (error) {
      showNotification('Error al probar configuración: ' + error.message, 'error');
      setTestResults({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const saveServer = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE}/admin/email-config/servers`,
        formData,
        { headers: { 'x-user-role': 'admin' } }
      );
      onSuccess();
    } catch (error) {
      showNotification('Error al guardar servidor: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wizard-modal" onClick={e => e.stopPropagation()}>
        {/* Wizard Header */}
        <div className="wizard-header">
          <h2>🧙‍♂️ Asistente de Configuración SMTP</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* Progress Bar */}
        <div className="wizard-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1. Tipo</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2. Configuración</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3. Prueba</div>
          <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>4. Guardar</div>
        </div>

        {/* Step Content */}
        <div className="wizard-body">
          {/* Step 1: Choose Preset */}
          {step === 1 && (
            <div className="wizard-step">
              <h3>Selecciona el tipo de servidor</h3>
              <div className="presets-grid">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    className="preset-card"
                    onClick={() => selectPreset(preset)}
                  >
                    <div className="preset-icon">{preset.icon}</div>
                    <h4>{preset.name}</h4>
                    <p>{preset.instructions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="wizard-step">
              <h3>Configura los datos del servidor</h3>
              {selectedPreset && (
                <div className="preset-info">
                  <strong>{selectedPreset.icon} {selectedPreset.name}</strong>
                  <p>{selectedPreset.instructions}</p>
                </div>
              )}
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre del servidor:</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Gmail Principal"
                  />
                </div>

                <div className="form-group">
                  <label>Host SMTP:</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={e => setFormData({...formData, host: e.target.value})}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="form-group">
                  <label>Puerto:</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={e => setFormData({...formData, port: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Usuario (Email):</label>
                  <input
                    type="email"
                    value={formData.user}
                    onChange={e => setFormData({...formData, user: e.target.value})}
                    placeholder="tu-email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Contraseña:</label>
                  <input
                    type="password"
                    value={formData.pass}
                    onChange={e => setFormData({...formData, pass: e.target.value})}
                    placeholder="Tu contraseña o App Password"
                  />
                </div>

                <div className="form-group">
                  <label>Prioridad (1-10):</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  />
                  <small>1 = más alta, 10 = más baja</small>
                </div>

                <div className="form-group">
                  <label>Límite por hora:</label>
                  <input
                    type="number"
                    value={formData.rateLimitPerHour}
                    onChange={e => setFormData({...formData, rateLimitPerHour: e.target.value})}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.secure}
                      onChange={e => setFormData({...formData, secure: e.target.checked})}
                    />
                    Usar SSL (puerto 465)
                  </label>
                </div>
              </div>

              <div className="wizard-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                >
                  ← Atrás
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setStep(3)}
                  disabled={!formData.host || !formData.user || !formData.pass}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Test */}
          {step === 3 && (
            <div className="wizard-step">
              <h3>Prueba la configuración</h3>
              <p>Verifica que el servidor funcione correctamente antes de guardarlo.</p>

              <div className="test-section">
                <button 
                  className="btn btn-primary btn-large"
                  onClick={testConfiguration}
                >
                  🧪 Probar Configuración
                </button>

                {testResults && (
                  <div className={`test-results ${testResults.success ? 'success' : 'error'}`}>
                    <h4>{testResults.success ? '✅ Éxito' : '❌ Error'}</h4>
                    <p>{testResults.message}</p>
                    
                    {testResults.tests && (
                      <div className="test-details">
                        <div className="test-item">
                          <strong>Conexión:</strong>
                          <span className={testResults.tests.connection.success ? 'success' : 'error'}>
                            {testResults.tests.connection.message}
                          </span>
                          {testResults.tests.connection.error && (
                            <p className="error-detail">{testResults.tests.connection.error}</p>
                          )}
                          {testResults.tests.connection.hint && (
                            <p className="hint">💡 {testResults.tests.connection.hint}</p>
                          )}
                        </div>

                        {testResults.tests.sendEmail && (
                          <div className="test-item">
                            <strong>Envío de Email:</strong>
                            <span className={testResults.tests.sendEmail.success ? 'success' : 'error'}>
                              {testResults.tests.sendEmail.message}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="wizard-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setStep(2)}
                >
                  ← Atrás
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setStep(4)}
                  disabled={!testResults || !testResults.success}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Save */}
          {step === 4 && (
            <div className="wizard-step">
              <h3>✅ Listo para guardar</h3>
              <p>Revisa la configuración final:</p>

              <div className="config-summary">
                <div className="summary-item">
                  <strong>Nombre:</strong> {formData.name}
                </div>
                <div className="summary-item">
                  <strong>Servidor:</strong> {formData.host}:{formData.port}
                </div>
                <div className="summary-item">
                  <strong>Usuario:</strong> {formData.user}
                </div>
                <div className="summary-item">
                  <strong>Prioridad:</strong> {formData.priority}
                </div>
                <div className="summary-item">
                  <strong>Límite/hora:</strong> {formData.rateLimitPerHour}
                </div>
              </div>

              <div className="wizard-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setStep(3)}
                >
                  ← Atrás
                </button>
                <button 
                  className="btn btn-success btn-large"
                  onClick={saveServer}
                >
                  💾 Guardar Servidor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SERVER EDIT MODAL
// ============================================================================

const ServerEditModal = ({ server, onClose, onSuccess, showNotification, setLoading }) => {
  const [formData, setFormData] = useState({
    name: server.name,
    priority: server.priority,
    rateLimitPerHour: server.rateLimitPerHour,
    maxConnections: server.maxConnections,
    enabled: server.enabled
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      await axios.put(
        `${API_BASE}/admin/email-config/servers/${server.id}`,
        formData,
        { headers: { 'x-user-role': 'admin' } }
      );
      onSuccess();
    } catch (error) {
      showNotification('Error al actualizar servidor: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Editar Servidor</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Nombre:</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Prioridad (1-10):</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Límite por hora:</label>
            <input
              type="number"
              value={formData.rateLimitPerHour}
              onChange={e => setFormData({...formData, rateLimitPerHour: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Máximas conexiones:</label>
            <input
              type="number"
              value={formData.maxConnections}
              onChange={e => setFormData({...formData, maxConnections: e.target.value})}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={e => setFormData({...formData, enabled: e.target.checked})}
              />
              Servidor habilitado
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATES TAB - Manage Email Templates
// ============================================================================

const TemplatesTab = ({ showNotification, setLoading }) => {
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadDepartments();
    loadTemplates();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [selectedDepartment, searchQuery]);

  const loadDepartments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/email-templates/departments`, {
        headers: { 'x-user-role': 'admin' }
      });
      setDepartments(response.data.data);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = {
        ...(selectedDepartment !== 'all' && { department: selectedDepartment }),
        ...(searchQuery && { search: searchQuery })
      };
      
      const response = await axios.get(`${API_BASE}/admin/email-templates`, {
        params,
        headers: { 'x-user-role': 'admin' }
      });
      setTemplates(response.data.data);
    } catch (error) {
      showNotification('Error al cargar plantillas: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId, templateName) => {
    if (!confirm(`¿Eliminar plantilla "${templateName}"?`)) return;

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/admin/email-templates/${templateId}`, {
        headers: { 'x-user-role': 'admin' }
      });
      showNotification('Plantilla eliminada exitosamente', 'success');
      loadTemplates();
    } catch (error) {
      showNotification('Error al eliminar plantilla: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testSendTemplate = async (templateId, templateName) => {
    const testEmail = prompt('Email para recibir la prueba:');
    if (!testEmail) return;

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE}/admin/email-templates/${templateId}/test-send`,
        { testEmail },
        { headers: { 'x-user-role': 'admin' } }
      );
      showNotification(`Email de prueba enviado a ${testEmail}`, 'success');
    } catch (error) {
      showNotification('Error al enviar prueba: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="templates-tab">
      {/* Header with Filters */}
      <div className="tab-header">
        <div>
          <h2>📝 Plantillas de Email</h2>
          <p>{templates.length} plantilla(s) encontrada(s)</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setSelectedTemplate(null);
            setShowTemplateModal(true);
          }}
        >
          ➕ Nueva Plantilla
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Departamento:</label>
          <select 
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
          >
            <option value="all">Todos</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.icon} {dept.name} ({dept.templateCount})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Buscar:</label>
          <input
            type="text"
            placeholder="Nombre o asunto..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <button 
          className="btn btn-secondary"
          onClick={() => {
            setSelectedDepartment('all');
            setSearchQuery('');
          }}
        >
          🔄 Limpiar
        </button>
      </div>

      {/* Templates Grid */}
      <div className="templates-grid">
        {templates.map(template => (
          <div key={template.id} className="template-card">
            <div className="template-header">
              <div>
                <h3>{template.name}</h3>
                <span className="department-badge">
                  {template.departmentName}
                </span>
              </div>
              <div className="template-actions">
                <button
                  className="btn-icon"
                  onClick={() => testSendTemplate(template.id, template.name)}
                  title="Enviar prueba"
                >
                  📧
                </button>
                <button
                  className="btn-icon"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowTemplateModal(true);
                  }}
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  className="btn-icon"
                  onClick={() => deleteTemplate(template.id, template.name)}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="template-body">
              <p className="template-subject"><strong>Asunto:</strong> {template.subject}</p>
              {template.description && (
                <p className="template-description">{template.description}</p>
              )}
              <div className="template-meta">
                <span>📊 Usado {template.usageCount} veces</span>
                <span className={`category-badge category-${template.category}`}>
                  {template.category}
                </span>
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="empty-state">
            <p>📭 No se encontraron plantillas</p>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setSelectedTemplate(null);
                setShowTemplateModal(true);
              }}
            >
              Crear Primera Plantilla
            </button>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={selectedTemplate}
          departments={departments}
          onClose={() => {
            setShowTemplateModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setShowTemplateModal(false);
            setSelectedTemplate(null);
            loadTemplates();
            showNotification(
              selectedTemplate ? 'Plantilla actualizada' : 'Plantilla creada',
              'success'
            );
          }}
          showNotification={showNotification}
          setLoading={setLoading}
        />
      )}
    </div>
  );
};

// ============================================================================
// TEMPLATE MODAL - Create/Edit Template
// ============================================================================

const TemplateModal = ({ 
  template, 
  departments, 
  onClose, 
  onSuccess, 
  showNotification, 
  setLoading 
}) => {
  const [formData, setFormData] = useState(template ? {
    name: template.name,
    subject: template.subject,
    html: template.html || '',
    text: template.text || '',
    category: template.category,
    department: template.department,
    description: template.description,
    variables: template.variables?.join(', ') || ''
  } : {
    name: '',
    subject: '',
    html: '',
    text: '',
    category: 'general',
    department: 'general',
    description: '',
    variables: ''
  });

  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const handlePreview = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE}/admin/email-templates/${template?.id || 'temp'}/preview`,
        { 
          variables: {
            name: 'Juan Pérez',
            company_name: 'Spirit Tours',
            // Add more sample variables
          }
        },
        { headers: { 'x-user-role': 'admin' } }
      );
      setPreviewHtml(response.data.data.html);
      setShowPreview(true);
    } catch (error) {
      showNotification('Error al generar preview: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const data = {
        ...formData,
        variables: formData.variables.split(',').map(v => v.trim()).filter(v => v)
      };

      if (template) {
        // Update
        await axios.put(
          `${API_BASE}/admin/email-templates/${template.id}`,
          data,
          { headers: { 'x-user-role': 'admin' } }
        );
      } else {
        // Create
        await axios.post(
          `${API_BASE}/admin/email-templates`,
          data,
          { headers: { 'x-user-role': 'admin' } }
        );
      }
      onSuccess();
    } catch (error) {
      showNotification('Error al guardar plantilla: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{template ? '✏️ Editar Plantilla' : '➕ Nueva Plantilla'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!showPreview ? (
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre de la plantilla: *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Confirmación de Reserva"
                />
              </div>

              <div className="form-group">
                <label>Departamento: *</label>
                <select
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.icon} {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Categoría: *</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="general">General</option>
                  <option value="transactional">Transaccional</option>
                  <option value="promotional">Promocional</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Asunto del email: *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  placeholder="Ej: Tu reserva {{booking_id}} ha sido confirmada"
                />
                <small>Usa {'{{'} variable {'}}'} para variables dinámicas</small>
              </div>

              <div className="form-group full-width">
                <label>Descripción:</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Descripción breve de esta plantilla"
                  rows="2"
                />
              </div>

              <div className="form-group full-width">
                <label>Variables disponibles:</label>
                <input
                  type="text"
                  value={formData.variables}
                  onChange={e => setFormData({...formData, variables: e.target.value})}
                  placeholder="name, booking_id, date, amount (separadas por comas)"
                />
                <small>Variables que se pueden usar en el email</small>
              </div>

              <div className="form-group full-width">
                <label>Contenido HTML: *</label>
                <textarea
                  value={formData.html}
                  onChange={e => setFormData({...formData, html: e.target.value})}
                  placeholder="<h1>Hola {{name}}!</h1>..."
                  rows="10"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div className="form-group full-width">
                <label>Contenido Texto Plano:</label>
                <textarea
                  value={formData.text}
                  onChange={e => setFormData({...formData, text: e.target.value})}
                  placeholder="Versión en texto plano (opcional)"
                  rows="5"
                />
              </div>
            </div>
          ) : (
            <div className="preview-container">
              <h3>Vista Previa</h3>
              <div 
                className="email-preview"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '✏️ Editar' : '👁️ Vista Previa'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!formData.name || !formData.subject || !formData.html}
          >
            💾 Guardar Plantilla
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DEPARTMENTS TAB - View templates by department
// ============================================================================

const DepartmentsTab = ({ showNotification, setLoading }) => {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/email-templates/departments`, {
        headers: { 'x-user-role': 'admin' }
      });
      setDepartments(response.data.data);
    } catch (error) {
      showNotification('Error al cargar departamentos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="departments-tab">
      <div className="tab-header">
        <div>
          <h2>🏢 Departamentos</h2>
          <p>Gestión de emails por departamento</p>
        </div>
      </div>

      <div className="departments-grid">
        {departments.map(dept => (
          <div key={dept.id} className="department-card">
            <div className="department-icon">{dept.icon}</div>
            <h3>{dept.name}</h3>
            <p>{dept.description}</p>
            <div className="department-stats">
              <span className="stat">
                📝 {dept.templateCount} plantillas
              </span>
            </div>
            <div className="department-templates">
              <h4>Plantillas predeterminadas:</h4>
              <ul>
                {dept.defaultTemplates.map((template, idx) => (
                  <li key={idx}>{template.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// STATS TAB - Email statistics and monitoring
// ============================================================================

const StatsTab = ({ showNotification, setLoading }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
    // Refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/nodemailer/stats`, {
        headers: { 'x-user-role': 'admin' }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (!stats) {
    return <div className="loading">Cargando estadísticas...</div>;
  }

  return (
    <div className="stats-tab">
      <div className="tab-header">
        <div>
          <h2>📊 Estadísticas de Email</h2>
          <p>Monitoreo en tiempo real</p>
        </div>
        <button className="btn btn-secondary" onClick={loadStats}>
          🔄 Actualizar
        </button>
      </div>

      {/* Overview Stats */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.stats.sent.toLocaleString()}</div>
          <div className="stat-label">Enviados</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-value">{stats.stats.failed.toLocaleString()}</div>
          <div className="stat-label">Fallidos</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{stats.queue.size}</div>
          <div className="stat-label">En Cola</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{stats.templates}</div>
          <div className="stat-label">Plantillas</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🖥️</div>
          <div className="stat-value">{stats.servers.length}</div>
          <div className="stat-label">Servidores</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-value">{stats.unsubscribed}</div>
          <div className="stat-label">Desuscritos</div>
        </div>
      </div>

      {/* Server Stats */}
      <div className="stats-section">
        <h3>📊 Estadísticas por Servidor</h3>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Servidor</th>
              <th>Estado</th>
              <th>Enviados (hora)</th>
              <th>Límite/hora</th>
              <th>Fallos</th>
              <th>Disponible</th>
            </tr>
          </thead>
          <tbody>
            {stats.servers.map(server => (
              <tr key={server.id}>
                <td><strong>{server.name}</strong></td>
                <td>
                  <span className={`status-badge ${server.enabled ? 'active' : 'inactive'}`}>
                    {server.enabled ? '🟢' : '🔴'}
                  </span>
                </td>
                <td>{server.currentHourSent}</td>
                <td>{server.rateLimitPerHour}</td>
                <td>{server.failureCount}</td>
                <td>
                  {server.isAvailable ? '✅ Sí' : '❌ No'}
                  {server.cooldownUntil && (
                    <span className="cooldown-info">
                      (Cooldown hasta {new Date(server.cooldownUntil).toLocaleTimeString()})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Processing Status */}
      <div className="stats-section">
        <h3>⚙️ Estado del Procesamiento</h3>
        <div className="processing-status">
          <div className="status-item">
            <span className="status-label">Estado:</span>
            <span className={`status-value ${stats.processing ? 'processing' : 'idle'}`}>
              {stats.processing ? '🔄 Procesando' : '⏸️ Inactivo'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Cola:</span>
            <span className="status-value">{stats.queue.size} emails pendientes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export main component
export default EmailConfigDashboard;
