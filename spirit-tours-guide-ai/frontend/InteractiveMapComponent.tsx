/**
 * Interactive Map Component
 * Mapa estilo metro/subway con rutas de colores y tracking en tiempo real
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';

// Iconos personalizados para diferentes tipos de waypoints
const createCustomIcon = (type: string, color: string) => {
  const icons = {
    start: '🚩',
    end: '🏁',
    'major-stop': '📍',
    'walking-route': '🚶',
    'vehicle': '🚌'
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="font-size: 24px; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">${icons[type] || '📍'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
};

const createVehicleIcon = (color: string, heading: number = 0) => {
  return L.divIcon({
    className: 'vehicle-marker',
    html: `
      <div style="
        font-size: 32px;
        transform: rotate(${heading}deg);
        filter: drop-shadow(2px 2px 6px rgba(0,0,0,0.5));
        animation: pulse 2s infinite;
      ">
        🚌
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

interface Waypoint {
  id: string;
  order: number;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  duration: number;
  description: string;
  audioGuide?: boolean;
  perspectives?: string[];
  services?: string[];
}

interface Route {
  id: string;
  name: string;
  color: string;
  colorName: string;
  code: string;
  waypoints: Waypoint[];
  duration: number;
  distance: number;
}

interface VehiclePosition {
  lat: number;
  lng: number;
  timestamp: Date;
  speed: number;
  heading: number;
}

interface Props {
  routes: Route[];
  selectedRouteId?: string;
  activeTourId?: string;
  showAllRoutes?: boolean;
  enableTracking?: boolean;
  onWaypointClick?: (waypoint: Waypoint) => void;
  socketUrl?: string;
}

export const InteractiveMapComponent: React.FC<Props> = ({
  routes,
  selectedRouteId,
  activeTourId,
  showAllRoutes = false,
  enableTracking = false,
  onWaypointClick,
  socketUrl = 'http://localhost:3001'
}) => {
  const [vehiclePosition, setVehiclePosition] = useState<VehiclePosition | null>(null);
  const [visitedWaypoints, setVisitedWaypoints] = useState<string[]>([]);
  const [currentWaypoint, setCurrentWaypoint] = useState<number>(0);
  const [tourProgress, setTourProgress] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const socketRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  // Conectar al WebSocket para tracking en tiempo real
  useEffect(() => {
    if (enableTracking && activeTourId) {
      socketRef.current = io(socketUrl);

      socketRef.current.on('connect', () => {
        console.log('Connected to tracking server');
        socketRef.current.emit('join-tour', activeTourId);
      });

      socketRef.current.on('position-updated', (data: any) => {
        setVehiclePosition({
          lat: data.position.lat,
          lng: data.position.lng,
          timestamp: new Date(data.timestamp),
          speed: data.speed || 0,
          heading: data.heading || 0
        });
        setTourProgress(data.progress.percentage);
      });

      socketRef.current.on('waypoint-reached', (data: any) => {
        setVisitedWaypoints(prev => [...prev, data.waypoint.id]);
        setCurrentWaypoint(data.waypoint.order);
        
        // Mostrar notificación
        setNotifications(prev => [...prev, {
          type: 'success',
          title: `Llegamos a ${data.waypoint.name}`,
          message: data.waypoint.description
        }]);
      });

      socketRef.current.on('route-deviation', (data: any) => {
        setNotifications(prev => [...prev, {
          type: 'info',
          title: 'Desvío en la ruta',
          message: 'Tomando una ruta alternativa. Aquí hay algo interesante...'
        }]);
      });

      socketRef.current.on('notification', (data: any) => {
        setNotifications(prev => [...prev, data]);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leave-tour', activeTourId);
          socketRef.current.disconnect();
        }
      };
    }
  }, [enableTracking, activeTourId, socketUrl]);

  // Filtrar rutas a mostrar
  const displayedRoutes = useMemo(() => {
    if (selectedRouteId) {
      return routes.filter(r => r.id === selectedRouteId);
    }
    return showAllRoutes ? routes : [];
  }, [routes, selectedRouteId, showAllRoutes]);

  // Calcular centro del mapa
  const mapCenter = useMemo(() => {
    if (vehiclePosition) {
      return [vehiclePosition.lat, vehiclePosition.lng] as [number, number];
    }

    if (displayedRoutes.length > 0 && displayedRoutes[0].waypoints.length > 0) {
      const firstWaypoint = displayedRoutes[0].waypoints[0];
      return [firstWaypoint.location.lat, firstWaypoint.location.lng] as [number, number];
    }

    return [31.7767, 35.2287] as [number, number]; // Jerusalem default
  }, [displayedRoutes, vehiclePosition]);

  return (
    <div className="relative w-full h-full">
      {/* Mapa principal */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        className="w-full h-full rounded-lg shadow-xl"
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Renderizar cada ruta */}
        {displayedRoutes.map(route => (
          <React.Fragment key={route.id}>
            {/* Línea de la ruta */}
            <Polyline
              positions={route.waypoints.map(wp => [wp.location.lat, wp.location.lng])}
              color={route.color}
              weight={6}
              opacity={0.7}
              dashArray="10, 10"
            />

            {/* Waypoints */}
            {route.waypoints.map(waypoint => {
              const isVisited = visitedWaypoints.includes(waypoint.id);
              const isCurrent = waypoint.order === currentWaypoint;

              return (
                <Marker
                  key={waypoint.id}
                  position={[waypoint.location.lat, waypoint.location.lng]}
                  icon={createCustomIcon(waypoint.type, route.color)}
                  eventHandlers={{
                    click: () => onWaypointClick?.(waypoint)
                  }}
                >
                  <Popup>
                    <div className="max-w-xs">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{waypoint.name}</h3>
                        <span 
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ 
                            backgroundColor: route.color,
                            color: 'white'
                          }}
                        >
                          {route.code}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">
                        {waypoint.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>⏱️ {waypoint.duration} min</span>
                        {waypoint.audioGuide && <span>🎧 Audio guía</span>}
                        {isVisited && <span className="text-green-600">✅ Visitado</span>}
                        {isCurrent && <span className="text-blue-600">📍 Actual</span>}
                      </div>

                      {waypoint.perspectives && waypoint.perspectives.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-semibold mb-1">Perspectivas disponibles:</p>
                          <div className="flex gap-1 flex-wrap">
                            {waypoint.perspectives.map(p => (
                              <span 
                                key={p}
                                className="text-xs px-2 py-1 bg-gray-200 rounded"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {waypoint.services && waypoint.services.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-semibold mb-1">Servicios:</p>
                          <div className="flex gap-1 flex-wrap">
                            {waypoint.services.map(s => (
                              <span key={s} className="text-xs">
                                {s === 'restroom' && '🚻'}
                                {s === 'parking' && '🅿️'}
                                {s === 'shop' && '🛍️'}
                                {s === 'restaurant' && '🍽️'}
                                {s === 'cafe' && '☕'}
                                {s === 'prayer-area' && '🙏'}
                                {s === 'security' && '🔒'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        className="mt-2 w-full bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                        onClick={() => onWaypointClick?.(waypoint)}
                      >
                        Ver detalles y perspectivas
                      </button>
                    </div>
                  </Popup>

                  <Tooltip direction="top" offset={[0, -20]}>
                    {waypoint.name}
                  </Tooltip>
                </Marker>
              );
            })}

            {/* Círculos de radio alrededor de waypoints importantes */}
            {route.waypoints
              .filter(wp => wp.type === 'major-stop')
              .map(waypoint => (
                <Circle
                  key={`circle-${waypoint.id}`}
                  center={[waypoint.location.lat, waypoint.location.lng]}
                  radius={50}
                  pathOptions={{
                    color: route.color,
                    fillColor: route.color,
                    fillOpacity: 0.1
                  }}
                />
              ))}
          </React.Fragment>
        ))}

        {/* Marcador del vehículo en tiempo real */}
        {vehiclePosition && (
          <>
            <Marker
              position={[vehiclePosition.lat, vehiclePosition.lng]}
              icon={createVehicleIcon(
                displayedRoutes[0]?.color || '#FF0000',
                vehiclePosition.heading
              )}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">Vehículo del tour</p>
                  <p>Velocidad: {vehiclePosition.speed.toFixed(1)} km/h</p>
                  <p>Última actualización: {vehiclePosition.timestamp.toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>

            {/* Círculo de precisión GPS */}
            <Circle
              center={[vehiclePosition.lat, vehiclePosition.lng]}
              radius={20}
              pathOptions={{
                color: '#4A90E2',
                fillColor: '#4A90E2',
                fillOpacity: 0.2
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Panel de información de la ruta (estilo metro) */}
      {displayedRoutes.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-[1000]">
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: displayedRoutes[0].color }}
            >
              {displayedRoutes[0].code}
            </div>
            <div>
              <h3 className="font-bold text-lg">{displayedRoutes[0].name}</h3>
              <p className="text-sm text-gray-600">Línea {displayedRoutes[0].colorName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{displayedRoutes[0].duration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <span>📏</span>
              <span>{displayedRoutes[0].distance} km</span>
            </div>
            <div className="flex items-center gap-1">
              <span>📍</span>
              <span>{displayedRoutes[0].waypoints.length} paradas</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🎯</span>
              <span>{tourProgress.toFixed(0)}% completo</span>
            </div>
          </div>

          {/* Barra de progreso */}
          {enableTracking && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progreso del tour</span>
                <span>{tourProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${tourProgress}%`,
                    backgroundColor: displayedRoutes[0].color
                  }}
                />
              </div>
            </div>
          )}

          {/* Próximas paradas */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Próximas paradas:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {displayedRoutes[0].waypoints
                .filter((_, idx) => idx >= currentWaypoint)
                .slice(0, 4)
                .map((waypoint, idx) => (
                  <div 
                    key={waypoint.id}
                    className={`flex items-center gap-2 text-sm p-1 rounded ${
                      idx === 0 ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <span className="text-gray-400">{waypoint.order}</span>
                    <span>{waypoint.name}</span>
                    {idx === 0 && <span className="ml-auto text-blue-600">→</span>}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2 max-w-sm">
        {notifications.slice(-3).map((notification, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-lg shadow-xl p-3 animate-slide-in-right ${
              notification.type === 'success' ? 'border-l-4 border-green-500' :
              notification.type === 'info' ? 'border-l-4 border-blue-500' :
              notification.type === 'warning' ? 'border-l-4 border-yellow-500' :
              'border-l-4 border-gray-500'
            }`}
          >
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            {notification.message && (
              <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
            )}
          </div>
        ))}
      </div>

      {/* Leyenda de rutas (cuando se muestran múltiples) */}
      {showAllRoutes && routes.length > 1 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-xl p-3 z-[1000]">
          <p className="text-xs font-semibold text-gray-600 mb-2">Rutas disponibles:</p>
          <div className="space-y-1">
            {routes.map(route => (
              <div key={route.id} className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: route.color }}
                >
                  {route.code}
                </div>
                <span className="text-sm">{route.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estilos CSS adicionales */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }

        .custom-marker {
          background: transparent;
          border: none;
        }

        .vehicle-marker {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default InteractiveMapComponent;
