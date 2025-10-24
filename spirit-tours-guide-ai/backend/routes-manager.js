/**
 * Routes Manager
 * Sistema de gestión de rutas de tours tipo metro/subway
 * Con tracking en tiempo real y notificaciones
 */

const EventEmitter = require('events');

// Definición de rutas de tours
const TOUR_ROUTES = {
  'jerusalem-religious': {
    id: 'jerusalem-religious',
    name: 'Tour Religioso de Jerusalén',
    color: '#FF0000',
    colorName: 'Rojo',
    code: 'R1',
    duration: 480, // minutos
    distance: 15, // km
    difficulty: 'medium',
    description: 'Recorrido por los lugares sagrados de las tres religiones abrahámicas',
    
    waypoints: [
      {
        id: 'start-jaffa-gate',
        order: 1,
        name: 'Puerta de Jaffa',
        type: 'start',
        location: { lat: 31.7767, lng: 35.2287 },
        duration: 15, // minutos en este punto
        description: 'Punto de inicio del tour',
        services: ['parking', 'restroom', 'shop'],
        accessibility: { wheelchair: true, elevator: false }
      },
      {
        id: 'western-wall',
        order: 2,
        name: 'Muro de los Lamentos',
        type: 'major-stop',
        location: { lat: 31.7767, lng: 35.2345 },
        duration: 60,
        description: 'Lugar más sagrado del judaísmo',
        pointsOfInterest: ['western-wall'],
        perspectives: ['jewish', 'islamic', 'historical'],
        services: ['restroom', 'security', 'prayer-area'],
        accessibility: { wheelchair: true, elevator: false },
        dressCode: 'modest',
        audioGuide: true
      },
      {
        id: 'dome-of-rock',
        order: 3,
        name: 'Cúpula de la Roca',
        type: 'major-stop',
        location: { lat: 31.7780, lng: 35.2354 },
        duration: 45,
        description: 'Monumento islámico icónico',
        pointsOfInterest: ['dome-of-the-rock'],
        perspectives: ['islamic', 'jewish', 'historical'],
        services: ['viewing-area', 'photo-spot'],
        accessibility: { wheelchair: false, stairs: true },
        restrictions: 'Non-Muslims cannot enter',
        audioGuide: true
      },
      {
        id: 'church-holy-sepulchre',
        order: 4,
        name: 'Iglesia del Santo Sepulcro',
        type: 'major-stop',
        location: { lat: 31.7784, lng: 35.2295 },
        duration: 60,
        description: 'Lugar de crucifixión y resurrección de Jesús',
        pointsOfInterest: ['holy-sepulchre'],
        perspectives: ['christian', 'historical', 'archaeological'],
        services: ['chapel', 'candle-shop', 'restroom'],
        accessibility: { wheelchair: 'partial', elevator: false },
        audioGuide: true
      },
      {
        id: 'via-dolorosa',
        order: 5,
        name: 'Vía Dolorosa',
        type: 'walking-route',
        location: { lat: 31.7799, lng: 35.2322 },
        duration: 45,
        description: 'Camino que siguió Jesús hacia la crucifixión',
        perspectives: ['christian', 'historical'],
        services: ['rest-areas', 'water-fountain'],
        accessibility: { wheelchair: false, cobblestone: true },
        audioGuide: true
      },
      {
        id: 'end-jaffa-gate',
        order: 6,
        name: 'Puerta de Jaffa',
        type: 'end',
        location: { lat: 31.7767, lng: 35.2287 },
        duration: 10,
        description: 'Fin del tour',
        services: ['parking', 'restroom', 'restaurant'],
        accessibility: { wheelchair: true }
      }
    ],

    alternatives: [
      {
        reason: 'traffic',
        from: 'western-wall',
        to: 'dome-of-rock',
        alternativeWaypoints: [
          {
            id: 'alt-muslim-quarter',
            name: 'Barrio Musulmán',
            location: { lat: 31.7775, lng: 35.2340 },
            duration: 20,
            description: 'Ruta alternativa por el barrio musulmán'
          }
        ]
      }
    ],

    recommendations: {
      bestTime: 'morning',
      avoidDays: ['friday-afternoon', 'saturday', 'muslim-friday-prayer'],
      requiredItems: ['water', 'hat', 'modest-clothing'],
      difficulty: 'medium',
      fitness: 'moderate walking'
    }
  },

  'jerusalem-historical': {
    id: 'jerusalem-historical',
    name: 'Tour Histórico de Jerusalén',
    color: '#0000FF',
    colorName: 'Azul',
    code: 'A1',
    duration: 360,
    distance: 12,
    difficulty: 'easy',
    description: 'Recorrido por sitios históricos y arqueológicos',
    
    waypoints: [
      {
        id: 'start-city-david',
        order: 1,
        name: 'Ciudad de David',
        type: 'start',
        location: { lat: 31.7739, lng: 35.2363 },
        duration: 90,
        description: 'Sitio arqueológico del antiguo Jerusalén',
        perspectives: ['archaeological', 'historical'],
        services: ['museum', 'restroom', 'cafe'],
        accessibility: { wheelchair: 'partial', elevator: true },
        audioGuide: true
      },
      {
        id: 'southern-wall',
        order: 2,
        name: 'Muro Sur del Monte del Templo',
        type: 'major-stop',
        location: { lat: 31.7757, lng: 35.2358 },
        duration: 45,
        description: 'Excavaciones arqueológicas del período del Segundo Templo',
        perspectives: ['archaeological', 'historical', 'jewish'],
        services: ['viewing-platforms', 'information-center'],
        accessibility: { wheelchair: true },
        audioGuide: true
      },
      // ... más waypoints
    ]
  },

  'bethlehem-tour': {
    id: 'bethlehem-tour',
    name: 'Tour de Belén',
    color: '#FFD700',
    colorName: 'Dorado',
    code: 'D1',
    duration: 240,
    distance: 20,
    difficulty: 'easy',
    description: 'Visita a la ciudad de nacimiento de Jesús',
    
    waypoints: [
      {
        id: 'start-jerusalem-checkpoint',
        order: 1,
        name: 'Checkpoint Jerusalén',
        type: 'start',
        location: { lat: 31.7709, lng: 35.2196 },
        duration: 20,
        description: 'Punto de partida',
        services: ['parking', 'exchange-office'],
        accessibility: { wheelchair: true }
      },
      {
        id: 'church-nativity',
        order: 2,
        name: 'Iglesia de la Natividad',
        type: 'major-stop',
        location: { lat: 31.7042, lng: 35.2072 },
        duration: 90,
        description: 'Lugar de nacimiento de Jesús',
        perspectives: ['christian', 'historical', 'archaeological'],
        services: ['chapel', 'gift-shop', 'restroom'],
        accessibility: { wheelchair: 'partial' },
        audioGuide: true
      },
      // ... más waypoints
    ]
  }
};

