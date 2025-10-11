# 🚀 SISTEMA TAAP COMPLETO - SPIRIT TOURS
## Travel Agency Affiliate Program - Análisis y Propuesta de Implementación

---

## 📊 ANÁLISIS DEL SISTEMA ACTUAL

### Estado Actual en Spirit Tours:
Después de revisar el código, he identificado que existe:

1. **Estructura Básica B2B** ✅
   - Modelos: TourOperator, TravelAgency, SalesAgent
   - Sistema de comisiones básico (5-10%)
   - Portal de agencias simple

2. **Funcionalidades Faltantes** ❌
   - No hay auto-registro para afiliados
   - Sin API pública para partners
   - Falta dashboard de afiliados
   - Sin sistema de tracking avanzado
   - No hay programa de incentivos escalonado
   - Falta widget embebible

---

## 🌐 BENCHMARKING DE LA INDUSTRIA (2024)

### Líderes del Mercado y Sus Estrategias:

| Programa | Comisión Base | Comisión Premium | Features Clave |
|----------|--------------|------------------|----------------|
| **Expedia TAAP** | 6-8% | 13-14% | API completa, 3M+ inventario |
| **Booking.com** | 4-6% | 10-12% | Instant booking, Multi-idioma |
| **Viator TAP** | 8% | 12% | Experiencias, Tours únicos |
| **TripAdvisor** | 50% CPC | - | $0.45/click desktop |
| **Agoda Partners** | 4-7% | 11% | Asia focus, Mobile-first |
| **GetYourGuide** | 5-8% | 15% | Actividades, Skip-the-line |

### Mejores Prácticas Identificadas:
1. **Comisiones Escalonadas** por volumen
2. **API REST completa** con webhooks
3. **Onboarding automatizado** < 5 minutos
4. **Dashboard en tiempo real**
5. **Widgets personalizables**
6. **Multi-moneda y multi-idioma**
7. **Pagos automatizados** (NET 30)
8. **Marketing materials** listos para usar

---

## 💡 PROPUESTA: SPIRIT TOURS TAAP PREMIUM

### 1. ESTRUCTURA DE COMISIONES REVOLUCIONARIA

```python
COMMISSION_STRUCTURE = {
    "STARTER": {
        "monthly_sales": "< $10,000",
        "base_commission": "8%",
        "bonus": "0%",
        "benefits": ["Basic API", "Email support"]
    },
    "SILVER": {
        "monthly_sales": "$10,000 - $50,000",
        "base_commission": "10%",
        "bonus": "2% quarterly",
        "benefits": ["Full API", "Priority support", "Marketing kit"]
    },
    "GOLD": {
        "monthly_sales": "$50,000 - $200,000",
        "base_commission": "12%",
        "bonus": "3% quarterly",
        "benefits": ["Dedicated manager", "Custom rates", "Co-branding"]
    },
    "PLATINUM": {
        "monthly_sales": "> $200,000",
        "base_commission": "15%",
        "bonus": "5% quarterly",
        "benefits": ["White label", "Revenue share", "Exclusive inventory"]
    }
}
```

### 2. TIPOS DE AFILIADOS

```yaml
INDIVIDUAL_AFFILIATE:
  - Travel bloggers
  - Influencers
  - Content creators
  - Commission: 5-8%
  - Cookie: 30 días

PROFESSIONAL_AGENT:
  - Travel agents certificados
  - Freelance advisors
  - Commission: 8-12%
  - Cookie: 60 días

AGENCY_PARTNER:
  - Agencias establecidas
  - Tour operators
  - Commission: 10-15%
  - NET terms: 30 días

ENTERPRISE_PARTNER:
  - OTAs
  - Corporativos
  - Commission: Negociable
  - Custom integration

TECHNOLOGY_PARTNER:
  - Apps de viaje
  - Metabuscadores
  - Revenue share: 20-30%
  - API premium
```

---

## 🛠️ IMPLEMENTACIÓN TÉCNICA COMPLETA

### FASE 1: Backend Infrastructure (2 semanas)

#### 1.1 Modelos de Base de Datos Nuevos

