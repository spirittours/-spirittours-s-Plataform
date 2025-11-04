import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Grid,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Rocket as RocketIcon,
  CheckCircle as CheckIcon,
  TrendingDown as SavingsIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

const steps = [
  'Perfil de Negocio',
  'Volumen de Emails',
  'Presupuesto',
  'Prioridades',
  'Confirmación'
];

export default function WizardSetup({ onComplete }) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  
  const [profile, setProfile] = useState({
    businessName: '',
    dailyVolume: 500,
    monthlyBudget: 100,
    technicalExpertise: 'medium',
    priorities: []
  });

  const handleNext = async () => {
    if (activeStep === steps.length - 2) {
      // Último paso antes de confirmación - obtener recomendación
      await fetchRecommendation();
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email-config/wizard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile: profile })
      });
      const data = await response.json();
      setRecommendation(data.recommendation);
    } catch (error) {
      console.error('Error fetching recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email-config/wizard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recommendation)
      });
      const result = await response.json();
      
      if (result.success) {
        onComplete(result.config);
      }
    } catch (error) {
      console.error('Error completing setup:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nombre del Negocio"
              value={profile.businessName}
              onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Nivel Técnico</InputLabel>
              <Select
                value={profile.technicalExpertise}
                onChange={(e) => setProfile({ ...profile, technicalExpertise: e.target.value })}
              >
                <MenuItem value="beginner">Principiante - Prefiero configuración automática</MenuItem>
                <MenuItem value="medium">Intermedio - Algo de experiencia técnica</MenuItem>
                <MenuItem value="advanced">Avanzado - Control total del sistema</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              ¿Cuántos emails necesitas enviar diariamente?
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="Emails por Día"
              value={profile.dailyVolume}
              onChange={(e) => setProfile({ ...profile, dailyVolume: parseInt(e.target.value) })}
              margin="normal"
              inputProps={{ min: 100, max: 10000, step: 100 }}
              helperText={`Aproximadamente ${(profile.dailyVolume * 30).toLocaleString()} emails por mes`}
            />
            
            <Alert severity="info" sx={{ mt: 2 }}>
              {profile.dailyVolume < 500 && "Volumen bajo - SMTP gratuito será suficiente"}
              {profile.dailyVolume >= 500 && profile.dailyVolume < 2000 && "Volumen medio - Recomendamos híbrido SMTP + SendGrid"}
              {profile.dailyVolume >= 2000 && "Alto volumen - Necesitarás múltiples servidores"}
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              ¿Cuál es tu presupuesto mensual para emails?
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="Presupuesto Mensual (USD)"
              value={profile.monthlyBudget}
              onChange={(e) => setProfile({ ...profile, monthlyBudget: parseInt(e.target.value) })}
              margin="normal"
              inputProps={{ min: 25, max: 1000, step: 25 }}
              helperText="Incluye SMTP, SendGrid, y costos de IA"
            />
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Estimación de Capacidad:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {Math.floor(profile.monthlyBudget * 35)}
                    </Typography>
                    <Typography variant="caption">
                      Emails/día aproximados
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="secondary">
                      ${(profile.monthlyBudget / profile.dailyVolume).toFixed(3)}
                    </Typography>
                    <Typography variant="caption">
                      Costo por email
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              ¿Qué es más importante para ti? (Selecciona hasta 3)
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              {[
                { value: 'cost', label: 'Bajo Costo', icon: <SavingsIcon /> },
                { value: 'reliability', label: 'Confiabilidad', icon: <CheckIcon /> },
                { value: 'speed', label: 'Velocidad', icon: <SpeedIcon /> },
                { value: 'quality', label: 'Calidad del Contenido', icon: <RocketIcon /> },
                { value: 'scalability', label: 'Escalabilidad', icon: <RocketIcon /> }
              ].map((priority) => (
                <Chip
                  key={priority.value}
                  icon={priority.icon}
                  label={priority.label}
                  onClick={() => {
                    const current = profile.priorities;
                    const index = current.indexOf(priority.value);
                    
                    if (index > -1) {
                      // Remover si ya existe
                      setProfile({
                        ...profile,
                        priorities: current.filter((p) => p !== priority.value)
                      });
                    } else if (current.length < 3) {
                      // Agregar si hay espacio
                      setProfile({
                        ...profile,
                        priorities: [...current, priority.value]
                      });
                    }
                  }}
                  color={profile.priorities.includes(priority.value) ? 'primary' : 'default'}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              Has seleccionado {profile.priorities.length} de 3 prioridades
            </Alert>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ mt: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : recommendation ? (
              <>
                <Alert severity="success" icon={<RocketIcon />} sx={{ mb: 3 }}>
                  ¡Hemos encontrado la configuración perfecta para ti!
                </Alert>

                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Configuración Recomendada
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'primary.light' }}>
                          <Typography variant="subtitle2" color="primary.contrastText">
                            Multi-Server
                          </Typography>
                          <Typography variant="h6" color="primary.contrastText">
                            {recommendation.multiServer}
                          </Typography>
                          <Typography variant="caption" color="primary.contrastText">
                            Capacidad: {recommendation.capacity?.toLocaleString()} emails/día
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'secondary.light' }}>
                          <Typography variant="subtitle2" color="secondary.contrastText">
                            Estrategia de Costo
                          </Typography>
                          <Typography variant="h6" color="secondary.contrastText">
                            {recommendation.costStrategy}
                          </Typography>
                          <Typography variant="caption" color="secondary.contrastText">
                            Ahorro: ${recommendation.estimatedSavings}/mes
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                          <Typography variant="subtitle2" color="success.contrastText">
                            Modo de Agentes
                          </Typography>
                          <Typography variant="h6" color="success.contrastText">
                            {recommendation.agentMode}
                          </Typography>
                          <Typography variant="caption" color="success.contrastText">
                            80% IA, 20% Humanos
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                          <Typography variant="subtitle2" color="info.contrastText">
                            Costo Mensual
                          </Typography>
                          <Typography variant="h6" color="info.contrastText">
                            ${recommendation.estimatedCost}
                          </Typography>
                          <Typography variant="caption" color="info.contrastText">
                            Dentro de tu presupuesto
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body2" color="textSecondary">
                        <strong>Por qué esta configuración:</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {recommendation.reasoning}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Configuración Guiada - Email Campaign System
      </Typography>
      <Typography variant="body2" color="textSecondary" align="center" paragraph>
        Te guiaremos paso a paso para configurar tu sistema en menos de 5 minutos
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mt: 4, mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent sx={{ minHeight: 400 }}>
          {renderStepContent(activeStep)}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Atrás
        </Button>
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleComplete}
              disabled={loading || !recommendation}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              Completar Configuración
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && !profile.businessName) ||
                (activeStep === 3 && profile.priorities.length === 0)
              }
            >
              {activeStep === steps.length - 2 ? 'Ver Recomendación' : 'Siguiente'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