// Clase para gestionar rutas y tracking en tiempo real
class RoutesManager extends EventEmitter {
  constructor() {
    super();
    this.activeT ours = new Map(); // tourId -> tour data
    this.vehiclePositions = new Map(); // vehicleId -> position
    this.notifications = [];
    this.deviationThreshold = 100; // metros
  }

  /**
   * Obtiene todas las rutas disponibles
   */
  getAllRoutes() {
    return Object.values(TOUR_ROUTES);
  }

  /**
   * Obtiene una ruta específica
   */
  getRoute(routeId) {
    return TOUR_ROUTES[routeId] || null;
  }

  /**
   * Inicia un tour activo
   */
  startTour(tourData) {
    const {
      tourId,
      routeId,
      vehicleId,
      driverId,
      passengers,
      startTime = new Date()
    } = tourData;

    const route = this.getRoute(routeId);
    if (!route) {
      throw new Error(`Route ${routeId} not found`);
    }

    const tour = {
      tourId,
      routeId,
      route,
      vehicleId,
      driverId,
      passengers,
      startTime,
      status: 'active',
      currentWaypointIndex: 0,
      visitedWaypoints: [],
      deviations: [],
      notifications: [],
      estimatedEndTime: new Date(startTime.getTime() + route.duration * 60000)
    };

    this.activeTours.set(tourId, tour);
    this.emit('tour-started', tour);

    return tour;
  }