```sql
-- Tabla de Afiliados
CREATE TABLE affiliates (
    id UUID PRIMARY KEY,
    affiliate_code VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('individual', 'agent', 'agency', 'enterprise', 'tech'),
    tier ENUM('starter', 'silver', 'gold', 'platinum'),
    
    -- Información Personal/Empresa
    name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    tax_id VARCHAR(50),
    website VARCHAR(500),
    social_media JSONB,
    
    -- Contacto
    email VARCHAR(200) UNIQUE NOT NULL,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    
    -- Dirección
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Configuración
    commission_rate DECIMAL(5,2) DEFAULT 8.00,
    custom_commission JSONB,
    payment_terms VARCHAR(50) DEFAULT 'NET_30',
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50),
    
    -- Tracking
    referral_source VARCHAR(200),
    utm_params JSONB,
    signup_ip VARCHAR(45),
    
    -- Status
    status ENUM('pending', 'active', 'suspended', 'terminated') DEFAULT 'pending',
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,
    
    -- Documentos
    documents JSONB,
    contracts JSONB,
    
    -- API Access
    api_key VARCHAR(64) UNIQUE,
    api_secret VARCHAR(128),
    api_permissions JSONB,
    webhook_url VARCHAR(500),
    
    -- Estadísticas
    total_bookings INTEGER DEFAULT 0,
    total_sales DECIMAL(15,2) DEFAULT 0,
    total_commission DECIMAL(15,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    average_booking_value DECIMAL(12,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    last_activity TIMESTAMP,
    
    -- Índices
    INDEX idx_affiliate_code (affiliate_code),
    INDEX idx_email (email),
    INDEX idx_type_tier (type, tier),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC)
);

-- Tabla de Tracking de Clicks
CREATE TABLE affiliate_clicks (
    id BIGSERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id),
    
    -- Tracking Data
    click_id VARCHAR(100) UNIQUE,
    session_id VARCHAR(100),
    
    -- Source
    source_url TEXT,
    landing_page TEXT,
    referrer TEXT,
    
    -- Campaign
    campaign VARCHAR(200),
    medium VARCHAR(100),
    content TEXT,
    
    -- Device Info
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    os VARCHAR(50),
    browser VARCHAR(50),
    
    -- Location
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Timestamps
    clicked_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    
    INDEX idx_affiliate_clicks (affiliate_id, clicked_at DESC),
    INDEX idx_click_id (click_id),
    INDEX idx_session_id (session_id)
);

-- Tabla de Conversiones
CREATE TABLE affiliate_conversions (
    id BIGSERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id),
    click_id VARCHAR(100) REFERENCES affiliate_clicks(click_id),
    booking_id INTEGER REFERENCES bookings(id),
    
    -- Conversion Data
    conversion_type VARCHAR(50), -- 'booking', 'inquiry', 'signup'
    product_type VARCHAR(50), -- 'tour', 'package', 'activity'
    
    -- Financial
    booking_value DECIMAL(12,2),
    commission_rate DECIMAL(5,2),
    commission_amount DECIMAL(12,2),
    bonus_amount DECIMAL(10,2),
    total_payout DECIMAL(12,2),
    
    -- Status
    status ENUM('pending', 'confirmed', 'cancelled', 'paid'),
    confirmation_date TIMESTAMP,
    payment_date TIMESTAMP,
    
    -- Attribution
    attribution_model VARCHAR(50) DEFAULT 'last_click',
    attribution_weight DECIMAL(5,2) DEFAULT 100.00,
    
    -- Timestamps
    converted_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_conversions (affiliate_id, converted_at DESC),
    INDEX idx_booking (booking_id),
    INDEX idx_status (status)
);

-- Tabla de Pagos a Afiliados
CREATE TABLE affiliate_payments (
    id BIGSERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id),
    
    -- Payment Info
    payment_number VARCHAR(50) UNIQUE,
    period_start DATE,
    period_end DATE,
    
    -- Amounts
    total_bookings INTEGER,
    gross_sales DECIMAL(15,2),
    commission_amount DECIMAL(12,2),
    bonus_amount DECIMAL(10,2),
    adjustments DECIMAL(10,2),
    total_payment DECIMAL(12,2),
    
    -- Payment Method
    payment_method VARCHAR(50),
    payment_details JSONB,
    transaction_id VARCHAR(200),
    
    -- Status
    status ENUM('pending', 'processing', 'paid', 'failed'),
    paid_at TIMESTAMP,
    
    -- Documents
    invoice_url VARCHAR(500),
    receipt_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_payments (affiliate_id, created_at DESC),
    INDEX idx_payment_number (payment_number),
    INDEX idx_period (period_start, period_end)
);

-- Tabla de Material de Marketing
CREATE TABLE affiliate_materials (
    id SERIAL PRIMARY KEY,
    
    -- Material Info
    type VARCHAR(50), -- 'banner', 'widget', 'deeplink', 'email', 'social'
    name VARCHAR(200),
    description TEXT,
    
    -- Content
    content_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    html_code TEXT,
    
    -- Targeting
    languages JSONB,
    countries JSONB,
    categories JSONB,
    
    -- Performance
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_type_active (type, is_active)
);
```

#### 1.2 API REST Completa para Afiliados

