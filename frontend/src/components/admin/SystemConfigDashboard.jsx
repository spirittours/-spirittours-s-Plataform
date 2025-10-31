/**
 * Spirit Tours - System Configuration Dashboard
 * 
 * Unified dashboard for managing ALL system configurations:
 * - Database settings
 * - Email configuration
 * - Payment gateways
 * - Authentication & OAuth
 * - Storage (AWS S3)
 * - Monitoring & logging
 * - Security settings
 * - Integrations
 * - Feature flags
 * 
 * Features:
 * - Real-time testing
 * - Role-based access control
 * - Configuration wizard
 * - Import/export
 * - Audit trail with rollback
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SystemConfigDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SystemConfigDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [categories, setCategories] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/system-config/categories`);
      setCategories(response.data.categories);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Error al cargar categorías de configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryKey) => {
    setSelectedCategory(categoryKey);
    setActiveTab('category');
  };

  if (loading) {
    return (
      <div className="system-config-loading">
        <div className="spinner"></div>
        <p>Cargando configuración del sistema...</p>
      </div>
    );
  }

  return (
    <div className="system-config-dashboard">
      <div className="dashboard-header">
        <h1>⚙️ Configuración del Sistema</h1>
        <p className="subtitle">Panel centralizado para administrar todas las configuraciones</p>
        
        <div className="header-actions">
          <button 
            className="btn-wizard"
            onClick={() => setShowWizard(true)}
          >
            🧙‍♂️ Asistente de Configuración
          </button>
          
          <button 
            className="btn-export"
            onClick={() => handleExport()}
          >
            💾 Exportar
          </button>
          
          <button 
            className="btn-import"
            onClick={() => handleImport()}
          >
            📥 Importar
          </button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.percentConfigured}%</div>
            <div className="stat-label">Configurado</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-value">{stats.configuredCount}/{stats.totalConfigs}</div>
            <div className="stat-label">Configuraciones</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔐</div>
          <div className="stat-content">
            <div className="stat-value">{stats.encryptedCount}</div>
            <div className="stat-label">Encriptadas</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <div className="stat-value">{stats.categories}</div>
            <div className="stat-label">Categorías</div>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Vista General
        </button>
        
        <button
          className={`tab ${activeTab === 'category' ? 'active' : ''}`}
          onClick={() => setActiveTab('category')}
          disabled={!selectedCategory}
        >
          ⚙️ Configuración
        </button>
        
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📜 Auditoría
        </button>
        
        <button
          className={`tab ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => setActiveTab('validation')}
        >
          ✅ Validación
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewTab 
            categories={categories} 
            onSelectCategory={handleCategorySelect} 
          />
        )}
        
        {activeTab === 'category' && selectedCategory && (
          <CategoryConfigTab 
            categoryKey={selectedCategory}
            onBack={() => setActiveTab('overview')}
            onReload={loadCategories}
          />
        )}
        
        {activeTab === 'audit' && (
          <AuditTab />
        )}
        
        {activeTab === 'validation' && (
          <ValidationTab />
        )}
      </div>

      {showWizard && (
        <ConfigWizard onClose={() => setShowWizard(false)} />
      )}
    </div>
  );
};

/**
 * Overview Tab - Shows all categories
 */
