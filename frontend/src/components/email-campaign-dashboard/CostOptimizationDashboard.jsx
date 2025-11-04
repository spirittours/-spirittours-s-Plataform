import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Chip,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingDown as SavingsIcon,
  Speed as SpeedIcon,
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const STRATEGIES = {
  'maximum-savings': {
    name: 'Máximo Ahorro',
    color: 'success',
    icon: <SavingsIcon />,
    description: 'Máxima reducción de costos - SMTP gratis + GPT-3.5',
    monthlyCost: 25
  },
  'balanced': {
    name: 'Balanceado',
    color: 'primary',
    icon: <CheckIcon />,
    description: 'Balance óptimo entre costo y rendimiento',
    monthlyCost: 95
  },
  'performance': {
    name: 'Rendimiento',
    color: 'secondary',
    icon: <SpeedIcon />,
    description: 'Máximo rendimiento - SendGrid + GPT-4 siempre',
    monthlyCost: 250
  },
  'smart-auto': {
    name: 'Smart Auto',
    color: 'info',
    icon: <CheckIcon />,
    description: 'Ajuste automático según presupuesto',
    monthlyCost: 'Variable'
  },
  'time-based': {
    name: 'Por Horario',
    color: 'warning',
    icon: <CheckIcon />,
    description: 'Cambia estrategia según hora del día',
    monthlyCost: 'Variable'
  },
  'batch': {
    name: 'Por Volumen',
    color: 'default',
    icon: <CheckIcon />,
    description: 'Cambia estrategia según cantidad de emails',
    monthlyCost: 'Variable'
  }
};

