/**
 * Dashboard Statistics Component
 * Real-time CRM statistics and metrics display
 * 
 * Features:
 * - Real-time statistics from API
 * - Multiple stat cards (workspaces, deals, contacts, pipelines)
 * - Loading states and error handling
 * - Responsive grid layout
 * - Auto-refresh capability
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  ShowChart as ChartIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface DashboardStatsProps {
  workspaceId?: string;
}

interface Stats {
  workspaces: {
    total: number;
    active: number;
    panicMode: number;
  };
  pipelines: {
    total: number;
    activeDeals: number;
  };
  deals: {
    total: number;
    totalValue: number;
    avgValue: number;
    wonCount: number;
    lostCount: number;
  };
  contacts: {
    total: number;
    leads: number;
    customers: number;
    hotLeads: number;
  };
  boards: {
    total: number;
    totalItems: number;
  };
  activities: {
    todayCount: number;
    weekCount: number;
  };
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, trend }) => {
  const colors = {
    primary: '#1976d2',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1',
  };

  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold" color={colors[color]}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" mt={1}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box mt={1}>
                <Chip
                  size="small"
                  label={`${trend.direction === 'up' ? '+' : '-'}${trend.value}%`}
                  color={trend.direction === 'up' ? 'success' : 'error'}
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${colors[color]}15`,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon as React.ReactElement, {
              sx: { fontSize: 32, color: colors[color] },
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ workspaceId }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all statistics in parallel
      const [workspacesRes, pipelinesRes, dealsRes, contactsRes, boardsRes, activitiesRes] =
        await Promise.allSettled([
          axios.get('/api/crm/workspaces'),
          axios.get('/api/crm/pipelines'),
          axios.get('/api/crm/deals'),
          axios.get('/api/crm/contacts'),
          axios.get('/api/crm/boards'),
          axios.get('/api/crm/activities'),
        ]);

      // Process workspaces
      const workspaces =
        workspacesRes.status === 'fulfilled' ? workspacesRes.value.data : [];
      const workspacesStats = {
        total: workspaces.length || 0,
        active: workspaces.filter((w: any) => !w.isPanicMode).length || 0,
        panicMode: workspaces.filter((w: any) => w.isPanicMode).length || 0,
      };

      // Process pipelines
      const pipelines =
        pipelinesRes.status === 'fulfilled' ? pipelinesRes.value.data : [];
      const pipelinesStats = {
        total: pipelines.length || 0,
        activeDeals: 0, // Will be calculated from deals
      };

      // Process deals
      const deals = dealsRes.status === 'fulfilled' ? dealsRes.value.data : [];
      const dealsStats = {
        total: deals.length || 0,
        totalValue: deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
        avgValue:
          deals.length > 0
            ? deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / deals.length
            : 0,
        wonCount: deals.filter((d: any) => d.stage?.isWon).length || 0,
        lostCount: deals.filter((d: any) => d.stage?.isLost).length || 0,
      };
      pipelinesStats.activeDeals = deals.filter(
        (d: any) => !d.stage?.isWon && !d.stage?.isLost
      ).length;

      // Process contacts
      const contacts =
        contactsRes.status === 'fulfilled' ? contactsRes.value.data : [];
      const contactsStats = {
        total: contacts.length || 0,
        leads: contacts.filter((c: any) => c.type === 'lead').length || 0,
        customers: contacts.filter((c: any) => c.type === 'customer').length || 0,
        hotLeads: contacts.filter((c: any) => c.leadQuality === 'hot').length || 0,
      };

      // Process boards
      const boards = boardsRes.status === 'fulfilled' ? boardsRes.value.data : [];
      const boardsStats = {
        total: boards.length || 0,
        totalItems: boards.reduce((sum: number, b: any) => sum + (b.itemsCount || 0), 0),
      };

      // Process activities
      const activities =
        activitiesRes.status === 'fulfilled' ? activitiesRes.value.data : [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const activitiesStats = {
        todayCount: activities.filter(
          (a: any) => new Date(a.created_at) >= todayStart
        ).length,
        weekCount: activities.filter(
          (a: any) => new Date(a.created_at) >= weekStart
        ).length,
      };

      setStats({
        workspaces: workspacesStats,
        pipelines: pipelinesStats,
        deals: dealsStats,
        contacts: contactsStats,
        boards: boardsStats,
        activities: activitiesStats,
      });

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.response?.data?.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [workspaceId]);

  const handleRefresh = () => {
    loadStats();
  };

  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Estadísticas del CRM
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="textSecondary">
            Actualizado: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Actualizar">
            <IconButton onClick={handleRefresh} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Workspaces */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Espacios de Trabajo"
            value={stats.workspaces.total}
            subtitle={`${stats.workspaces.active} activos • ${stats.workspaces.panicMode} en modo pánico`}
            icon={<BusinessIcon />}
            color="primary"
          />
        </Grid>

        {/* Deals */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Negocios Totales"
            value={stats.deals.total}
            subtitle={`${stats.pipelines.activeDeals} activos • ${stats.deals.wonCount} ganados`}
            icon={<TrendingUpIcon />}
            color="success"
          />
        </Grid>

        {/* Deal Value */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Valor Total en Negocios"
            value={formatCurrency(stats.deals.totalValue)}
            subtitle={`Promedio: ${formatCurrency(stats.deals.avgValue)}`}
            icon={<MoneyIcon />}
            color="success"
          />
        </Grid>

        {/* Contacts */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Contactos Totales"
            value={stats.contacts.total}
            subtitle={`${stats.contacts.leads} leads • ${stats.contacts.customers} clientes`}
            icon={<PeopleIcon />}
            color="info"
          />
        </Grid>

        {/* Hot Leads */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Leads Calientes"
            value={stats.contacts.hotLeads}
            subtitle="Alta prioridad"
            icon={<ChartIcon />}
            color="warning"
          />
        </Grid>

        {/* Pipelines */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Pipelines Activos"
            value={stats.pipelines.total}
            subtitle={`${stats.pipelines.activeDeals} negocios en proceso`}
            icon={<AssessmentIcon />}
            color="primary"
          />
        </Grid>

        {/* Boards */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Tableros"
            value={stats.boards.total}
            subtitle={`${stats.boards.totalItems} items totales`}
            icon={<AssessmentIcon />}
            color="info"
          />
        </Grid>

        {/* Activities Today */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Actividades Hoy"
            value={stats.activities.todayCount}
            subtitle={`${stats.activities.weekCount} esta semana`}
            icon={<TrendingUpIcon />}
            color="success"
          />
        </Grid>

        {/* Lost Deals */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Negocios Perdidos"
            value={stats.deals.lostCount}
            subtitle="Requieren análisis"
            icon={<TrendingUpIcon />}
            color="error"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardStats;