const OverviewTab = ({ categories, onSelectCategory }) => {
  return (
    <div className="overview-tab">
      <h2>Categorías de Configuración</h2>
      
      <div className="categories-grid">
        {Object.entries(categories).map(([key, category]) => (
          <div 
            key={key} 
            className="category-card"
            onClick={() => onSelectCategory(key)}
          >
            <div className="category-icon">{category.icon}</div>
            <div className="category-info">
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              <div className="category-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${category.percentComplete}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {category.configuredFields}/{category.totalFields} campos
                </span>
              </div>
            </div>
            <div className="category-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Category Configuration Tab
 */
const CategoryConfigTab = ({ categoryKey, onBack, onReload }) => {
  const [categoryData, setCategoryData] = useState(null);
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadCategoryData();
  }, [categoryKey]);

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/admin/system-config/categories/${categoryKey}?includeValues=true`
      );
      setCategoryData(response.data.category);
      
      // Extract current values
      const currentConfigs = {};
      Object.entries(response.data.category.configs).forEach(([key, field]) => {
        currentConfigs[key] = field.value || '';
      });
      setConfigs(currentConfigs);
    } catch (error) {
      console.error('Error loading category data:', error);
      alert('Error al cargar configuración de categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfigs({
      ...configs,
      [key]: value
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await axios.put(`${API_BASE}/admin/system-config/batch`, {
        configs
      });
      
      if (response.data.success) {
        alert(`✅ ${response.data.results.success.length} configuraciones guardadas`);
        setEditMode(false);
        await loadCategoryData();
        onReload();
      }
    } catch (error) {
      console.error('Error saving configurations:', error);
      alert('❌ Error al guardar configuraciones');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResults(null);
      
      const response = await axios.post(
        `${API_BASE}/admin/system-config/test-connection`,
        {
          category: categoryKey,
          configs
        }
      );
      
      setTestResults(response.data);
    } catch (error) {
      console.error('Error testing configuration:', error);
      setTestResults({
        success: false,
        message: error.response?.data?.message || error.message
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!categoryData) {
    return <div className="error">Error al cargar datos</div>;
  }

  // Group fields by group property
  const groupedFields = {};
  Object.entries(categoryData.configs).forEach(([key, field]) => {
    const group = field.group || 'General';
    if (!groupedFields[group]) {
      groupedFields[group] = [];
    }
    groupedFields[group].push({ key, ...field });
  });

  return (
    <div className="category-config-tab">
      <div className="category-header">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <h2>{categoryData.icon} {categoryData.name}</h2>
        <p>{categoryData.description}</p>
      </div>

      <div className="config-actions">
        <button
          className="btn-edit"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? '❌ Cancelar' : '✏️ Editar'}
        </button>
        
        {editMode && (
          <>
            <button
              className="btn-test"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? '🔄 Probando...' : '🧪 Probar Conexión'}
            </button>
            
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
            </button>
          </>
        )}
      </div>

      {testResults && (
        <div className={`test-results ${testResults.success ? 'success' : 'error'}`}>
          <h4>{testResults.success ? '✅ Prueba Exitosa' : '❌ Prueba Fallida'}</h4>
          <p>{testResults.message}</p>
          {testResults.serverTime && <p>Hora del servidor: {testResults.serverTime}</p>}
          {testResults.host && <p>Host: {testResults.host}</p>}
          {testResults.port && <p>Puerto: {testResults.port}</p>}
        </div>
      )}

      <div className="config-form">
        {Object.entries(groupedFields).map(([group, fields]) => (
          <div key={group} className="config-group">
            <h3 className="group-title">{group}</h3>
            
            {fields.map(field => (
              <ConfigField
                key={field.key}
                field={field}
                value={configs[field.key] || ''}
                onChange={(value) => handleConfigChange(field.key, value)}
                disabled={!editMode}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Configuration Field Component
 */
const ConfigField = ({ field, value, onChange, disabled }) => {
  const renderInput = () => {
    switch (field.type) {
      case 'password':
        return (
          <input
            type={disabled ? 'password' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder || ''}
            className="config-input"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder || ''}
            className="config-input"
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder || ''}
            className="config-input"
          />
        );
      
      case 'boolean':
        return (
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
            />
            <span className="toggle-slider"></span>
          </label>
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="config-select"
          >
            <option value="">Seleccionar...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder || ''}
            className="config-input"
          />
        );
    }
  };

  return (
    <div className="config-field">
      <label className="config-label">
        {field.label}
        {field.required && <span className="required">*</span>}
        {field.encrypted && <span className="encrypted-badge">🔒</span>}
        {field.testable && <span className="testable-badge">🧪</span>}
      </label>
      
      {renderInput()}
      
      {field.hasValue && disabled && (
        <span className="value-indicator">✓ Configurado</span>
      )}
    </div>
  );
};

/**
 * Audit Trail Tab
 */
const AuditTab = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // TODO: Implement history API endpoint
      setHistory([]);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="audit-tab">
      <h2>📜 Historial de Cambios</h2>
      <p>Registro de auditoría de todas las modificaciones de configuración</p>
      
      <div className="history-list">
        {history.length === 0 ? (
          <p className="no-data">No hay cambios registrados</p>
        ) : (
          history.map((entry, index) => (
            <div key={index} className="history-entry">
              <div className="history-timestamp">{entry.timestamp}</div>
              <div className="history-details">
                <strong>{entry.key}</strong> modificado por {entry.changedBy}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Validation Tab
 */
const ValidationTab = () => {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    validateConfigurations();
  }, []);

  const validateConfigurations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/system-config/validate`);
      setValidation(response.data);
    } catch (error) {
      console.error('Error validating configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Validando...</div>;
  }

  return (
    <div className="validation-tab">
      <h2>✅ Validación de Configuraciones</h2>
      
      <div className={`validation-status ${validation?.isValid ? 'valid' : 'invalid'}`}>
        {validation?.isValid ? (
          <>
            <div className="status-icon">✅</div>
            <h3>Sistema Completamente Configurado</h3>
            <p>Todas las configuraciones requeridas están presentes</p>
          </>
        ) : (
          <>
            <div className="status-icon">⚠️</div>
            <h3>Configuraciones Faltantes</h3>
            <p>{validation?.totalRequired} configuraciones requeridas no están definidas</p>
          </>
        )}
      </div>

      {validation?.missingRequired?.length > 0 && (
        <div className="missing-configs">
          <h3>Configuraciones Requeridas Faltantes:</h3>
          <ul>
            {validation.missingRequired.map((missing, index) => (
              <li key={index}>
                <strong>{missing.category}</strong>: {missing.label} ({missing.field})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Configuration Wizard Component
 */
const ConfigWizard = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        <div className="wizard-header">
          <h2>🧙‍♂️ Asistente de Configuración</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="wizard-content">
          <div className="wizard-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Categorías</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Configuración</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Pruebas</div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Completar</div>
          </div>
          
          <div className="wizard-body">
            {step === 1 && (
              <div className="wizard-step">
                <h3>Seleccione las categorías a configurar:</h3>
                <p>El asistente lo guiará paso a paso por cada categoría seleccionada</p>
                {/* TODO: Add category selection UI */}
              </div>
            )}
            
            {step === 2 && (
              <div className="wizard-step">
                <h3>Configure los valores necesarios</h3>
                {/* TODO: Add configuration forms */}
              </div>
            )}
            
            {step === 3 && (
              <div className="wizard-step">
                <h3>Probando conexiones...</h3>
                {/* TODO: Add test UI */}
              </div>
            )}
            
            {step === 4 && (
              <div className="wizard-step">
                <h3>✅ Configuración Completada</h3>
                <p>El sistema ha sido configurado exitosamente</p>
              </div>
            )}
          </div>
          
          <div className="wizard-footer">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}>
                ← Anterior
              </button>
            )}
            
            {step < 4 && (
              <button onClick={() => setStep(step + 1)}>
                Siguiente →
              </button>
            )}
            
            {step === 4 && (
              <button onClick={onClose}>
                Finalizar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export/Import handlers
const handleExport = async () => {
  try {
    const response = await axios.get(`${API_BASE}/admin/system-config/export`);
    
    // Create download link
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-config-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    alert('✅ Configuraciones exportadas exitosamente');
  } catch (error) {
    console.error('Error exporting configurations:', error);
    alert('❌ Error al exportar configuraciones');
  }
};

const handleImport = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    try {
      const file = e.target.files[0];
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await axios.post(`${API_BASE}/admin/system-config/import`, data);
      
      if (response.data.success) {
        alert(`✅ ${response.data.results.success.length} configuraciones importadas`);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error importing configurations:', error);
      alert('❌ Error al importar configuraciones');
    }
  };
  
  input.click();
};

export default SystemConfigDashboard;
