import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AttachMoney as CostIcon,
  Psychology as AgentIcon,
  Storage as ServerIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as ProfileIcon
} from '@mui/icons-material';

import WizardSetup from './WizardSetup';
import CostOptimizationDashboard from './CostOptimizationDashboard';
import HybridAgentControl from './HybridAgentControl';
import MultiServerManager from './MultiServerManager';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

export default function MainDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationCount] = useState(3);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleWizardComplete = (config) => {
    console.log('Wizard completed with config:', config);
    setShowWizard(false);
    setTabValue(0); // Go to main dashboard
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (showWizard) {
    return <WizardSetup onComplete={handleWizardComplete} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Email Campaign Management System
          </Typography>

          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={notificationCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit" onClick={handleMenuOpen}>
            <Avatar sx={{ width: 32, height: 32 }}>
              <ProfileIcon />
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>
              <ProfileIcon sx={{ mr: 1 }} /> Mi Perfil
            </MenuItem>
            <MenuItem onClick={() => { setShowWizard(true); handleMenuClose(); }}>
              <SettingsIcon sx={{ mr: 1 }} /> Configuración Inicial
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose}>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Side Navigation */}
        <Paper
          sx={{
            width: 240,
            borderRadius: 0,
            borderRight: 1,
            borderColor: 'divider'
          }}
        >
          <Tabs
            orientation="vertical"
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              '.MuiTab-root': {
                alignItems: 'flex-start',
                textAlign: 'left',
                minHeight: 64
              }
            }}
          >
            <Tab
              icon={<DashboardIcon />}
              iconPosition="start"
              label="Dashboard"
              sx={{ justifyContent: 'flex-start' }}
            />
            <Tab
              icon={<CostIcon />}
              iconPosition="start"
              label="Optimización de Costos"
              sx={{ justifyContent: 'flex-start' }}
            />
            <Tab
              icon={<AgentIcon />}
              iconPosition="start"
              label="Agentes Híbridos"
              sx={{ justifyContent: 'flex-start' }}
            />
            <Tab
              icon={<ServerIcon />}
              iconPosition="start"
              label="Multi-Servidor"
              sx={{ justifyContent: 'flex-start' }}
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          <TabPanel value={tabValue} index={0}>
            <OverviewDashboard onStartWizard={() => setShowWizard(true)} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <CostOptimizationDashboard />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <HybridAgentControl />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <MultiServerManager />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
}

// Overview Dashboard Component
function OverviewDashboard({ onStartWizard }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bienvenido al Sistema de Email Campaign
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ¿Primera vez aquí?
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Te recomendamos usar el asistente de configuración guiada para configurar tu sistema en menos de 5 minutos.
        </Typography>
        <button
          onClick={onStartWizard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🚀 Iniciar Configuración Guiada
        </button>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Resumen del Sistema
      </Typography>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <Paper sx={{ p: 3 }}>
          <CostIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5">$95/mes</Typography>
          <Typography variant="body2" color="textSecondary">
            Costo Actual (Estrategia Balanced)
          </Typography>
          <Typography variant="caption" color="success.main">
            Ahorrando $155/mes vs Performance
          </Typography>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <ServerIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5">3,000</Typography>
          <Typography variant="body2" color="textSecondary">
            Emails/día (Capacidad)
          </Typography>
          <Typography variant="caption" color="textSecondary">
            3 servidores SMTP + SendGrid
          </Typography>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <AgentIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5">80/20</Typography>
          <Typography variant="body2" color="textSecondary">
            Ratio IA/Humanos
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Modo Híbrido Activo
          </Typography>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <DashboardIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5">94%</Typography>
          <Typography variant="body2" color="textSecondary">
            Tasa de Éxito Global
          </Typography>
          <Typography variant="caption" color="success.main">
            +2% vs mes anterior
          </Typography>
        </Paper>
      </div>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Accesos Rápidos
        </Typography>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <button style={quickActionButtonStyle}>
            📧 Nueva Campaña
          </button>
          <button style={quickActionButtonStyle}>
            📊 Ver Estadísticas
          </button>
          <button style={quickActionButtonStyle}>
            ⚙️ Configuración Avanzada
          </button>
          <button style={quickActionButtonStyle}>
            📚 Ver Documentación
          </button>
        </div>
      </Paper>
    </Box>
  );
}

const quickActionButtonStyle = {
  padding: '12px 24px',
  backgroundColor: 'white',
  border: '1px solid #ddd',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: '#f5f5f5',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }
};