  /**
   * Actualiza la posición del vehículo
   */
  updateVehiclePosition(vehicleId, position) {
    const { lat, lng, timestamp = new Date(), speed = 0, heading = 0 } = position;

    this.vehiclePositions.set(vehicleId, {
      lat,
      lng,
      timestamp,
      speed,
      heading
    });

    // Encontrar tour asociado al vehículo
    const tour = Array.from(this.activeTours.values()).find(t => t.vehicleId === vehicleId);
    
    if (tour) {
      // Verificar si llegó a waypoint
      this._checkWaypointArrival(tour, { lat, lng });
      
      // Verificar desviaciones
      this._checkDeviation(tour, { lat, lng });
      
      // Actualizar ETA
      this._updateETA(tour, { lat, lng, speed });
      
      // Emitir evento de actualización
      this.emit('position-updated', {
        tourId: tour.tourId,
        vehicleId,
        position: { lat, lng },
        progress: this._calculateProgress(tour)
      });
    }

    return this.vehiclePositions.get(vehicleId);
  }

  /**
   * Verifica si el vehículo llegó a un waypoint
   */
  _checkWaypointArrival(tour, currentPosition) {
    const currentWaypoint = tour.route.waypoints[tour.currentWaypointIndex];
    
    if (!currentWaypoint || tour.visitedWaypoints.includes(currentWaypoint.id)) {
      return;
    }

    const distance = this._calculateDistance(
      currentPosition.lat,
      currentPosition.lng,
      currentWaypoint.location.lat,
      currentWaypoint.location.lng
    );

    // Si está dentro de 50 metros del waypoint
    if (distance <= 0.05) {
      tour.visitedWaypoints.push(currentWaypoint.id);
      tour.currentWaypointIndex++;

      this.emit('waypoint-reached', {
        tourId: tour.tourId,
        waypoint: currentWaypoint,
        progress: this._calculateProgress(tour)
      });

      // Notificar a pasajeros
      this._sendNotification(tour.tourId, {
        type: 'waypoint-reached',
        title: `Llegamos a ${currentWaypoint.name}`,
        message: `${currentWaypoint.description}. Duración estimada: ${currentWaypoint.duration} minutos.`,
        priority: 'medium'
      });
    }
  }

  /**
   * Verifica desviaciones de la ruta
   */
  _checkDeviation(tour, currentPosition) {
    const currentWaypoint = tour.route.waypoints[tour.currentWaypointIndex];
    const nextWaypoint = tour.route.waypoints[tour.currentWaypointIndex + 1];

    if (!currentWaypoint || !nextWaypoint) return;

    // Calcular si está desviado de la línea directa entre waypoints
    const deviationDistance = this._distanceFromLine(
      currentPosition,
      currentWaypoint.location,
      nextWaypoint.location
    );

    if (deviationDistance > this.deviationThreshold / 1000) { // convertir a km
      const deviation = {
        timestamp: new Date(),
        location: currentPosition,
        distance: deviationDistance,
        reason: 'unknown'
      };

      tour.deviations.push(deviation);

      this.emit('route-deviation', {
        tourId: tour.tourId,
        deviation,
        suggestedContent: this._getDeviationContent(currentPosition)
      });

      // Notificar a pasajeros
      this._sendNotification(tour.tourId, {
        type: 'deviation',
        title: 'Pequeño desvío en la ruta',
        message: 'Estamos tomando una ruta alternativa. Mientras tanto, aquí hay algo interesante...',
        priority: 'low'
      });
    }
  }

  /**
   * Obtiene contenido contextual durante desviaciones
   */
  _getDeviationContent(position) {
    // Aquí se podría integrar con un sistema de contenido contextual
    return {
      type: 'story',
      title: 'Historia Local',
      content: 'Contenido interesante sobre el área actual...',
      media: []
    };
  }

