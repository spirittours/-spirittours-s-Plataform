/**
 * Dashboard de Facturación
 * Gestión completa de facturas y pagos
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Visibility,
  Payment,
  GetApp,
  Cancel,
  Receipt,
  AttachMoney,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import axios from 'axios';

interface Invoice {
  invoice_number: string;
  customer_name: string;
  issue_date: string;
  due_date: string | null;
  total: string;
  balance_due: string;
  status: string;
  is_overdue: boolean;
}

interface BillingStats {
  total_invoices: number;
  by_status: Record<string, number>;
  total_outstanding: string;
  total_overdue: string;
  overdue_count: number;
}

const BillingDashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, statsRes] = await Promise.all([
        axios.get('/api/billing/invoices?limit=50'),
        axios.get('/api/billing/stats'),
      ]);

      setInvoices(invoicesRes.data.invoices);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      draft: 'default',
      pending: 'warning',
      paid: 'success',
      partially_paid: 'info',
      overdue: 'error',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: color + '20',
              color: color,
              p: 1,
              borderRadius: 1,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Facturación
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Gestión completa de facturas y pagos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Nueva Factura
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Facturas"
              value={stats.total_invoices}
              icon={<Receipt />}
              color="#3b82f6"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Por Cobrar"
              value={formatCurrency(stats.total_outstanding)}
              icon={<AttachMoney />}
              color="#10b981"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Vencidas"
              value={stats.overdue_count}
              icon={<Warning />}
              color="#ef4444"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Monto Vencido"
              value={formatCurrency(stats.total_overdue)}
              icon={<TrendingUp />}
              color="#f59e0b"
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Todas las Facturas" />
          <Tab label="Pendientes" />
          <Tab label="Pagadas" />
          <Tab label="Vencidas" />
        </Tabs>

        {/* Invoices Table */}
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Fecha Emisión</TableCell>
                <TableCell>Fecha Vencimiento</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices
                .filter((inv) => {
                  if (tabValue === 0) return true;
                  if (tabValue === 1) return inv.status === 'pending' || inv.status === 'partially_paid';
                  if (tabValue === 2) return inv.status === 'paid';
                  if (tabValue === 3) return inv.is_overdue;
                  return true;
                })
                .map((invoice) => (
                  <TableRow key={invoice.invoice_number}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {invoice.invoice_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{invoice.customer_name}</TableCell>
                    <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                    <TableCell>
                      {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(invoice.total)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(invoice.balance_due)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        color={getStatusColor(invoice.status)}
                        size="small"
                      />
                      {invoice.is_overdue && (
                        <Chip
                          label="Vencida"
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => setSelectedInvoice(invoice.invoice_number)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      {invoice.status !== 'paid' && (
                        <IconButton size="small" color="success">
                          <Payment fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small">
                        <GetApp fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Nueva Factura</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cliente"
                variant="outlined"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                variant="outlined"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Moneda"
                select
                variant="outlined"
                defaultValue="USD"
              >
                <MenuItem value="USD">USD - Dólar</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="MXN">MXN - Peso Mexicano</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Términos de Pago"
                select
                variant="outlined"
                defaultValue="net_30"
              >
                <MenuItem value="immediate">Inmediato</MenuItem>
                <MenuItem value="net_15">Net 15</MenuItem>
                <MenuItem value="net_30">Net 30</MenuItem>
                <MenuItem value="net_60">Net 60</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Items
              </Typography>
              {/* Aquí irían los campos para agregar items */}
              <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Agregar items de factura (implementación pendiente)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                multiline
                rows={3}
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={() => {}}>
            Crear Factura
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Factura {selectedInvoice}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary">
            Vista detallada de la factura (implementación pendiente)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedInvoice(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingDashboard;