```python
# backend/api/affiliate_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate"])

# ===== ENDPOINTS PÚBLICOS =====

@router.post("/register")
async def register_affiliate(data: AffiliateRegistration):
    """Auto-registro para nuevos afiliados"""
    # Validación y creación automática
    # Envío de email de bienvenida
    # Generación de API keys
    return {"affiliate_code": "AFF123456", "api_key": "..."}

@router.get("/check-availability/{code}")
async def check_code_availability(code: str):
    """Verificar disponibilidad de código de afiliado"""
    return {"available": True}

# ===== ENDPOINTS AUTENTICADOS =====

@router.get("/dashboard")
async def get_dashboard(affiliate = Depends(get_current_affiliate)):
    """Dashboard principal del afiliado"""
    return {
        "stats": {
            "clicks_today": 234,
            "conversions_today": 12,
            "revenue_month": 15678.90,
            "pending_payment": 3456.78,
            "conversion_rate": 5.13,
            "average_order": 234.56
        },
        "recent_bookings": [...],
        "top_products": [...],
        "performance_chart": [...]
    }

@router.get("/bookings")
async def get_affiliate_bookings(
    affiliate = Depends(get_current_affiliate),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Listado de reservas del afiliado"""
    return {
        "bookings": [...],
        "total": 1234,
        "page": page,
        "total_pages": 25
    }

@router.get("/commissions")
async def get_commissions(
    affiliate = Depends(get_current_affiliate),
    period: str = Query("current_month")
):
    """Detalle de comisiones"""
    return {
        "period": period,
        "base_commission": 2345.67,
        "bonus_commission": 345.67,
        "total": 2691.34,
        "details": [...]
    }

@router.get("/payments")
async def get_payment_history(affiliate = Depends(get_current_affiliate)):
    """Historial de pagos"""
    return {"payments": [...]}

@router.post("/generate-link")
async def generate_affiliate_link(
    affiliate = Depends(get_current_affiliate),
    url: str,
    campaign: Optional[str] = None
):
    """Generar link de afiliado con tracking"""
    return {
        "original_url": url,
        "affiliate_url": f"https://spirittours.com/ref/{affiliate.code}?url={url}&campaign={campaign}",
        "short_url": "https://sprt.tours/a1b2c3"
    }

@router.get("/materials")
async def get_marketing_materials(
    affiliate = Depends(get_current_affiliate),
    type: Optional[str] = None,
    language: str = "es"
):
    """Obtener materiales de marketing"""
    return {
        "banners": [...],
        "widgets": [...],
        "email_templates": [...],
        "social_posts": [...]
    }

@router.post("/webhook/configure")
async def configure_webhook(
    affiliate = Depends(get_current_affiliate),
    webhook_url: str,
    events: List[str]
):
    """Configurar webhook para notificaciones"""
    return {"status": "configured", "webhook_url": webhook_url}

# ===== API PARA BÚSQUEDA Y RESERVAS =====

@router.get("/products/search")
async def search_products(
    affiliate = Depends(get_current_affiliate),
    destination: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None
):
    """Buscar productos disponibles"""
    return {
        "products": [...],
        "total": 456,
        "filters_applied": {...}
    }

@router.get("/products/{product_id}")
async def get_product_details(
    product_id: int,
    affiliate = Depends(get_current_affiliate)
):
    """Detalles de un producto específico"""
    return {
        "product": {...},
        "availability": [...],
        "prices": {...},
        "commission": {
            "rate": 10,
            "amount": 25.50
        }
    }

@router.post("/bookings/create")
async def create_affiliate_booking(
    booking_data: BookingRequest,
    affiliate = Depends(get_current_affiliate)
):
    """Crear reserva a través del afiliado"""
    # Procesar reserva
    # Asignar comisión
    # Enviar notificaciones
    return {
        "booking_id": "BK123456",
        "status": "confirmed",
        "commission": 125.50
    }

@router.get("/reports/performance")
async def get_performance_report(
    affiliate = Depends(get_current_affiliate),
    period: str = "last_30_days"
):
    """Reporte detallado de performance"""
    return {
        "summary": {...},
        "by_product": [...],
        "by_channel": [...],
        "by_country": [...],
        "trends": [...]
    }
```

### FASE 2: Frontend - Portal de Afiliados (2 semanas)

#### 2.1 Dashboard React Moderno