  /**
   * Actualiza el tiempo estimado de llegada
   */
  _updateETA(tour, vehicleData) {
    const { lat, lng, speed } = vehicleData;
    
    const remainingWaypoints = tour.route.waypoints.slice(tour.currentWaypointIndex);
    
    if (remainingWaypoints.length === 0) {
      return;
    }

    // Calcular distancia restante
    let remainingDistance = 0;
    let currentLat = lat;
    let currentLng = lng;

    for (const waypoint of remainingWaypoints) {
      remainingDistance += this._calculateDistance(
        currentLat,
        currentLng,
        waypoint.location.lat,
        waypoint.location.lng
      );
      currentLat = waypoint.location.lat;
      currentLng = waypoint.location.lng;
    }

    // Calcular tiempo estimado (asumiendo velocidad promedio de 30 km/h en ciudad)
    const avgSpeed = speed > 0 ? speed : 30;
    const remainingTimeHours = remainingDistance / avgSpeed;
    const remainingTimeMinutes = remainingTimeHours * 60;

    // Agregar tiempo de paradas
    const stopsTime = remainingWaypoints.reduce((sum, wp) => sum + wp.duration, 0);

    tour.estimatedEndTime = new Date(Date.now() + (remainingTimeMinutes + stopsTime) * 60000);
    
    return {
      remainingDistance,
      remainingTime: remainingTimeMinutes + stopsTime,
      estimatedEndTime: tour.estimatedEndTime
    };
  }

  /**
   * Calcula el progreso del tour
   */
  _calculateProgress(tour) {
    const totalWaypoints = tour.route.waypoints.length;
    const visitedCount = tour.visitedWaypoints.length;
    
    return {
      percentage: (visitedCount / totalWaypoints * 100).toFixed(1),
      currentWaypoint: tour.currentWaypointIndex,
      totalWaypoints,
      visitedWaypoints: visitedCount
    };
  }

  /**
   * Envía notificación a los pasajeros del tour
   */
  _sendNotification(tourId, notification) {
    const notificationData = {
      tourId,
      timestamp: new Date(),
      ...notification
    };

    this.notifications.push(notificationData);
    this.emit('notification', notificationData);

    return notificationData;
  }

  /**
   * Obtiene el tour activo
   */
  getActiveTour(tourId) {
    return this.activeTours.get(tourId);
  }

  /**
   * Obtiene todos los tours activos
   */
  getAllActiveTours() {
    return Array.from(this.activeTours.values());
  }

  /**
   * Finaliza un tour
   */
  endTour(tourId) {
    const tour = this.activeTours.get(tourId);
    
    if (!tour) {
      throw new Error(`Tour ${tourId} not found`);
    }

    tour.status = 'completed';
    tour.endTime = new Date();
    tour.actualDuration = (tour.endTime - tour.startTime) / 60000; // minutos

    this.emit('tour-ended', tour);
    
    // Enviar notificación final
    this._sendNotification(tourId, {
      type: 'tour-completed',
      title: '¡Tour completado!',
      message: 'Gracias por visitarnos. Por favor, comparte tu experiencia y síguenos en redes sociales.',
      priority: 'high'
    });

    return tour;
  }

  /**
   * Calcula distancia entre dos puntos (Haversine)
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calcula distancia de un punto a una línea
   */
  _distanceFromLine(point, lineStart, lineEnd) {
    // Fórmula de distancia de punto a línea
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? dot / lenSq : -1;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.lat;
      yy = lineStart.lng;
    } else if (param > 1) {
      xx = lineEnd.lat;
      yy = lineEnd.lng;
    } else {
      xx = lineStart.lat + param * C;
      yy = lineStart.lng + param * D;
    }

    return this._calculateDistance(point.lat, point.lng, xx, yy);
  }

  _toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      totalRoutes: Object.keys(TOUR_ROUTES).length,
      activeTours: this.activeTours.size,
      trackedVehicles: this.vehiclePositions.size,
      totalNotifications: this.notifications.length
    };
  }
}

module.exports = {
  RoutesManager,
  TOUR_ROUTES
};
