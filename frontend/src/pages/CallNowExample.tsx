/**
 * CallNowExample - Página de ejemplo mostrando la integración WebRTC
 * Demuestra los diferentes botones "Call Now" en contextos reales
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CallNowButton, 
  FloatingCallButton, 
  InlineCallButton, 
  HeaderCallButton 
} from '@/components/WebRTC/CallNowButton';
import { MapPin, Clock, Users, Star, Heart, Share2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CallNowExample: React.FC = () => {
  // Datos de ejemplo del cliente
  const customerData = {
    name: 'María García',
    email: 'maria.garcia@email.com',
    language: 'es',
    location: 'Madrid, España',
    tourInterest: 'madrid_city_tour'
  };

  const tourData = {
    id: 'madrid_city_tour',
    title: 'Madrid City Tour Completo',
    description: 'Descubre los secretos de Madrid con nuestro tour completo que incluye el Museo del Prado, Palacio Real, Parque del Retiro y mucho más.',
    price: 75,
    duration: '6 horas',
    groupSize: '8-15 personas',
    rating: 4.8,
    reviews: 234,
    nextAvailable: '2024-09-25',
    highlights: [
      'Museo del Prado con entrada skip-the-line',
      'Palacio Real (exterior e interior)',
      'Parque del Retiro y Palacio de Cristal', 
      'Plaza Mayor y Puerta del Sol',
      'Guía experto certificado',
      'Transporte incluido',
      'Grupo pequeño garantizado'
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        
        {/* Header con ejemplo de botón en navbar */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-blue-600">Spirit Tours</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-gray-900">Tours</a>
                <a href="#" className="text-gray-600 hover:text-gray-900">Destinos</a>
                <a href="#" className="text-gray-600 hover:text-gray-900">Sobre Nosotros</a>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <HeaderCallButton 
                preferredAgent="sales"
                customerData={customerData}
              />
              <Button variant="ghost" size="sm">ES/EN</Button>
            </div>
          </div>
        </div>

        {/* Banner principal */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">
              Experimenta Madrid como nunca antes
            </h1>
            <p className="text-xl mb-6 text-blue-100">
              Conecta instantáneamente con nuestros expertos en viajes mediante llamadas directas desde tu navegador.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <InlineCallButton
                preferredAgent="consultant"
                customerData={customerData}
                buttonText="🗣️ Habla con un Consultor Ahora"
                size="lg"
              />
              <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
                Ver Tours
              </Button>
            </div>
          </div>
        </div>

        {/* Sección de tour destacado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Información del tour */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{tourData.title}</CardTitle>
                    <CardDescription className="text-base">
                      {tourData.description}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{tourData.rating}</span>
                    <span className="text-gray-600">({tourData.reviews} reseñas)</span>
                  </div>
                  <Badge variant="secondary">{tourData.duration}</Badge>
                  <Badge variant="secondary">{tourData.groupSize}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Highlights */}
                <div>
                  <h3 className="font-semibold mb-3">Lo que incluye:</h3>
                  <ul className="space-y-2">
                    {tourData.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Detalles adicionales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">Punto de encuentro: Puerta del Sol</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">Inicio: 09:00 AM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">Grupo pequeño garantizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">Próxima fecha: {tourData.nextAvailable}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de reserva */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">€{tourData.price}</div>
                    <div className="text-sm text-gray-600">por persona</div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Disponible
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Botones de acción principal */}
                <div className="space-y-3">
                  <Button className="w-full" size="lg">
                    Reservar Ahora - €{tourData.price}
                  </Button>
                  
                  <InlineCallButton
                    preferredAgent="booking"
                    customerData={{
                      ...customerData,
                      tourInterest: tourData.id
                    }}
                    buttonText="📞 Llamar para Reservar"
                    variant="outline"
                    showAgentStatus
                  />
                </div>

                <Separator />

                {/* Opciones de contacto */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">¿Necesitas ayuda?</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <CallNowButton
                      preferredAgent="support"
                      customerData={customerData}
                      variant="outline"
                      size="sm"
                      buttonText="Soporte"
                    />
                    
                    <CallNowButton
                      preferredAgent="consultant"
                      customerData={customerData}
                      variant="outline"
                      size="sm"
                      buttonText="Consultor"
                    />
                  </div>

                  <CallNowButton
                    preferredAgent="sales"
                    customerData={customerData}
                    variant="ghost"
                    size="sm"
                    buttonText="💬 Chat con Especialista"
                    className="w-full"
                  />
                </div>

                <Separator />

                {/* Información adicional */}
                <div className="text-xs text-gray-600 space-y-1">
                  <p>✅ Cancelación gratuita hasta 24h antes</p>
                  <p>✅ Confirmación instantánea</p>
                  <p>✅ Guías certificados y seguros incluidos</p>
                </div>
                
                <div className="flex items-center justify-center gap-4 pt-2">
                  <Button variant="ghost" size="sm">
                    <Share2 className="w-4 h-4 mr-1" />
                    Compartir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sección de demostración de funcionalidades */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Funcionalidades WebRTC Demo</CardTitle>
            <CardDescription>
              Prueba las diferentes integraciones de llamadas directas desde navegador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Grid de botones de ejemplo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="text-center space-y-2">
                <h4 className="font-semibold text-sm">Especialista en Ventas</h4>
                <CallNowButton
                  preferredAgent="sales"
                  customerData={customerData}
                  variant="default"
                  showAgentStatus
                />
                <p className="text-xs text-gray-600">Recomendaciones y reservas</p>
              </div>

              <div className="text-center space-y-2">
                <h4 className="font-semibold text-sm">Soporte al Cliente</h4>
                <CallNowButton
                  preferredAgent="support"
                  customerData={customerData}
                  variant="outline"
                  showAgentStatus
                />
                <p className="text-xs text-gray-600">Ayuda con reservas existentes</p>
              </div>

              <div className="text-center space-y-2">
                <h4 className="font-semibold text-sm">Asistente de Reservas</h4>
                <CallNowButton
                  preferredAgent="booking"
                  customerData={customerData}
                  variant="default"
                  showAgentStatus
                />
                <p className="text-xs text-gray-600">Gestión de reservas</p>
              </div>

              <div className="text-center space-y-2">
                <h4 className="font-semibold text-sm">Consultor de Viajes</h4>
                <CallNowButton
                  preferredAgent="consultant"
                  customerData={customerData}
                  variant="outline"
                  showAgentStatus
                />
                <p className="text-xs text-gray-600">Asesoría personalizada</p>
              </div>
            </div>

            <Separator />

            {/* Información técnica */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">🔧 Información Técnica</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>WebRTC:</strong> Llamadas directas desde navegador sin plugins</li>
                <li>• <strong>AI Voice Agents:</strong> 4 agentes especializados con OpenAI GPT-4</li>
                <li>• <strong>3CX PBX:</strong> Integración completa con sistema telefónico empresarial</li>
                <li>• <strong>WebSocket:</strong> Señalización en tiempo real para establecer conexiones</li>
                <li>• <strong>Responsive:</strong> Funciona en desktop, tablet y móvil</li>
                <li>• <strong>Transcripción:</strong> Conversaciones convertidas a texto en tiempo real</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Botón flotante siempre visible */}
        <FloatingCallButton
          preferredAgent="sales"
          customerData={customerData}
          buttonText="💬"
        />

      </div>
    </div>
  );
};

export default CallNowExample;