export default function CostOptimizationDashboard() {
  const [currentStrategy, setCurrentStrategy] = useState('balanced');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingsOptions, setSavingsOptions] = useState({
    useFreeSMTPFirst: true,
    avoidPeakHours: true,
    batchSimilarEmails: true,
    reuseGeneratedContent: true,
    skipAIForSimpleEmails: true,
    cacheCommonResponses: true
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/email-config/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStrategyChange = async (newStrategy) => {
    setLoading(true);
    try {
      const response = await fetch('/api/email-config/cost/strategy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: newStrategy })
      });
      
      if (response.ok) {
        setCurrentStrategy(newStrategy);
        await fetchStats();
      }
    } catch (error) {
      console.error('Error changing strategy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavingsOptionToggle = async (option) => {
    const newOptions = {
      ...savingsOptions,
      [option]: !savingsOptions[option]
    };
    setSavingsOptions(newOptions);

    try {
      await fetch('/api/email-config/cost/savings-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savingsOptions: newOptions })
      });
    } catch (error) {
      console.error('Error updating savings options:', error);
    }
  };

  const budgetPercentage = stats 
    ? (stats.costs.thisMonth / stats.costs.monthlyBudget) * 100 
    : 0;

  const getBudgetStatus = () => {
    if (budgetPercentage < 70) return { color: 'success', text: 'Dentro del presupuesto' };
    if (budgetPercentage < 90) return { color: 'warning', text: 'Acercándose al límite' };
    return { color: 'error', text: '¡Presupuesto excedido!' };
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Optimización de Costos
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchStats}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      {/* Budget Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="subtitle2" color="textSecondary">
                  Hoy
                </Typography>
              </Box>
              <Typography variant="h4">
                ${stats?.costs.today.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Límite diario: ${stats?.costs.dailyBudget || '5.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ mr: 1 }} color="secondary" />
                <Typography variant="subtitle2" color="textSecondary">
                  Este Mes
                </Typography>
              </Box>
              <Typography variant="h4">
                ${stats?.costs.thisMonth.toFixed(2) || '0.00'}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(budgetPercentage, 100)}
                color={getBudgetStatus().color}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="textSecondary">
                {budgetPercentage.toFixed(0)}% de ${stats?.costs.monthlyBudget || '100'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ mr: 1 }} color="info" />
                <Typography variant="subtitle2" color="textSecondary">
                  Proyección Mensual
                </Typography>
              </Box>
              <Typography variant="h4">
                ${stats?.costs.projectedMonth.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="caption" color={getBudgetStatus().color}>
                {getBudgetStatus().text}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SavingsIcon sx={{ mr: 1, color: 'success.contrastText' }} />
                <Typography variant="subtitle2" sx={{ color: 'success.contrastText' }}>
                  Ahorro este Mes
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: 'success.contrastText' }}>
                ${stats?.costs.savingsThisMonth.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'success.contrastText' }}>
                vs estrategia Performance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert if budget exceeded */}
      {budgetPercentage > 80 && (
        <Alert 
          severity={budgetPercentage > 100 ? 'error' : 'warning'} 
          sx={{ mb: 3 }}
          icon={<WarningIcon />}
        >
          {budgetPercentage > 100 
            ? '¡Has excedido tu presupuesto mensual! Considera cambiar a una estrategia de ahorro.'
            : `Has usado ${budgetPercentage.toFixed(0)}% de tu presupuesto. Estás cerca del límite.`
          }
        </Alert>
      )}

      {/* Strategy Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estrategia Actual
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Seleccionar Estrategia</InputLabel>
            <Select
              value={currentStrategy}
              onChange={(e) => handleStrategyChange(e.target.value)}
              disabled={loading}
            >
              {Object.entries(STRATEGIES).map(([key, strategy]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ mr: 2 }}>{strategy.icon}</Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1">{strategy.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {strategy.description}
                      </Typography>
                    </Box>
                    <Chip 
                      label={typeof strategy.monthlyCost === 'number' 
                        ? `$${strategy.monthlyCost}/mes` 
                        : strategy.monthlyCost
                      }
                      color={strategy.color}
                      size="small"
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2">
              <strong>{STRATEGIES[currentStrategy].name}:</strong>{' '}
              {STRATEGIES[currentStrategy].description}
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Savings Options */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Opciones de Ahorro
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Activa o desactiva características específicas de optimización
          </Typography>

          <Grid container spacing={2}>
            {[
              { key: 'useFreeSMTPFirst', label: 'Usar SMTP Gratis Primero', impact: 'Alto' },
              { key: 'avoidPeakHours', label: 'Evitar Horas Pico', impact: 'Medio' },
              { key: 'batchSimilarEmails', label: 'Agrupar Emails Similares', impact: 'Medio' },
              { key: 'reuseGeneratedContent', label: 'Reusar Contenido Generado', impact: 'Alto' },
              { key: 'skipAIForSimpleEmails', label: 'Skip IA para Emails Simples', impact: 'Alto' },
              { key: 'cacheCommonResponses', label: 'Cachear Respuestas Comunes', impact: 'Medio' }
            ].map((option) => (
              <Grid item xs={12} md={6} key={option.key}>
                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2">{option.label}</Typography>
                    <Chip 
                      label={`Impacto: ${option.impact}`} 
                      size="small" 
                      color={option.impact === 'Alto' ? 'success' : 'default'}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={savingsOptions[option.key]}
                        onChange={() => handleSavingsOptionToggle(option.key)}
                      />
                    }
                    label=""
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Uso de Recursos
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Recurso</TableCell>
                  <TableCell align="right">Usado Hoy</TableCell>
                  <TableCell align="right">Límite Diario</TableCell>
                  <TableCell align="right">Porcentaje</TableCell>
                  <TableCell align="right">Costo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>SMTP (Gratis)</TableCell>
                  <TableCell align="right">{stats?.usage.smtpToday || 0}</TableCell>
                  <TableCell align="right">{stats?.usage.smtpLimit || 3000}</TableCell>
                  <TableCell align="right">
                    <LinearProgress
                      variant="determinate"
                      value={(stats?.usage.smtpToday / stats?.usage.smtpLimit) * 100 || 0}
                      sx={{ width: 100, display: 'inline-flex' }}
                    />
                  </TableCell>
                  <TableCell align="right">$0.00</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell>SendGrid</TableCell>
                  <TableCell align="right">{stats?.usage.sendgridToday || 0}</TableCell>
                  <TableCell align="right">{stats?.usage.sendgridLimit || 5000}</TableCell>
                  <TableCell align="right">
                    <LinearProgress
                      variant="determinate"
                      value={(stats?.usage.sendgridToday / stats?.usage.sendgridLimit) * 100 || 0}
                      sx={{ width: 100, display: 'inline-flex' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    ${((stats?.usage.sendgridToday || 0) * 0.001).toFixed(2)}
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell>
                    Requests IA
                    <Tooltip title="GPT-4 y GPT-3.5 combinados">
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{stats?.usage.aiRequestsToday || 0}</TableCell>
                  <TableCell align="right">Ilimitado</TableCell>
                  <TableCell align="right">-</TableCell>
                  <TableCell align="right">
                    ${(stats?.costs.aiCostsToday || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