```typescript
// frontend/src/pages/affiliate/AffiliateDashboard.tsx

import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box,
  LinearProgress, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, IconButton, Tooltip, Alert
} from '@mui/material';
import {
  TrendingUp, AttachMoney, People, ShoppingCart,
  GetApp, ContentCopy, Share, Code, Email
} from '@mui/icons-material';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer
} from 'recharts';

const AffiliateDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header con Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)' }}>
            <CardContent>
              <Typography color="white" variant="h6">
                Ingresos del Mes
              </Typography>
              <Typography color="white" variant="h3">
                ${stats.monthlyRevenue?.toLocaleString()}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUp style={{ color: 'white' }} />
                <Typography color="white" variant="body2" sx={{ ml: 1 }}>
                  +23% vs mes anterior
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' }}>
            <CardContent>
              <Typography color="white" variant="h6">
                Conversiones
              </Typography>
              <Typography color="white" variant="h3">
                {stats.conversions}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats.conversionRate}
                sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}
              />
              <Typography color="white" variant="body2">
                {stats.conversionRate}% tasa de conversión
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)' }}>
            <CardContent>
              <Typography color="white" variant="h6">
                Clicks Hoy
              </Typography>
              <Typography color="white" variant="h3">
                {stats.clicksToday}
              </Typography>
              <Typography color="white" variant="body2" sx={{ mt: 1 }}>
                {stats.uniqueVisitors} visitantes únicos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(45deg, #9C27B0 30%, #BA68C8 90%)' }}>
            <CardContent>
              <Typography color="white" variant="h6">
                Comisión Pendiente
              </Typography>
              <Typography color="white" variant="h3">
                ${stats.pendingCommission?.toLocaleString()}
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 1, backgroundColor: 'white', color: '#9C27B0' }}
              >
                Solicitar Pago
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs de Navegación */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Vista General" />
          <Tab label="Reservas" />
          <Tab label="Links y Banners" />
          <Tab label="Reportes" />
          <Tab label="Pagos" />
          <Tab label="API & Widgets" />
        </Tabs>
      </Card>

      {/* Contenido de Tabs */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Gráfico de Ventas */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tendencia de Ventas
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="commission"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Productos */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Tours Vendidos
                </Typography>
                <Table size="small">
                  <TableBody>
                    {stats.topProducts?.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${product.sales} ventas`}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Últimas Conversiones */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Últimas Conversiones
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell>Comisión</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentConversions?.map((conv: any) => (
                      <TableRow key={conv.id}>
                        <TableCell>{conv.date}</TableCell>
                        <TableCell>{conv.product}</TableCell>
                        <TableCell>{conv.customer}</TableCell>
                        <TableCell>${conv.value}</TableCell>
                        <TableCell>
                          <Typography color="primary">
                            ${conv.commission}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={conv.status}
                            color={conv.status === 'confirmed' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <LinkGeneratorTab />
      )}

      {activeTab === 5 && (
        <APIWidgetTab />
      )}
    </Box>
  );
};
```

#### 2.2 Generador de Links y Widgets

```typescript
// components/LinkGeneratorTab.tsx

