# FEATURE #16: SISTEMA DE GESTIÓN DE REDES SOCIALES CON IA - COMPLETO

**Fecha**: 2025-10-03  
**Versión**: 1.0  
**Líneas**: ~3,500 líneas

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Guía Paso a Paso: Obtener API Keys](#2-guía-paso-a-paso-obtener-api-keys)
3. [Componentes Frontend Completos](#3-componentes-frontend-completos)
4. [Servicios Backend Adicionales](#4-servicios-backend-adicionales)
5. [Background Jobs y Automatización](#5-background-jobs-y-automatización)
6. [Estrategia de Contenido con IA](#6-estrategia-de-contenido-con-ia)
7. [Análisis de Sentimientos y NLP](#7-análisis-de-sentimientos-y-nlp)
8. [Métricas y KPIs](#8-métricas-y-kpis)
9. [Mejores Prácticas](#9-mejores-prácticas)
10. [Casos de Uso Específicos](#10-casos-de-uso-específicos)

---

## 1. RESUMEN EJECUTIVO

### 1.1 ¿Qué incluye este sistema?

✅ **Gestión Centralizada**: Un solo panel para gestionar 6 redes sociales  
✅ **100% Gratuito**: Usa APIs nativas, sin pagar mensualidades a terceros  
✅ **IA Integrada**: Generación automática de contenido con GPT-4/Claude  
✅ **Respuestas Automáticas**: IA responde comentarios y mensajes  
✅ **Análisis de Sentimientos**: Detecta opiniones positivas/negativas  
✅ **Publicación Programada**: Schedule posts con el mejor timing  
✅ **Analytics Avanzados**: Dashboard con métricas en tiempo real  
✅ **Seguridad Total**: Credenciales encriptadas con Fernet  

### 1.2 Plataformas Soportadas

| Plataforma | API Gratuita | Rate Limits | Capacidades |
|-----------|--------------|-------------|-------------|
| **Facebook** | ✅ Sí | 200 calls/hour | Posts, comentarios, mensajes, insights |
| **Instagram** | ✅ Sí | 200 calls/hour | Posts, stories, comentarios, insights |
| **Twitter/X** | ⚠️ Limitado | 1,500 tweets/mes (Free) | Tweets, replies, menciones |
| **LinkedIn** | ✅ Sí | 100 calls/day | Posts, comentarios, shares |
| **TikTok** | ✅ Sí | 100 videos/day | Videos, comentarios, analytics |
| **YouTube** | ✅ Sí | 10,000 units/day | Videos, comentarios, playlists |

### 1.3 Ventajas vs Plataformas de Pago

| Feature | Hootsuite ($99/mes) | Buffer ($15/mes) | **Spirit Tours IA** |
|---------|---------------------|------------------|---------------------|
| Múltiples plataformas | ✅ | ✅ | ✅ **GRATIS** |
| IA para contenido | ❌ | ❌ | ✅ **GPT-4** |
| Respuestas automáticas | ❌ | ❌ | ✅ **Con IA** |
| Análisis de sentimientos | ❌ | ❌ | ✅ **Incluido** |
| **Costo mensual** | **$99** | **$15** | **$0** |

---

## 2. GUÍA PASO A PASO: OBTENER API KEYS

### 2.1 Facebook / Meta Developer

#### Paso 1: Crear App de Facebook

1. **Ve a**: https://developers.facebook.com/
2. **Click**: "My Apps" → "Create App"
3. **Selecciona**: "Business" como tipo de app
4. **Completa**:
   - App Display Name: "Spirit Tours Social Manager"
   - App Contact Email: tu_email@spirittours.com
   - Business Account: (selecciona o crea uno)

#### Paso 2: Configurar Facebook Login

1. En tu app, **añade el producto**: "Facebook Login"
2. **Settings** → **Basic**:
   - Copia el **App ID** (lo necesitarás)
   - Copia el **App Secret** (haz click en "Show")
   - App Domains: `spirittours.com`
   - Privacy Policy URL: `https://spirittours.com/privacy`

#### Paso 3: Obtener Access Token

**Opción A: Token de Prueba (corta duración)**
```
1. Ve a: https://developers.facebook.com/tools/explorer/
2. Selecciona tu app
3. Click "Generate Access Token"
4. Selecciona permisos:
   - pages_show_list
   - pages_read_engagement
   - pages_manage_posts
   - pages_manage_engagement
   - pages_read_user_content
5. Click "Generate Access Token"
6. ¡Copia el token! (válido por 1-2 horas)
```

**Opción B: Token de Larga Duración (60 días)**
```bash
# Intercambia el token corto por uno largo
curl -G "https://graph.facebook.com/v19.0/oauth/access_token" \
  -d "grant_type=fb_exchange_token" \
  -d "client_id={app-id}" \
  -d "client_secret={app-secret}" \
  -d "fb_exchange_token={short-lived-token}"
```

**Opción C: Token Permanente (nunca expira)**
```
1. Con el token de larga duración, obtén tus páginas:
   GET https://graph.facebook.com/v19.0/me/accounts?access_token={long-lived-token}
   
2. Usa el access_token de la página que quieras
   (este token NO expira mientras la página exista)
```

#### Paso 4: Obtener Page ID

```bash
# Lista tus páginas
curl "https://graph.facebook.com/v19.0/me/accounts?access_token={tu-token}"

# Respuesta:
{
  "data": [
    {
      "access_token": "EAAxxxxx...",  # ← Token de la página (usa este)
      "category": "Travel Company",
      "name": "Spirit Tours",
      "id": "123456789012345",  # ← Page ID
      "tasks": ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT"]
    }
  ]
}
```

#### Credenciales Finales para Facebook:
```json
{
  "platform": "facebook",
  "app_id": "123456789012345",
  "app_secret": "abc123def456...",
  "access_token": "EAAxxxxx...permanente",
  "page_id": "987654321098765"
}
```

---

### 2.2 Instagram Business

Instagram usa la misma infraestructura de Facebook.

#### Requisitos Previos:
1. ✅ Cuenta de Instagram convertida a **Business Account**
2. ✅ Vinculada a una **Facebook Page**
3. ✅ Facebook App creada (del paso anterior)

#### Paso 1: Convertir a Business Account

1. En Instagram móvil: Settings → Account → Switch to Professional Account
2. Elige "Business"
3. Completa tu perfil de negocio

#### Paso 2: Vincular con Facebook Page

1. Settings → Account → Linked Accounts
2. Conecta con tu Facebook Page

#### Paso 3: Obtener Instagram Business Account ID

```bash
# Usando el Page ID de Facebook y el access token
curl "https://graph.facebook.com/v19.0/{page-id}?fields=instagram_business_account&access_token={page-access-token}"

# Respuesta:
{
  "instagram_business_account": {
    "id": "17841400001234567"  # ← Instagram Business Account ID
  },
  "id": "987654321098765"
}
```

#### Credenciales Finales para Instagram:
```json
{
  "platform": "instagram",
  "facebook_app_id": "123456789012345",
  "facebook_app_secret": "abc123def456...",
  "access_token": "EAAxxxxx...permanente",
  "facebook_page_id": "987654321098765",
  "instagram_business_account_id": "17841400001234567"
}
```

---

### 2.3 Twitter / X API

#### Paso 1: Crear Developer Account

1. **Ve a**: https://developer.twitter.com/
2. **Apply for a Developer Account**
3. **Responde el cuestionario**:
   - Use case: "Building social media management for travel agency"
   - Will you make Twitter content available: "No"
   - Will you analyze Twitter data: "Yes, sentiment analysis"
   - App name: "Spirit Tours Social Manager"

#### Paso 2: Crear App

1. En Developer Portal → Projects & Apps
2. Create New App
3. Completa:
   - App name: "Spirit Tours Social Manager"
   - Description: "Social media management with AI"
   - Website: "https://spirittours.com"

#### Paso 3: Obtener Credenciales

1. En tu app → "Keys and tokens":
   - **API Key** (Consumer Key)
   - **API Secret Key** (Consumer Secret)
   - **Bearer Token** (para autenticación de app)
   - **Access Token** (click "Generate" bajo User authentication tokens)
   - **Access Token Secret**

#### Opciones de Plan:

**FREE Plan** (Limitado):
- ✅ 1,500 tweets/mes
- ✅ 10,000 lecturas/mes
- ❌ No rate limits altos

**BASIC Plan** ($100/mes):
- ✅ 10,000 tweets/mes
- ✅ 1,000,000 lecturas/mes
- ✅ Rate limits más altos

**Recomendación**: Empieza con FREE, upgrade si necesario.

#### Credenciales Finales para Twitter:
```json
{
  "platform": "twitter_x",
  "api_key": "abc123xyz...",
  "api_secret": "def456uvw...",
  "bearer_token": "AAAAAAAAAA...",
  "access_token": "123456789-abc...",
  "access_token_secret": "xyz987fed..."
}
```

---

### 2.4 LinkedIn API

#### Paso 1: Crear LinkedIn App

1. **Ve a**: https://www.linkedin.com/developers/
2. **Create app**
3. **Completa**:
   - App name: "Spirit Tours Social Manager"
   - LinkedIn Page: (selecciona tu company page)
   - App logo: (logo de Spirit Tours)
   - Legal agreement: Accept

#### Paso 2: Solicitar Permisos

1. En tu app → "Products" tab
2. Request access to:
   - **Share on LinkedIn** (para publicar)
   - **Sign In with LinkedIn** (para autenticación)
   - **Community Management API** (para comentarios)

Nota: Puede tomar 1-3 días para aprobación.

#### Paso 3: Configurar OAuth

1. En "Auth" tab:
   - Redirect URLs: `https://spirittours.com/auth/linkedin/callback`
   - Copia **Client ID**
   - Copia **Client Secret**

#### Paso 4: Obtener Access Token

```bash
# 1. Redirige al usuario a esta URL:
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={client-id}&redirect_uri={redirect-uri}&scope=w_member_social%20r_liteprofile

# 2. LinkedIn redirige de vuelta con un código
# 3. Intercambia el código por un access token:
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code={authorization-code}" \
  -d "client_id={client-id}" \
  -d "client_secret={client-secret}" \
  -d "redirect_uri={redirect-uri}"
```

#### Credenciales Finales para LinkedIn:
```json
{
  "platform": "linkedin",
  "client_id": "abc123xyz",
  "client_secret": "def456uvw",
  "access_token": "AQX...",
  "organization_id": "123456789"
}
```

---

### 2.5 TikTok for Business

#### Paso 1: Registrarse en TikTok for Business

1. **Ve a**: https://business-api.tiktok.com/
2. **Apply for access**
3. **Complete application**:
   - Business type: "Agency"
   - Use case: "Social media management"
   - Espera aprobación (1-2 semanas)

#### Paso 2: Crear App

1. En Developer Portal
2. Create New App
3. App info:
   - App name: "Spirit Tours Social Manager"
   - Description: "Social media management with AI"

#### Paso 3: Obtener Credenciales

1. En App Settings:
   - **App ID**
   - **App Secret**
2. Setup OAuth:
   - Redirect URL: `https://spirittours.com/auth/tiktok/callback`

#### Paso 4: Autenticación

```bash
# 1. Redirect user to authorize:
https://www.tiktok.com/auth/authorize/?client_key={app-id}&redirect_uri={redirect-uri}&response_type=code&scope=user.info.basic,video.list,video.upload

# 2. Exchange code for access token:
curl -X POST "https://open-api.tiktok.com/oauth/access_token/" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_key={app-id}" \
  -d "client_secret={app-secret}" \
  -d "code={authorization-code}" \
  -d "grant_type=authorization_code"
```

#### Credenciales Finales para TikTok:
```json
{
  "platform": "tiktok",
  "app_id": "123456",
  "app_secret": "abc123xyz...",
  "access_token": "act.xxx...",
  "open_id": "user_open_id_123"
}
```

---

### 2.6 YouTube Data API

#### Paso 1: Crear Proyecto en Google Cloud

1. **Ve a**: https://console.cloud.google.com/
2. **Create New Project**
3. **Nombre**: "Spirit Tours Social Manager"

#### Paso 2: Habilitar YouTube Data API

1. En tu proyecto → APIs & Services → Library
2. Busca "YouTube Data API v3"
3. Click "Enable"

#### Paso 3: Crear Credenciales

**Opción A: API Key (solo lectura)**
```
1. APIs & Services → Credentials
2. Create Credentials → API Key
3. Copia la API Key
4. (Opcional) Restrict API key → YouTube Data API v3
```

**Opción B: OAuth 2.0 (para subir videos)**
```
1. Create Credentials → OAuth client ID
2. Application type: Web application
3. Authorized redirect URIs:
   https://spirittours.com/auth/youtube/callback
4. Copia Client ID y Client Secret
```

#### Paso 4: Obtener Access Token (OAuth)

```bash
# 1. Redirect user to:
https://accounts.google.com/o/oauth2/v2/auth?client_id={client-id}&redirect_uri={redirect-uri}&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly

# 2. Exchange code for token:
curl -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code={authorization-code}" \
  -d "client_id={client-id}" \
  -d "client_secret={client-secret}" \
  -d "redirect_uri={redirect-uri}" \
  -d "grant_type=authorization_code"
```

#### Credenciales Finales para YouTube:
```json
{
  "platform": "youtube",
  "api_key": "AIzaSy...",
  "client_id": "123456789.apps.googleusercontent.com",
  "client_secret": "GOCSPX-abc123...",
  "access_token": "ya29.a0...",
  "refresh_token": "1//0abc...",
  "channel_id": "UCxxxxxxxxxxxxx"
}
```

---

## 3. COMPONENTES FRONTEND COMPLETOS

### 3.1 Panel de Publicaciones con IA

```typescript
// frontend/src/components/admin/social/PublicationsPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add,
  AutoAwesome,
  Schedule,
  Send,
  Edit,
  Delete,
  Image as ImageIcon,
  VideoLibrary,
  CalendarToday
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import ReactMarkdown from 'react-markdown';

interface Post {
  id: number;
  platform: string;
  content_text: string;
  hashtags: string[];
  media_type?: string;
  status: string;
  scheduled_at?: string;
  published_at?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  generated_by_ai: boolean;
}

const PublicationsPanel: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [createDialog, setCreateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('facebook');
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const response = await fetch('/api/admin/social-media/posts');
    const data = await response.json();
    setPosts(data);
  };

  const handleGenerateContent = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/social-media/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          platform: selectedPlatform
        })
      });
      const content = await response.json();
      setGeneratedContent(content);
    } catch (error) {
      alert('Error al generar contenido: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedulePost = async () => {
    try {
      await fetch('/api/admin/social-media/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: 1, // Obtener del selector de cuenta
          prompt: aiPrompt,
          scheduled_at: scheduledTime?.toISOString(),
          auto_publish: true
        })
      });
      alert('✅ Post programado exitosamente!');
      setCreateDialog(false);
      loadPosts();
    } catch (error) {
      alert('Error al programar post: ' + error.message);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">📢 Publicaciones</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialog(true)}
        >
          Nueva Publicación con IA
        </Button>
      </Box>

      {/* Tabs de filtro */}
      <Box sx={{ mb: 3 }}>
        <Chip label="Todas" sx={{ mr: 1 }} />
        <Chip label="Programadas" sx={{ mr: 1 }} />
        <Chip label="Publicadas" sx={{ mr: 1 }} />
        <Chip label="Borradores" />
      </Box>

      {/* Lista de posts */}
      <Grid container spacing={2}>
        {posts.map((post) => (
          <Grid item xs={12} md={6} lg={4} key={post.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: getPlatformColor(post.platform), mr: 1 }}>
                    {getPlatformIcon(post.platform)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">
                      {post.platform.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {post.status === 'scheduled' ? `📅 ${post.scheduled_at}` : '✅ Publicado'}
                    </Typography>
                  </Box>
                  {post.generated_by_ai && (
                    <Chip
                      label="IA"
                      size="small"
                      icon={<AutoAwesome />}
                      sx={{ ml: 'auto' }}
                    />
                  )}
                </Box>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  {post.content_text.substring(0, 150)}...
                </Typography>

                <Box sx={{ mb: 1 }}>
                  {post.hashtags?.map((tag, i) => (
                    <Chip key={i} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>

                {post.status === 'published' && (
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Typography variant="caption">
                      ❤️ {post.likes_count}
                    </Typography>
                    <Typography variant="caption">
                      💬 {post.comments_count}
                    </Typography>
                    <Typography variant="caption">
                      🔄 {post.shares_count}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <IconButton size="small">
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small">
                    <Delete fontSize="small" />
                  </IconButton>
                  {post.status === 'scheduled' && (
                    <Button size="small" startIcon={<Send />}>
                      Publicar Ahora
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog de creación con IA */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            🤖 Crear Publicación con IA
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Describe qué quieres publicar y la IA generará el contenido perfecto
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Plataforma</InputLabel>
            <Select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
            >
              <MenuItem value="facebook">Facebook</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="twitter_x">Twitter / X</MenuItem>
              <MenuItem value="linkedin">LinkedIn</MenuItem>
              <MenuItem value="tiktok">TikTok</MenuItem>
              <MenuItem value="youtube">YouTube</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Describe tu publicación"
            placeholder="Ej: Promociona nuestro nuevo tour a Machu Picchu con 20% de descuento. Incluye datos del tour, fechas disponibles y call-to-action."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth
            variant="contained"
            startIcon={generating ? <CircularProgress size={20} /> : <AutoAwesome />}
            onClick={handleGenerateContent}
            disabled={generating || !aiPrompt}
            sx={{ mb: 2 }}
          >
            {generating ? 'Generando con IA...' : 'Generar Contenido con IA'}
          </Button>

          {generatedContent && (
            <Card sx={{ mb: 2, bgcolor: 'grey.50' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  ✨ Contenido Generado:
                </Typography>
                <Typography variant="body2" paragraph>
                  {generatedContent.content_text}
                </Typography>
                <Box>
                  {generatedContent.hashtags?.map((tag: string, i: number) => (
                    <Chip key={i} label={tag} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  💡 Sugerencia: {generatedContent.suggested_media === 'image' ? 'Imagen' : 'Video'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ⏰ Mejor hora: {generatedContent.best_time_to_post || '10:00 AM'}
                </Typography>
              </CardContent>
            </Card>
          )}

          <DateTimePicker
            label="Programar para"
            value={scheduledTime}
            onChange={(newValue) => setScheduledTime(newValue)}
            sx={{ width: '100%', mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<Schedule />}
              onClick={handleSchedulePost}
              disabled={!generatedContent}
            >
              Programar Publicación
            </Button>
            <Button
              variant="contained"
              startIcon={<Send />}
              disabled={!generatedContent}
            >
              Publicar Ahora
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

const getPlatformColor = (platform: string) => {
  const colors: Record<string, string> = {
    facebook: '#1877f2',
    instagram: '#e4405f',
    twitter_x: '#1da1f2',
    linkedin: '#0077b5',
    tiktok: '#000000',
    youtube: '#ff0000'
  };
  return colors[platform] || '#666666';
};

const getPlatformIcon = (platform: string) => {
  // Retorna el icono apropiado según la plataforma
  return platform.charAt(0).toUpperCase();
};

export default PublicationsPanel;
```

### 3.2 Panel de Interacciones y Respuestas Automáticas

```typescript
// frontend/src/components/admin/social/InteractionsPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  TextField,
  IconButton,
  Badge,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Reply,
  Done,
  Archive,
  Flag,
  ThumbUp,
  ThumbDown,
  AutoAwesome,
  Send
} from '@mui/icons-material';

interface Interaction {
  id: number;
  platform: string;
  interaction_type: string;
  author_username: string;
  author_display_name: string;
  content_text: string;
  sentiment: string;
  sentiment_score: number;
  priority: string;
  needs_response: boolean;
  auto_reply_sent: boolean;
  interaction_date: string;
}

const InteractionsPanel: React.FC = () => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [replyText, setReplyText] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [aiSuggestedReply, setAiSuggestedReply] = useState('');

  useEffect(() => {
    loadInteractions();
  }, []);

  const loadInteractions = async () => {
    const response = await fetch('/api/admin/social-media/interactions/pending');
    const data = await response.json();
    setInteractions(data);
  };

  const handleGenerateAIReply = async (interaction: Interaction) => {
    setGeneratingReply(true);
    try {
      const response = await fetch('/api/admin/social-media/interactions/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: interaction.id,
          context: interaction.content_text
        })
      });
      const data = await response.json();
      setAiSuggestedReply(data.reply_text);
      setReplyText(data.reply_text);
    } catch (error) {
      alert('Error al generar respuesta: ' + error.message);
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleSendReply = async (interactionId: number) => {
    try {
      await fetch(`/api/admin/social-media/interactions/${interactionId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_text: replyText
        })
      });
      alert('✅ Respuesta enviada!');
      setReplyText('');
      setSelectedInteraction(null);
      loadInteractions();
    } catch (error) {
      alert('Error al enviar respuesta: ' + error.message);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      case 'neutral': return 'default';
      default: return 'default';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      case 'neutral': return '😐';
      default: return '❓';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'default';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">💬 Interacciones y Comentarios</Typography>
        <Button variant="outlined" startIcon={<Done />}>
          Marcar Todas como Leídas
        </Button>
      </Box>

      <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 3 }}>
        <Tab
          label={
            <Badge badgeContent={interactions.filter(i => i.needs_response).length} color="error">
              Pendientes
            </Badge>
          }
        />
        <Tab label="Positivos" />
        <Tab label="Negativos" />
        <Tab label="Todas" />
      </Tabs>

      <Grid container spacing={3}>
        {/* Lista de interacciones */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <List>
                {interactions
                  .filter(i => {
                    if (selectedTab === 0) return i.needs_response;
                    if (selectedTab === 1) return i.sentiment === 'positive';
                    if (selectedTab === 2) return i.sentiment === 'negative';
                    return true;
                  })
                  .map((interaction) => (
                    <React.Fragment key={interaction.id}>
                      <ListItem
                        button
                        selected={selectedInteraction?.id === interaction.id}
                        onClick={() => setSelectedInteraction(interaction)}
                      >
                        <ListItemAvatar>
                          <Avatar>
                            {interaction.author_display_name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">
                                {interaction.author_display_name}
                              </Typography>
                              <Chip
                                label={interaction.platform}
                                size="small"
                                sx={{ bgcolor: getPlatformColor(interaction.platform) }}
                              />
                              <Typography variant="caption">
                                {getSentimentIcon(interaction.sentiment)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" noWrap>
                                {interaction.content_text}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                <Chip
                                  label={interaction.priority}
                                  size="small"
                                  color={getPriorityColor(interaction.priority)}
                                />
                                {interaction.auto_reply_sent && (
                                  <Chip
                                    label="Auto-respondido"
                                    size="small"
                                    icon={<AutoAwesome />}
                                  />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Panel de respuesta */}
        <Grid item xs={12} md={6}>
          {selectedInteraction ? (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2 }}>
                    {selectedInteraction.author_display_name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                      {selectedInteraction.author_display_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      @{selectedInteraction.author_username} · {selectedInteraction.platform}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${selectedInteraction.sentiment} (${selectedInteraction.sentiment_score.toFixed(2)})`}
                    color={getSentimentColor(selectedInteraction.sentiment)}
                  />
                </Box>

                <Alert
                  severity={selectedInteraction.sentiment === 'negative' ? 'warning' : 'info'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2">
                    {selectedInteraction.content_text}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {new Date(selectedInteraction.interaction_date).toLocaleString()}
                  </Typography>
                </Alert>

                {aiSuggestedReply && (
                  <Alert icon={<AutoAwesome />} severity="success" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      💡 Respuesta Sugerida por IA:
                    </Typography>
                    <Typography variant="body2">
                      {aiSuggestedReply}
                    </Typography>
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={generatingReply ? <CircularProgress size={20} /> : <AutoAwesome />}
                  onClick={() => handleGenerateAIReply(selectedInteraction)}
                  disabled={generatingReply}
                  sx={{ mb: 2 }}
                >
                  {generatingReply ? 'Generando respuesta con IA...' : 'Generar Respuesta con IA'}
                </Button>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Tu respuesta"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={() => handleSendReply(selectedInteraction.id)}
                    disabled={!replyText}
                  >
                    Enviar Respuesta
                  </Button>
                  <IconButton>
                    <Archive />
                  </IconButton>
                  <IconButton>
                    <Flag />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  Selecciona una interacción para responder
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default InteractionsPanel;
```

Continuaré con las secciones 4-10 en el siguiente mensaje para completar el documento...

---

**✅ AVANCE ACTUAL:**
- ✅ Guía completa para obtener API Keys de las 6 plataformas
- ✅ Componente de publicaciones con IA
- ✅ Componente de interacciones y respuestas automáticas
- ⏳ Pending: Analytics panel, servicios backend adicionales, background jobs

**Líneas actuales**: ~1,200 líneas del Feature #16
