/**
 * ERP Account Mapping
 * Configuración de mapeo de cuentas contables entre Spirit Tours y ERP
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, Grid, Card, CardContent, TextField
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface ERPAccountMappingProps {
  branchId: string | null;
  erpConfigs: any[];
}

interface AccountMapping {
  spirit_account: string;
  spirit_account_name: string;
  erp_account_code: string;
  erp_account_name: string;
  erp_provider: string;
}

const ERPAccountMapping: React.FC<ERPAccountMappingProps> = ({ branchId, erpConfigs }) => {
  const [selectedERP, setSelectedERP] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erpAccounts, setERPAccounts] = useState<any[]>([]);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (erpConfigs.length > 0 && !selectedERP) {
      setSelectedERP(erpConfigs[0].erp_provider);
    }
  }, [erpConfigs]);

  useEffect(() => {
    if (selectedERP && branchId) {
      fetchERPAccounts();
      fetchMappings();
    }
  }, [selectedERP, branchId]);

  const fetchERPAccounts = async () => {
    if (!branchId || !selectedERP) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/erp-hub/accounts/${branchId}/${selectedERP}`);
      setERPAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Error fetching ERP accounts:', error);
      toast.error('Error al cargar cuentas del ERP');
    } finally {
      setLoading(false);
    }
  };

  const fetchMappings = async () => {
    if (!branchId || !selectedERP) return;
    try {
      const response = await axios.get(`/api/erp-hub/account-mapping/${branchId}/${selectedERP}`);
      setMappings(response.data.mappings || []);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const handleSaveMappings = async () => {
    if (!branchId || !selectedERP) return;
    try {
      setSaving(true);
      await axios.post(`/api/erp-hub/account-mapping/${branchId}/${selectedERP}`, {
        mappings
      });
      toast.success('Mapeos guardados exitosamente');
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error('Error al guardar mapeos');
    } finally {
      setSaving(false);
    }
  };

  const handleMappingChange = (index: number, erpAccountCode: string) => {
    const newMappings = [...mappings];
    const erpAccount = erpAccounts.find(acc => acc.code === erpAccountCode);
    newMappings[index].erp_account_code = erpAccountCode;
    newMappings[index].erp_account_name = erpAccount?.name || '';
    setMappings(newMappings);
  };

  // Default Spirit Tours accounts that need mapping
  const defaultSpiritAccounts = [
    { code: 'AR', name: 'Cuentas por Cobrar' },
    { code: 'REV', name: 'Ingresos por Tours' },
    { code: 'TAX_PAYABLE', name: 'Impuestos por Pagar' },
    { code: 'BANK', name: 'Cuenta Bancaria Principal' },
    { code: 'AP', name: 'Cuentas por Pagar' },
    { code: 'EXPENSE', name: 'Gastos Operativos' }
  ];

  // Initialize mappings if empty
  useEffect(() => {
    if (mappings.length === 0 && selectedERP) {
      setMappings(defaultSpiritAccounts.map(acc => ({
        spirit_account: acc.code,
        spirit_account_name: acc.name,
        erp_account_code: '',
        erp_account_name: '',
        erp_provider: selectedERP
      })));
    }
  }, [selectedERP, mappings.length]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Mapeo de Cuentas Contables</Typography>
        <Box>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={fetchERPAccounts}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Actualizar Cuentas
          </Button>
          <Button 
            startIcon={<SaveIcon />} 
            variant="contained"
            onClick={handleSaveMappings}
            disabled={saving || !selectedERP}
          >
            Guardar Mapeos
          </Button>
        </Box>
      </Box>

      {/* ERP Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Sistema ERP</InputLabel>
                <Select
                  value={selectedERP}
                  onChange={(e) => setSelectedERP(e.target.value)}
                  label="Sistema ERP"
                >
                  {erpConfigs.map(config => (
                    <MenuItem key={config.id} value={config.erp_provider}>
                      {config.erp_provider} ({config.erp_region})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <Alert severity="info">
                Configura cómo las cuentas de Spirit Tours se mapean a las cuentas de tu sistema ERP.
                Esto asegura que las transacciones se registren en las cuentas correctas.
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Mapping Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Cuenta Spirit Tours</strong></TableCell>
                <TableCell><strong>Descripción</strong></TableCell>
                <TableCell><strong>Cuenta ERP</strong></TableCell>
                <TableCell><strong>Nombre Cuenta ERP</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mappings.map((mapping, index) => (
                <TableRow key={mapping.spirit_account}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {mapping.spirit_account}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {mapping.spirit_account_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        value={mapping.erp_account_code}
                        onChange={(e) => handleMappingChange(index, e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Seleccionar cuenta...</em>
                        </MenuItem>
                        {erpAccounts.map(account => (
                          <MenuItem key={account.code} value={account.code}>
                            {account.code} - {account.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {mapping.erp_account_name || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {erpAccounts.length === 0 && !loading && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No se pudieron cargar las cuentas del ERP. Asegúrate de que la conexión esté activa.
        </Alert>
      )}
    </Box>
  );
};

export default ERPAccountMapping;