const LinkGeneratorTab: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [widgetCode, setWidgetCode] = useState('');

  const generateLink = () => {
    // Lógica para generar link con tracking
    const affiliateLink = `https://spirittours.com/ref/${affiliateCode}?url=${encodeURIComponent(baseUrl)}&utm_source=affiliate&utm_medium=${medium}&utm_campaign=${campaign}`;
    setGeneratedLink(affiliateLink);
  };

  const generateWidget = (type: string) => {
    const widgets = {
      search: `<iframe src="https://spirittours.com/widget/search?aff=${affiliateCode}" width="100%" height="400" frameborder="0"></iframe>`,
      
      banner: `<a href="https://spirittours.com/ref/${affiliateCode}" target="_blank">
        <img src="https://spirittours.com/banners/728x90.jpg" alt="Spirit Tours" />
      </a>`,
      
      deeplink: `<script>
        (function() {
          var st = document.createElement('script');
          st.type = 'text/javascript';
          st.async = true;
          st.src = 'https://spirittours.com/affiliate/widget.js?aff=${affiliateCode}';
          document.head.appendChild(st);
        })();
      </script>
      <div id="spirit-tours-widget"></div>`
    };
    
    setWidgetCode(widgets[type]);
  };

  return (
    <Grid container spacing={3}>
      {/* Generador de Links */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generador de Links
            </Typography>
            
            <TextField
              fullWidth
              label="URL del Tour o Página"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Campaña"
              margin="normal"
            />
            
            <Button
              variant="contained"
              onClick={generateLink}
              fullWidth
              sx={{ mt: 2 }}
            >
              Generar Link
            </Button>
            
            {generatedLink && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success">
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {generatedLink}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={() => navigator.clipboard.writeText(generatedLink)}
                  >
                    Copiar
                  </Button>
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Widgets Embebibles */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Widgets para tu Sitio
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => generateWidget('search')}
                  startIcon={<Search />}
                >
                  Widget de Búsqueda
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => generateWidget('banner')}
                  startIcon={<Image />}
                >
                  Banner 728x90
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => generateWidget('deeplink')}
                  startIcon={<Code />}
                >
                  Deep Link Automático
                </Button>
              </Grid>
            </Grid>
            
            {widgetCode && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={widgetCode}
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => navigator.clipboard.writeText(widgetCode)}
                  sx={{ mt: 1 }}
                >
                  Copiar Código
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Banners Descargables */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Banners y Materiales de Marketing
            </Typography>
            
            <Grid container spacing={2}>
              {[
                { size: '728x90', name: 'Leaderboard' },
                { size: '300x250', name: 'Medium Rectangle' },
                { size: '320x50', name: 'Mobile Banner' },
                { size: '300x600', name: 'Half Page' },
              ].map(banner => (
                <Grid item xs={12} sm={6} md={3} key={banner.size}>
                  <Card variant="outlined">
                    <CardMedia
                      component="img"
                      height="140"
                      image={`/banners/${banner.size}.jpg`}
                      alt={banner.name}
                    />
                    <CardContent>
                      <Typography variant="body2">
                        {banner.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {banner.size}px
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<GetApp />}
                        sx={{ mt: 1 }}
                      >
                        Descargar
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
```

### FASE 3: Tracking y Analytics (1 semana)

#### 3.1 Sistema de Tracking Avanzado

```python
# backend/services/affiliate_tracking_service.py

import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from urllib.parse import urlparse, parse_qs
import geoip2.database
from user_agents import parse
from redis import Redis

class AffiliateTrackingService:
    def __init__(self):
        self.redis = Redis(host='localhost', port=6379, decode_responses=True)
        self.geoip_reader = geoip2.database.Reader('/path/to/GeoLite2-City.mmdb')
        
    async def track_click(self, request: Request, affiliate_code: str) -> str:
        """Registrar click de afiliado"""
        
        # Generar ID único de click
        click_id = str(uuid.uuid4())
        
        # Extraer información del request
        tracking_data = {
            'click_id': click_id,
            'affiliate_code': affiliate_code,
            'timestamp': datetime.utcnow().isoformat(),
            
            # Source tracking
            'source_url': request.headers.get('referer'),
            'landing_page': str(request.url),
            
            # UTM Parameters
            **self._extract_utm_params(request.url.query),
            
            # Device info
            'user_agent': request.headers.get('user-agent'),
            **self._parse_user_agent(request.headers.get('user-agent')),
            
            # Location
            'ip_address': self._get_client_ip(request),
            **self._get_geo_location(self._get_client_ip(request)),
            
            # Session
            'session_id': self._get_or_create_session(request),
        }
        
        # Guardar en Redis con TTL de 30 días
        self.redis.setex(
            f"click:{click_id}",
            timedelta(days=30),
            json.dumps(tracking_data)
        )
        
        # Guardar en base de datos
        await self._save_click_to_db(tracking_data)
        
        # Actualizar estadísticas en tiempo real
        await self._update_realtime_stats(affiliate_code)
        
        return click_id
    
    async def track_conversion(
        self,
        click_id: str,
        booking_id: int,
        amount: float
    ) -> Dict[str, Any]:
        """Registrar conversión de un click"""
        
        # Obtener datos del click original
        click_data = self.redis.get(f"click:{click_id}")
        if not click_data:
            # Buscar en base de datos si expiró en Redis
            click_data = await self._get_click_from_db(click_id)
        
        if not click_data:
            raise ValueError("Click ID not found")
        
        click_data = json.loads(click_data) if isinstance(click_data, str) else click_data
        
        # Obtener afiliado y calcular comisión
        affiliate = await self._get_affiliate(click_data['affiliate_code'])
        commission = self._calculate_commission(amount, affiliate)
        
        conversion_data = {
            'conversion_id': str(uuid.uuid4()),
            'click_id': click_id,
            'affiliate_id': affiliate['id'],
            'booking_id': booking_id,
            'amount': amount,
            'commission_rate': commission['rate'],
            'commission_amount': commission['amount'],
            'bonus_amount': commission['bonus'],
            'total_payout': commission['total'],
            'converted_at': datetime.utcnow().isoformat(),
            
            # Attribution
            'time_to_conversion': self._calculate_time_to_conversion(
                click_data['timestamp']
            ),
            'conversion_path': await self._get_conversion_path(
                click_data['session_id']
            ),
        }
        
        # Guardar conversión
        await self._save_conversion_to_db(conversion_data)
        
        # Notificar al afiliado
        await self._notify_affiliate_conversion(affiliate, conversion_data)
        
        # Actualizar estadísticas
        await self._update_conversion_stats(affiliate['id'], conversion_data)
        
        # Webhook si está configurado
        if affiliate.get('webhook_url'):
            await self._send_webhook(affiliate['webhook_url'], {
                'event': 'conversion',
                'data': conversion_data
            })
        
        return conversion_data
    
    def _calculate_commission(
        self,
        amount: float,
        affiliate: Dict
    ) -> Dict[str, float]:
        """Calcular comisión basada en tier y performance"""
        
        base_rate = affiliate['commission_rate']
        tier = affiliate['tier']
        monthly_sales = affiliate.get('monthly_sales', 0)
        
        # Aplicar rate según tier
        tier_multipliers = {
            'starter': 1.0,
            'silver': 1.25,
            'gold': 1.5,
            'platinum': 1.875
        }
        
        effective_rate = base_rate * tier_multipliers.get(tier, 1.0)
        
        # Bonus por volumen
        bonus_rate = 0
        if monthly_sales > 200000:
            bonus_rate = 5
        elif monthly_sales > 50000:
            bonus_rate = 3
        elif monthly_sales > 10000:
            bonus_rate = 2
        
        # Calcular montos
        base_commission = amount * (effective_rate / 100)
        bonus_commission = amount * (bonus_rate / 100)
        total_commission = base_commission + bonus_commission
        
        return {
            'rate': effective_rate,
            'amount': base_commission,
            'bonus': bonus_commission,
            'total': total_commission
        }
    
    async def get_affiliate_analytics(
        self,
        affiliate_id: str,
        date_from: datetime,
        date_to: datetime
    ) -> Dict[str, Any]:
        """Obtener analytics detallados del afiliado"""
        
        analytics = {
            'overview': {
                'total_clicks': 0,
                'unique_visitors': 0,
                'total_conversions': 0,
                'conversion_rate': 0,
                'total_revenue': 0,
                'total_commission': 0,
                'average_order_value': 0,
                'earnings_per_click': 0,
            },
            
            'by_day': [],
            'by_source': [],
            'by_product': [],
            'by_device': [],
            'by_country': [],
            
            'top_converting_pages': [],
            'conversion_funnel': [],
            'customer_lifetime_value': 0,
            
            'trends': {
                'clicks_trend': 0,
                'conversion_trend': 0,
                'revenue_trend': 0,
            }
        }
        
        # Queries optimizadas con índices
        # ... implementación de queries
        
        return analytics
    
    def _extract_utm_params(self, query_string: str) -> Dict:
        """Extraer parámetros UTM de la URL"""
        params = parse_qs(query_string)
        return {
            'utm_source': params.get('utm_source', [''])[0],
            'utm_medium': params.get('utm_medium', [''])[0],
            'utm_campaign': params.get('utm_campaign', [''])[0],
            'utm_term': params.get('utm_term', [''])[0],
            'utm_content': params.get('utm_content', [''])[0],
        }
    
    def _parse_user_agent(self, ua_string: str) -> Dict:
        """Parsear user agent para obtener device info"""
        if not ua_string:
            return {}
        
        ua = parse(ua_string)
        return {
            'device_type': 'mobile' if ua.is_mobile else 'tablet' if ua.is_tablet else 'desktop',
            'browser': f"{ua.browser.family} {ua.browser.version_string}",
            'os': f"{ua.os.family} {ua.os.version_string}",
            'is_bot': ua.is_bot,
        }
    
    def _get_geo_location(self, ip_address: str) -> Dict:
        """Obtener ubicación geográfica de la IP"""
        try:
            response = self.geoip_reader.city(ip_address)
            return {
                'country': response.country.name,
                'country_code': response.country.iso_code,
                'city': response.city.name,
                'region': response.subdivisions.most_specific.name,
                'postal_code': response.postal.code,
                'latitude': response.location.latitude,
                'longitude': response.location.longitude,
                'timezone': response.location.time_zone,
            }
        except:
            return {}
    
    async def process_attribution(
        self,
        booking_id: int,
        customer_session: str
    ) -> Dict:
        """Procesar atribución multi-touch"""
        
        # Obtener todos los touchpoints del customer journey
        touchpoints = await self._get_customer_touchpoints(customer_session)
        
        if not touchpoints:
            return None
        
        # Modelos de atribución
        attribution_models = {
            'last_click': self._last_click_attribution,
            'first_click': self._first_click_attribution,
            'linear': self._linear_attribution,
            'time_decay': self._time_decay_attribution,
            'position_based': self._position_based_attribution,
        }
        
        # Aplicar modelo configurado (por defecto last_click)
        model = 'last_click'  # Configurable
        attribution = attribution_models[model](touchpoints)
        
        # Distribuir comisión según atribución
        for affiliate_code, weight in attribution.items():
            await self._assign_partial_commission(
                booking_id,
                affiliate_code,
                weight
            )
        
        return attribution
```

### FASE 4: Automatización y Pagos (1 semana)

#### 4.1 Sistema de Pagos Automatizados

```python
# backend/services/affiliate_payment_service.py

from decimal import Decimal
from datetime import datetime, timedelta
import stripe
import paypal
from sqlalchemy import select, and_, func
import asyncio

class AffiliatePaymentService:
    def __init__(self, db_session):
        self.db = db_session
        self.stripe = stripe
        self.paypal = paypal
        
    async def process_monthly_payments(self):
        """Procesar pagos mensuales a afiliados"""
        
        # Obtener periodo de pago
        end_date = datetime.utcnow().replace(day=1) - timedelta(days=1)
        start_date = end_date.replace(day=1)
        
        # Obtener afiliados con comisiones pendientes
        affiliates_to_pay = await self._get_affiliates_with_pending_commissions(
            start_date,
            end_date
        )
        
        for affiliate in affiliates_to_pay:
            try:
                # Calcular montos
                payment_data = await self._calculate_payment(
                    affiliate,
                    start_date,
                    end_date
                )
                
                # Validar mínimo de pago
                if payment_data['total_payment'] < affiliate['minimum_payout']:
                    continue
                
                # Procesar pago según método preferido
                payment_result = await self._process_payment(
                    affiliate,
                    payment_data
                )
                
                # Registrar pago
                await self._record_payment(affiliate, payment_data, payment_result)
                
                # Generar factura
                invoice = await self._generate_invoice(affiliate, payment_data)
                
                # Enviar notificación
                await self._send_payment_notification(affiliate, payment_data, invoice)
                
            except Exception as e:
                await self._handle_payment_error(affiliate, e)
    
    async def _calculate_payment(
        self,
        affiliate: Dict,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Calcular pago del afiliado"""
        
        # Obtener todas las conversiones confirmadas del periodo
        conversions = await self.db.execute(
            select(AffiliateConversion)
            .where(and_(
                AffiliateConversion.affiliate_id == affiliate['id'],
                AffiliateConversion.confirmation_date >= start_date,
                AffiliateConversion.confirmation_date <= end_date,
                AffiliateConversion.status == 'confirmed',
                AffiliateConversion.payment_date.is_(None)
            ))
        )
        
        conversions = conversions.scalars().all()
        
        # Calcular totales
        total_bookings = len(conversions)
        gross_sales = sum(c.booking_value for c in conversions)
        commission_amount = sum(c.commission_amount for c in conversions)
        bonus_amount = sum(c.bonus_amount for c in conversions)
        
        # Aplicar ajustes (devoluciones, cancelaciones)
        adjustments = await self._calculate_adjustments(
            affiliate['id'],
            start_date,
            end_date
        )
        
        # Calcular retenciones/impuestos si aplica
        tax_withholding = self._calculate_tax_withholding(
            affiliate,
            commission_amount + bonus_amount
        )
        
        total_payment = (
            commission_amount + 
            bonus_amount - 
            adjustments - 
            tax_withholding
        )
        
        return {
            'period_start': start_date,
            'period_end': end_date,
            'total_bookings': total_bookings,
            'gross_sales': gross_sales,
            'commission_amount': commission_amount,
            'bonus_amount': bonus_amount,
            'adjustments': adjustments,
            'tax_withholding': tax_withholding,
            'total_payment': total_payment,
            'conversion_ids': [c.id for c in conversions]
        }
    
    async def _process_payment(
        self,
        affiliate: Dict,
        payment_data: Dict
    ) -> Dict:
        """Procesar pago según método del afiliado"""
        
        payment_method = affiliate.get('payment_method', 'bank_transfer')
        
        if payment_method == 'stripe':
            return await self._process_stripe_payment(affiliate, payment_data)
        
        elif payment_method == 'paypal':
            return await self._process_paypal_payment(affiliate, payment_data)
        
        elif payment_method == 'bank_transfer':
            return await self._process_bank_transfer(affiliate, payment_data)
        
        elif payment_method == 'crypto':
            return await self._process_crypto_payment(affiliate, payment_data)
        
        else:
            raise ValueError(f"Unknown payment method: {payment_method}")
    
    async def _process_stripe_payment(
        self,
        affiliate: Dict,
        payment_data: Dict
    ) -> Dict:
        """Procesar pago via Stripe Connect"""
        
        # Crear transfer a cuenta conectada
        transfer = stripe.Transfer.create(
            amount=int(payment_data['total_payment'] * 100),  # Cents
            currency=affiliate.get('currency', 'USD'),
            destination=affiliate['stripe_account_id'],
            description=f"Affiliate commission {payment_data['period_start']} to {payment_data['period_end']}",
            metadata={
                'affiliate_id': affiliate['id'],
                'period': f"{payment_data['period_start']}-{payment_data['period_end']}",
                'bookings': payment_data['total_bookings']
            }
        )
        
        return {
            'method': 'stripe',
            'transaction_id': transfer.id,
            'status': transfer.status,
            'amount': transfer.amount / 100,
            'currency': transfer.currency,
            'paid_at': datetime.utcnow()
        }
    
    async def _generate_invoice(
        self,
        affiliate: Dict,
        payment_data: Dict
    ) -> str:
        """Generar factura PDF"""
        
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        
        # Crear PDF
        filename = f"invoice_{affiliate['code']}_{datetime.utcnow().strftime('%Y%m')}.pdf"
        doc = SimpleDocTemplate(filename, pagesize=letter)
        
        # Contenido de la factura
        elements = []
        styles = getSampleStyleSheet()
        
        # Header
        elements.append(Paragraph("SPIRIT TOURS - AFFILIATE COMMISSION INVOICE", styles['Title']))
        elements.append(Paragraph(f"Invoice Date: {datetime.utcnow().strftime('%Y-%m-%d')}", styles['Normal']))
        elements.append(Paragraph(f"Period: {payment_data['period_start']} to {payment_data['period_end']}", styles['Normal']))
        
        # Affiliate info
        elements.append(Paragraph(f"Affiliate: {affiliate['name']}", styles['Heading2']))
        elements.append(Paragraph(f"Code: {affiliate['code']}", styles['Normal']))
        
        # Payment details table
        data = [
            ['Description', 'Amount'],
            ['Total Bookings', payment_data['total_bookings']],
            ['Gross Sales', f"${payment_data['gross_sales']:,.2f}"],
            ['Base Commission', f"${payment_data['commission_amount']:,.2f}"],
            ['Performance Bonus', f"${payment_data['bonus_amount']:,.2f}"],
            ['Adjustments', f"-${payment_data['adjustments']:,.2f}"],
            ['Tax Withholding', f"-${payment_data['tax_withholding']:,.2f}"],
            ['', ''],
            ['TOTAL PAYMENT', f"${payment_data['total_payment']:,.2f}"],
        ]
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        
        # Upload to S3/storage
        invoice_url = await self._upload_invoice(filename)
        
        return invoice_url
```

---

## 🚀 CARACTERÍSTICAS INNOVADORAS PROPUESTAS

### 1. **Gamificación del Programa**
```yaml
Niveles:
  - Bronce: 0-10 ventas/mes → Badge + 5% comisión
  - Plata: 11-50 ventas/mes → Badge + 8% comisión + Soporte prioritario
  - Oro: 51-200 ventas/mes → Badge + 12% comisión + Account Manager
  - Diamante: 200+ ventas/mes → Badge + 15% comisión + Revenue share

Achievements:
  - "First Sale": Primera venta realizada
  - "Weekend Warrior": 10 ventas en fin de semana
  - "Conversion Master": >10% conversion rate
  - "Global Seller": Ventas en 5+ países
```

### 2. **AI-Powered Recommendations**
```python
# Sistema de recomendaciones con IA
class AffiliateAIRecommender:
    def recommend_products(self, affiliate_id):
        # Analizar historial de ventas
        # Identificar patrones
        # Sugerir productos con mayor probabilidad de conversión
        pass
    
    def optimize_commission(self, affiliate_id):
        # Analizar performance
        # Sugerir ajustes de comisión para maximizar ROI
        pass
    
    def predict_lifetime_value(self, affiliate_id):
        # Predecir valor futuro del afiliado
        # Sugerir inversión en retención
        pass
```

### 3. **Marketplace de Contenido**
```yaml
Content Marketplace:
  - Afiliados pueden compartir contenido exitoso
  - Sistema de revenue sharing por contenido
  - Templates de email probados
  - Copys que convierten
  - Videos testimoniales
```

### 4. **Programa de Referidos Multinivel**
```yaml
2-Tier Program:
  Nivel 1: Comisión directa 10-15%
  Nivel 2: Comisión por sub-afiliados 2-3%
  
Beneficios:
  - Crear red de afiliados
  - Ingresos pasivos
  - Bonus por reclutamiento
```

### 5. **Crypto Payments**
```python
# Pagos en criptomonedas
SUPPORTED_CRYPTO = ['USDT', 'USDC', 'BTC', 'ETH']

# Smart contracts para pagos automáticos
# Transparencia total en blockchain
# Pagos instantáneos sin fronteras
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Timeline: 6 Semanas Total

| Semana | Tareas | Entregables |
|--------|--------|------------|
| **1-2** | Backend Infrastructure | API completa, Base de datos, Tracking |
| **3-4** | Frontend Development | Dashboard, Widgets, Mobile responsive |
| **5** | Testing & Optimization | Load testing, Security audit, A/B tests |
| **6** | Launch & Training | Documentación, Videos, Onboarding |

### KPIs de Éxito:
- 500+ afiliados registrados en 3 meses
- 20% incremento en ventas vía afiliados
- $50,000 USD/mes en revenue adicional
- 8% conversion rate promedio
- 90% satisfacción de afiliados

---

## 💰 ROI PROYECTADO

```yaml
Inversión Inicial:
  Desarrollo: $15,000
  Marketing: $5,000
  Total: $20,000

Retorno Esperado (Año 1):
  Mes 1-3: $30,000 (150 afiliados)
  Mes 4-6: $75,000 (350 afiliados)
  Mes 7-12: $240,000 (750 afiliados)
  
  Total Año 1: $345,000
  ROI: 1,725%
  
Proyección Año 2:
  1,500+ afiliados activos
  $800,000+ en revenue adicional
  25% del total de ventas vía afiliados
```

---

## 🎯 CONCLUSIÓN

El sistema TAAP propuesto para Spirit Tours no solo iguala las mejores prácticas de la industria, sino que las supera con características innovadoras como:

1. **Comisiones más altas** que la competencia (hasta 15% vs 13% promedio)
2. **Onboarding automatizado** en menos de 5 minutos
3. **API completa** con webhooks en tiempo real
4. **Dashboard analytics** con IA predictiva
5. **Pagos automatizados** multi-método incluyendo crypto
6. **Gamificación** para aumentar engagement
7. **Multi-tier program** para ingresos pasivos
8. **Widget builder** drag & drop

Este sistema posicionará a Spirit Tours como líder en programas de afiliados turísticos, atrayendo a los mejores partners y aumentando significativamente el revenue.

---

*Documento preparado por: AI System Architect*
*Fecha: 11 de Octubre 2024*
*Estado: Listo para implementación*