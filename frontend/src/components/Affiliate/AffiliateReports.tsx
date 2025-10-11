/**
 * Affiliate Reports Component  
 * Comprehensive Spanish-language sales reports with net/gross prices and commissions
 * "reportes completos de ventas (precios netos sin comisiones y precios brutos, 
 * otro opción con comisiones o sin comisiones de empleados o terceros), 
 * número de pasajeros vendidos, entre una fecha y otra"
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Switch,
  Alert,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Radio,
  RadioGroup,
  InputAdornment,
} from '@mui/material';
import {
  DateRangePicker,
  LocalizationProvider,
} from '@mui/x-date-pickers-pro';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Download,
  Print,
  Email,
  FilterList,
  Search,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  FlightTakeoff,
  Hotel,
  DirectionsCar,
  Restaurant,
  ConfirmationNumber,
  Assessment,
  ExpandMore,
  Refresh,
  PictureAsPdf,
  TableChart,
  BarChart,
  PieChart,
  ShowChart,
  CalendarToday,
  Person,
  Group,
  Business,
  AccountBalance,
  MonetizationOn,
  RemoveCircle,
  AddCircle,
  CheckCircle,
  Cancel,
  Info,
  Warning,
  Error as ErrorIcon,
  Language,
  LocationOn,
  Category,
  LocalOffer,
  Timeline,
  Speed,
  Receipt,
  Assignment,
  CreditCard,
  Paid,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Extend jsPDF for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportFilters {
  startDate: Date | null;
  endDate: Date | null;
  reportType: 'net' | 'gross' | 'commission' | 'detailed';
  commissionType: 'none' | 'employee' | 'affiliate' | 'all';
  groupBy: 'day' | 'week' | 'month' | 'product' | 'customer' | 'affiliate';
  productTypes: string[];
  affiliates: string[];
  destinations: string[];
  status: string[];
  currency: string;
  includeRefunds: boolean;
  includeCancellations: boolean;
}

interface SalesData {
  id: string;
  fecha: Date;
  referencia_reserva: string;
  cliente_nombre: string;
  cliente_email: string;
  producto_tipo: string;
  producto_nombre: string;
  destino: string;
  fecha_viaje: Date;
  num_pasajeros: number;
  num_adultos: number;
  num_ninos: number;
  num_infantes: number;
  precio_unitario: number;
  precio_bruto_total: number;
  descuento: number;
  impuestos: number;
  precio_neto_sin_comision: number;
  comision_empleado: number;
  comision_afiliado: number;
  comision_terceros: number;
  comision_total: number;
  precio_neto_final: number;
  margen_beneficio: number;
  porcentaje_margen: number;
  estado: 'confirmado' | 'pendiente' | 'cancelado' | 'reembolsado';
  metodo_pago: string;
  afiliado_codigo?: string;
  afiliado_tipo?: string;
  empleado_nombre?: string;
  notas?: string;
}

interface ReportSummary {
  ventas_totales: number;
  ingresos_brutos: number;
  ingresos_netos: number;
  comisiones_totales: number;
  comisiones_empleados: number;
  comisiones_afiliados: number;
  comisiones_terceros: number;
  descuentos_totales: number;
  impuestos_totales: number;
  margen_total: number;
  num_reservas: number;
  num_pasajeros_total: number;
  num_adultos_total: number;
  num_ninos_total: number;
  num_infantes_total: number;
  ticket_promedio: number;
  tasa_conversion: number;
  productos_mas_vendidos: Array<{
    nombre: string;
    cantidad: number;
    ingresos: number;
  }>;
  destinos_populares: Array<{
    nombre: string;
    reservas: number;
    pasajeros: number;
  }>;
}

const AffiliateReports: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState<keyof SalesData>('fecha');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    reportType: 'detailed',
    commissionType: 'all',
    groupBy: 'day',
    productTypes: [],
    affiliates: [],
    destinations: [],
    status: ['confirmado'],
    currency: 'USD',
    includeRefunds: false,
    includeCancellations: false,
  });

  // Fetch report data
  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/affiliates/reports/sales', {
        params: {
          start_date: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : undefined,
          end_date: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : undefined,
          report_type: filters.reportType,
          commission_type: filters.commissionType,
          group_by: filters.groupBy,
          product_types: filters.productTypes.join(','),
          affiliates: filters.affiliates.join(','),
          destinations: filters.destinations.join(','),
          status: filters.status.join(','),
          currency: filters.currency,
          include_refunds: filters.includeRefunds,
          include_cancellations: filters.includeCancellations,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('affiliate_token')}`,
        },
      });
      
      setSalesData(response.data.data);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSort = (property: keyof SalesData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = salesData.map((n) => n.id);
      setSelectedRows(newSelected);
      return;
    }
    setSelectedRows([]);
  };

  const handleClick = (id: string) => {
    const selectedIndex = selectedRows.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRows, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRows.slice(1));
    } else if (selectedIndex === selectedRows.length - 1) {
      newSelected = newSelected.concat(selectedRows.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRows.slice(0, selectedIndex),
        selectedRows.slice(selectedIndex + 1)
      );
    }

    setSelectedRows(newSelected);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: filters.currency,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'success';
      case 'pendiente':
        return 'warning';
      case 'cancelado':
        return 'error';
      case 'reembolsado':
        return 'info';
      default:
        return 'default';
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Reporte de Ventas - Spirit Tours', 14, 22);
    
    // Add date range
    doc.setFontSize(12);
    doc.text(
      `Período: ${format(filters.startDate || new Date(), 'dd/MM/yyyy')} - ${format(
        filters.endDate || new Date(),
        'dd/MM/yyyy'
      )}`,
      14,
      32
    );
    
    // Add summary
    if (summary) {
      doc.setFontSize(14);
      doc.text('Resumen', 14, 45);
      
      doc.setFontSize(10);
      let yPos = 55;
      doc.text(`Ventas Totales: ${formatCurrency(summary.ventas_totales)}`, 14, yPos);
      yPos += 7;
      doc.text(`Ingresos Brutos: ${formatCurrency(summary.ingresos_brutos)}`, 14, yPos);
      yPos += 7;
      doc.text(`Ingresos Netos: ${formatCurrency(summary.ingresos_netos)}`, 14, yPos);
      yPos += 7;
      doc.text(`Comisiones Totales: ${formatCurrency(summary.comisiones_totales)}`, 14, yPos);
      yPos += 7;
      doc.text(`Número de Reservas: ${summary.num_reservas}`, 14, yPos);
      yPos += 7;
      doc.text(`Total Pasajeros: ${summary.num_pasajeros_total}`, 14, yPos);
    }
    
    // Add table
    const tableData = salesData.map((row) => [
      format(parseISO(row.fecha.toString()), 'dd/MM/yyyy'),
      row.referencia_reserva,
      row.cliente_nombre,
      row.producto_nombre,
      row.num_pasajeros.toString(),
      formatCurrency(row.precio_bruto_total),
      formatCurrency(row.comision_total),
      formatCurrency(row.precio_neto_final),
    ]);
    
    doc.autoTable({
      head: [
        ['Fecha', 'Referencia', 'Cliente', 'Producto', 'Pax', 'P. Bruto', 'Comisión', 'P. Neto'],
      ],
      body: tableData,
      startY: 100,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243] },
    });
    
    // Save the PDF
    doc.save(`reporte-ventas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      salesData.map((row) => ({
        Fecha: format(parseISO(row.fecha.toString()), 'dd/MM/yyyy'),
        'Referencia Reserva': row.referencia_reserva,
        'Nombre Cliente': row.cliente_nombre,
        'Email Cliente': row.cliente_email,
        'Tipo Producto': row.producto_tipo,
        'Nombre Producto': row.producto_nombre,
        Destino: row.destino,
        'Fecha Viaje': format(parseISO(row.fecha_viaje.toString()), 'dd/MM/yyyy'),
        'Núm. Pasajeros': row.num_pasajeros,
        Adultos: row.num_adultos,
        Niños: row.num_ninos,
        Infantes: row.num_infantes,
        'Precio Unitario': row.precio_unitario,
        'Precio Bruto Total': row.precio_bruto_total,
        Descuento: row.descuento,
        Impuestos: row.impuestos,
        'Precio Neto Sin Comisión': row.precio_neto_sin_comision,
        'Comisión Empleado': row.comision_empleado,
        'Comisión Afiliado': row.comision_afiliado,
        'Comisión Terceros': row.comision_terceros,
        'Comisión Total': row.comision_total,
        'Precio Neto Final': row.precio_neto_final,
        'Margen Beneficio': row.margen_beneficio,
        '% Margen': formatPercentage(row.porcentaje_margen),
        Estado: row.estado,
        'Método Pago': row.metodo_pago,
        'Código Afiliado': row.afiliado_codigo || '',
        'Empleado': row.empleado_nombre || '',
      }))
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    
    // Add summary sheet if available
    if (summary) {
      const summaryData = [
        ['Resumen de Ventas'],
        [''],
        ['Métrica', 'Valor'],
        ['Ventas Totales', formatCurrency(summary.ventas_totales)],
        ['Ingresos Brutos', formatCurrency(summary.ingresos_brutos)],
        ['Ingresos Netos', formatCurrency(summary.ingresos_netos)],
        ['Comisiones Totales', formatCurrency(summary.comisiones_totales)],
        ['Comisiones Empleados', formatCurrency(summary.comisiones_empleados)],
        ['Comisiones Afiliados', formatCurrency(summary.comisiones_afiliados)],
        ['Comisiones Terceros', formatCurrency(summary.comisiones_terceros)],
        ['Descuentos Totales', formatCurrency(summary.descuentos_totales)],
        ['Impuestos Totales', formatCurrency(summary.impuestos_totales)],
        ['Margen Total', formatCurrency(summary.margen_total)],
        ['Número de Reservas', summary.num_reservas.toString()],
        ['Total Pasajeros', summary.num_pasajeros_total.toString()],
        ['Adultos', summary.num_adultos_total.toString()],
        ['Niños', summary.num_ninos_total.toString()],
        ['Infantes', summary.num_infantes_total.toString()],
        ['Ticket Promedio', formatCurrency(summary.ticket_promedio)],
        ['Tasa de Conversión', formatPercentage(summary.tasa_conversion)],
      ];
      
      const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');
    }
    
    XLSX.writeFile(wb, `reporte-ventas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const renderFilters = () => (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="h6">Filtros de Reporte</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          {/* Date Range */}
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DateRangePicker
                startText="Fecha Inicio"
                endText="Fecha Fin"
                value={[filters.startDate, filters.endDate]}
                onChange={(newValue: any) => {
                  setFilters({
                    ...filters,
                    startDate: newValue[0],
                    endDate: newValue[1],
                  });
                }}
                renderInput={(startProps: any, endProps: any) => (
                  <>
                    <TextField {...startProps} fullWidth />
                    <Box sx={{ mx: 2 }}> hasta </Box>
                    <TextField {...endProps} fullWidth />
                  </>
                )}
              />
            </LocalizationProvider>
          </Grid>
          
          {/* Report Type */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Reporte</InputLabel>
              <Select
                value={filters.reportType}
                onChange={(e) => setFilters({ ...filters, reportType: e.target.value as any })}
              >
                <MenuItem value="net">Precios Netos</MenuItem>
                <MenuItem value="gross">Precios Brutos</MenuItem>
                <MenuItem value="commission">Solo Comisiones</MenuItem>
                <MenuItem value="detailed">Detallado Completo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Commission Type */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Comisión</InputLabel>
              <Select
                value={filters.commissionType}
                onChange={(e) => setFilters({ ...filters, commissionType: e.target.value as any })}
              >
                <MenuItem value="none">Sin Comisiones</MenuItem>
                <MenuItem value="employee">Solo Empleados</MenuItem>
                <MenuItem value="affiliate">Solo Afiliados</MenuItem>
                <MenuItem value="all">Todas las Comisiones</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Group By */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Agrupar Por</InputLabel>
              <Select
                value={filters.groupBy}
                onChange={(e) => setFilters({ ...filters, groupBy: e.target.value as any })}
              >
                <MenuItem value="day">Día</MenuItem>
                <MenuItem value="week">Semana</MenuItem>
                <MenuItem value="month">Mes</MenuItem>
                <MenuItem value="product">Producto</MenuItem>
                <MenuItem value="customer">Cliente</MenuItem>
                <MenuItem value="affiliate">Afiliado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Currency */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Moneda</InputLabel>
              <Select
                value={filters.currency}
                onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              >
                <MenuItem value="USD">USD - Dólar</MenuItem>
                <MenuItem value="PEN">PEN - Sol</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="BRL">BRL - Real</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Product Types */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Producto</InputLabel>
              <Select
                multiple
                value={filters.productTypes}
                onChange={(e) => setFilters({ ...filters, productTypes: e.target.value as string[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="tours">Tours</MenuItem>
                <MenuItem value="hotels">Hoteles</MenuItem>
                <MenuItem value="flights">Vuelos</MenuItem>
                <MenuItem value="transfers">Traslados</MenuItem>
                <MenuItem value="activities">Actividades</MenuItem>
                <MenuItem value="packages">Paquetes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Status */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                multiple
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as string[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        color={getStatusColor(value) as any}
                      />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="confirmado">Confirmado</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
                <MenuItem value="reembolsado">Reembolsado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Options */}
          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.includeRefunds}
                    onChange={(e) => setFilters({ ...filters, includeRefunds: e.target.checked })}
                  />
                }
                label="Incluir Reembolsos"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.includeCancellations}
                    onChange={(e) =>
                      setFilters({ ...filters, includeCancellations: e.target.checked })
                    }
                  />
                }
                label="Incluir Cancelaciones"
              />
            </Box>
          </Grid>
          
          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={fetchReportData}
                disabled={loading}
              >
                Generar Reporte
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  setFilters({
                    ...filters,
                    startDate: startOfMonth(new Date()),
                    endDate: endOfMonth(new Date()),
                  });
                }}
              >
                Restablecer
              </Button>
            </Box>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  const renderSummary = () => {
    if (!summary) return null;
    
    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Key Metrics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="subtitle2">
                    Ventas Totales
                  </Typography>
                  <Typography variant="h5">{formatCurrency(summary.ventas_totales)}</Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +15.3%
                    </Typography>
                  </Box>
                </Box>
                <AttachMoney color="primary" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="subtitle2">
                    Ingresos Netos
                  </Typography>
                  <Typography variant="h5">{formatCurrency(summary.ingresos_netos)}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Margen: {formatPercentage(summary.margen_total / summary.ingresos_brutos)}
                  </Typography>
                </Box>
                <Paid color="success" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="subtitle2">
                    Total Pasajeros
                  </Typography>
                  <Typography variant="h5">{summary.num_pasajeros_total}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {summary.num_reservas} reservas
                  </Typography>
                </Box>
                <People color="info" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="subtitle2">
                    Ticket Promedio
                  </Typography>
                  <Typography variant="h5">{formatCurrency(summary.ticket_promedio)}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Conv: {formatPercentage(summary.tasa_conversion)}
                  </Typography>
                </Box>
                <Receipt color="warning" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Commission Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Desglose de Comisiones
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText primary="Comisiones Empleados" />
                <Typography variant="body2">{formatCurrency(summary.comisiones_empleados)}</Typography>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Group />
                </ListItemIcon>
                <ListItemText primary="Comisiones Afiliados" />
                <Typography variant="body2">{formatCurrency(summary.comisiones_afiliados)}</Typography>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Business />
                </ListItemIcon>
                <ListItemText primary="Comisiones Terceros" />
                <Typography variant="body2">{formatCurrency(summary.comisiones_terceros)}</Typography>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <MonetizationOn />
                </ListItemIcon>
                <ListItemText primary={<strong>Total Comisiones</strong>} />
                <Typography variant="h6" color="primary">
                  {formatCurrency(summary.comisiones_totales)}
                </Typography>
              </ListItem>
            </List>
          </Paper>
        </Grid>
        
        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Productos Más Vendidos
            </Typography>
            <List dense>
              {summary.productos_mas_vendidos.slice(0, 5).map((producto, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Chip label={index + 1} size="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={producto.nombre}
                    secondary={`${producto.cantidad} ventas`}
                  />
                  <Typography variant="body2">{formatCurrency(producto.ingresos)}</Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderDataTable = () => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedRows.length > 0 && selectedRows.length < salesData.length}
                checked={salesData.length > 0 && selectedRows.length === salesData.length}
                onChange={handleSelectAllClick}
              />
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'fecha'}
                direction={orderBy === 'fecha' ? order : 'asc'}
                onClick={() => handleRequestSort('fecha')}
              >
                Fecha
              </TableSortLabel>
            </TableCell>
            <TableCell>Referencia</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Producto</TableCell>
            <TableCell>Destino</TableCell>
            <TableCell align="center">Pax</TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === 'precio_bruto_total'}
                direction={orderBy === 'precio_bruto_total' ? order : 'asc'}
                onClick={() => handleRequestSort('precio_bruto_total')}
              >
                P. Bruto
              </TableSortLabel>
            </TableCell>
            {(filters.reportType === 'detailed' || filters.reportType === 'commission') && (
              <>
                <TableCell align="right">Com. Empleado</TableCell>
                <TableCell align="right">Com. Afiliado</TableCell>
                <TableCell align="right">Com. Total</TableCell>
              </>
            )}
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === 'precio_neto_final'}
                direction={orderBy === 'precio_neto_final' ? order : 'asc'}
                onClick={() => handleRequestSort('precio_neto_final')}
              >
                P. Neto Final
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">Estado</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={14} align="center">
                <LinearProgress />
              </TableCell>
            </TableRow>
          ) : salesData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={14} align="center">
                <Typography color="textSecondary">No hay datos para mostrar</Typography>
              </TableCell>
            </TableRow>
          ) : (
            salesData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => {
                const isSelected = selectedRows.indexOf(row.id) !== -1;
                
                return (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => handleClick(row.id)}
                    selected={isSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} />
                    </TableCell>
                    <TableCell>
                      {format(parseISO(row.fecha.toString()), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Chip label={row.referencia_reserva} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={row.cliente_email}>
                        <Typography variant="body2">{row.cliente_nombre}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.producto_nombre}</TableCell>
                    <TableCell>{row.destino}</TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2">{row.num_pasajeros}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {row.num_adultos}A {row.num_ninos > 0 && `${row.num_ninos}N`}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(row.precio_bruto_total)}</TableCell>
                    {(filters.reportType === 'detailed' || filters.reportType === 'commission') && (
                      <>
                        <TableCell align="right">
                          {row.comision_empleado > 0 && formatCurrency(row.comision_empleado)}
                        </TableCell>
                        <TableCell align="right">
                          {row.comision_afiliado > 0 && (
                            <Box>
                              <Typography variant="body2">
                                {formatCurrency(row.comision_afiliado)}
                              </Typography>
                              {row.afiliado_codigo && (
                                <Typography variant="caption" color="textSecondary">
                                  {row.afiliado_codigo}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography color="primary.main">
                            {formatCurrency(row.comision_total)}
                          </Typography>
                        </TableCell>
                      </>
                    )}
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2">{formatCurrency(row.precio_neto_final)}</Typography>
                        <Typography variant="caption" color={row.porcentaje_margen > 0.2 ? 'success.main' : 'warning.main'}>
                          {formatPercentage(row.porcentaje_margen)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.estado}
                        size="small"
                        color={getStatusColor(row.estado) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <Info />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={salesData.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Reportes de Ventas
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Reporte completo de ventas con precios netos, brutos y comisiones
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdf />}
            onClick={exportToPDF}
            disabled={salesData.length === 0}
          >
            Exportar PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<TableChart />}
            onClick={exportToExcel}
            disabled={salesData.length === 0}
          >
            Exportar Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => window.print()}
            disabled={salesData.length === 0}
          >
            Imprimir
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      {renderFilters()}
      
      {/* Summary */}
      <Box mt={3}>{renderSummary()}</Box>
      
      {/* Data Table */}
      <Box mt={3}>{renderDataTable()}</Box>
      
      {/* Footer Info */}
      {salesData.length > 0 && (
        <Box mt={3}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Nota:</strong> Los precios netos excluyen comisiones según la configuración seleccionada.
              Los montos están expresados en {filters.currency}. Período del reporte:{' '}
              {format(filters.startDate || new Date(), 'dd/MM/yyyy', { locale: es })} -{' '}
              {format(filters.endDate || new Date(), 'dd/MM/yyyy', { locale: es })}
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default AffiliateReports;