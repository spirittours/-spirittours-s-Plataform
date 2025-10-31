import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Camera, Navigation, MapPin, Layers, Settings, X, 
  Maximize2, Minimize2, Info, History, Image as ImageIcon,
  RotateCw, ZoomIn, ZoomOut, Compass, Target
} from 'lucide-react';

// ==================== TYPES ====================

interface POI {
  id: string;
  name: string;
  description: string;
  category: string;
  coordinates: {
    lat: number;
    lng: number;
    alt?: number;
  };
  historicalImages?: string[];
  arModel?: string;
  info: {
    yearBuilt?: number;
    architect?: string;
    historicalFacts: string[];
  };
}

interface ARMarker {
  poi: POI;
  distance: number;
  bearing: number;
  screenPosition?: { x: number; y: number };
  isVisible: boolean;
}

interface UserPosition {
  lat: number;
  lng: number;
  heading: number;
  altitude?: number;
}

interface Props {
  pois: POI[];
  currentPosition: UserPosition;
  onPOISelect: (poiId: string) => void;
  onClose?: () => void;
}

// ==================== MAIN COMPONENT ====================

const ARExplorer: React.FC<Props> = ({ pois, currentPosition, onPOISelect, onClose }) => {
  // State
  const [isARActive, setIsARActive] = useState(false);
  const [markers, setMarkers] = useState<ARMarker[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [showHistorical, setShowHistorical] = useState(false);
  const [viewDistance, setViewDistance] = useState(500); // meters
  const [deviceOrientation, setDeviceOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [arMode, setArMode] = useState<'markers' | 'navigation' | '3d'>('markers');
  const [historicalComparison, setHistoricalComparison] = useState(false);
  const [compassHeading, setCompassHeading] = useState(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  // ==================== EFFECTS ====================
  
  // Initialize AR on mount
  useEffect(() => {
    if (isARActive) {
      initializeAR();
    }
    
    return () => {
      cleanupAR();
    };
  }, [isARActive]);
  
  // Update markers when position or POIs change
  useEffect(() => {
    if (isARActive && currentPosition) {
      updateMarkers();
    }
  }, [currentPosition, pois, viewDistance, isARActive]);
  
  // Listen to device orientation
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      setDeviceOrientation({
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0
      });
      
      // Update compass heading
      if (event.alpha !== null) {
        setCompassHeading(360 - event.alpha);
      }
    };
    
    if (isARActive && typeof DeviceOrientationEvent !== 'undefined') {
      // Request permission on iOS 13+
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isARActive]);
  
  // ==================== AR INITIALIZATION ====================
  
  const initializeAR = async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Initialize Three.js scene
      initThreeJS();
      
      // Start render loop
      animate();
    } catch (error) {
      console.error('Error initializing AR:', error);
      alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
      setIsARActive(false);
    }
  };
  
  const initThreeJS = () => {
    if (!canvasRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);
  };
  
  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    // Update camera rotation based on device orientation
    if (deviceOrientation.beta !== null && deviceOrientation.gamma !== null) {
      cameraRef.current.rotation.x = THREE.MathUtils.degToRad(deviceOrientation.beta - 90);
      cameraRef.current.rotation.y = THREE.MathUtils.degToRad(deviceOrientation.alpha || 0);
      cameraRef.current.rotation.z = THREE.MathUtils.degToRad(deviceOrientation.gamma || 0);
    }
    
    // Render scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  
  const cleanupAR = () => {
    // Stop camera stream
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    
    // Stop animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Cleanup Three.js
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
  };
  
  // ==================== MARKER CALCULATIONS ====================
  
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  };
  
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    
    return (θ * 180 / Math.PI + 360) % 360;
  };
  
  const updateMarkers = () => {
    const newMarkers: ARMarker[] = pois.map(poi => {
      const distance = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        poi.coordinates.lat,
        poi.coordinates.lng
      );
      
      const bearing = calculateBearing(
        currentPosition.lat,
        currentPosition.lng,
        poi.coordinates.lat,
        poi.coordinates.lng
      );
      
      // Calculate if marker is visible in current view
      const relativeBearing = (bearing - currentPosition.heading + 360) % 360;
      const isVisible = distance <= viewDistance && 
                       relativeBearing >= 330 || relativeBearing <= 30 || 
                       (relativeBearing >= 150 && relativeBearing <= 210);
      
      return {
        poi,
        distance,
        bearing,
        isVisible
      };
    }).filter(marker => marker.distance <= viewDistance);
    
    setMarkers(newMarkers);
  };
  
  const getMarkerPosition = (marker: ARMarker): { x: number; y: number } => {
    const relativeBearing = (marker.bearing - currentPosition.heading + 360) % 360;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Map bearing to screen position (simplified)
    const x = (relativeBearing / 360) * screenWidth;
    const y = screenHeight / 2 - (marker.distance / viewDistance) * 100;
    
    return { x, y };
  };
  
  // ==================== HANDLERS ====================
  
  const handleStartAR = async () => {
    setIsARActive(true);
  };
  
  const handleStopAR = () => {
    setIsARActive(false);
    cleanupAR();
    if (onClose) onClose();
  };
  
  const handleMarkerClick = (poi: POI) => {
    setSelectedPOI(poi);
    onPOISelect(poi.id);
  };
  
  const handleToggleHistorical = () => {
    setShowHistorical(!showHistorical);
  };
  
  const handleChangeViewDistance = (distance: number) => {
    setViewDistance(distance);
  };
  
  const handleToggleARMode = (mode: 'markers' | 'navigation' | '3d') => {
    setArMode(mode);
  };
  
  // ==================== RENDER HELPERS ====================
  
  const renderARMarker = (marker: ARMarker, index: number) => {
    if (!marker.isVisible) return null;
    
    const position = getMarkerPosition(marker);
    const distanceText = marker.distance < 1000 
      ? `${Math.round(marker.distance)}m`
      : `${(marker.distance / 1000).toFixed(1)}km`;
    
    return (
      <div
        key={marker.poi.id}
        onClick={() => handleMarkerClick(marker.poi)}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 1000 - index
        }}
      >
        {/* Marker Pin */}
        <div className="relative">
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
            <div className="bg-blue-600 text-white rounded-full p-3 shadow-lg animate-bounce">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-blue-600"></div>
          </div>
          
          {/* Info Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-3 min-w-[200px] mt-2">
            <h3 className="font-bold text-gray-900 text-sm mb-1">{marker.poi.name}</h3>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{marker.poi.description}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center text-blue-600">
                <Navigation className="w-3 h-3 mr-1" />
                {distanceText}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                {marker.poi.category}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderCompass = () => (
    <div className="absolute top-20 right-4 bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-lg">
      <div className="relative w-16 h-16">
        <div 
          className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
          style={{ transform: `rotate(${compassHeading}deg)` }}
        >
          <Compass className="w-12 h-12 text-red-600" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-900 bg-white rounded-full px-2 py-1">
            {Math.round(compassHeading)}°
          </span>
        </div>
      </div>
    </div>
  );
  
  const renderControls = () => (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
      <button
        onClick={() => handleToggleARMode('markers')}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          arMode === 'markers' 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'bg-white/90 text-gray-700'
        }`}
      >
        <MapPin className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleToggleARMode('navigation')}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          arMode === 'navigation' 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'bg-white/90 text-gray-700'
        }`}
      >
        <Navigation className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleToggleARMode('3d')}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          arMode === '3d' 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'bg-white/90 text-gray-700'
        }`}
      >
        <Layers className="w-5 h-5" />
      </button>
      <button
        onClick={handleToggleHistorical}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          showHistorical 
            ? 'bg-purple-600 text-white shadow-lg' 
            : 'bg-white/90 text-gray-700'
        }`}
      >
        <History className="w-5 h-5" />
      </button>
    </div>
  );
  
  const renderSettings = () => (
    <div className="absolute top-20 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 w-64">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Configuración AR</h3>
        <button onClick={() => setShowSettings(false)}>
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Distancia de Vista: {viewDistance}m
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={viewDistance}
            onChange={(e) => handleChangeViewDistance(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100m</span>
            <span>2km</span>
          </div>
        </div>
        
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={historicalComparison}
              onChange={(e) => setHistoricalComparison(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Comparación Histórica</span>
          </label>
        </div>
      </div>
    </div>
  );
  
  const renderSelectedPOI = () => {
    if (!selectedPOI) return null;
    
    return (
      <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 max-w-md">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedPOI.name}</h2>
            <p className="text-sm text-gray-600">{selectedPOI.description}</p>
          </div>
          <button onClick={() => setSelectedPOI(null)} className="ml-2">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {selectedPOI.info && (
          <div className="space-y-2 text-sm">
            {selectedPOI.info.yearBuilt && (
              <p className="text-gray-700">
                <span className="font-medium">Año:</span> {selectedPOI.info.yearBuilt}
              </p>
            )}
            {selectedPOI.info.architect && (
              <p className="text-gray-700">
                <span className="font-medium">Arquitecto:</span> {selectedPOI.info.architect}
              </p>
            )}
            {selectedPOI.info.historicalFacts.length > 0 && (
              <div>
                <p className="font-medium text-gray-900 mb-1">Datos Históricos:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {selectedPOI.info.historicalFacts.map((fact, index) => (
                    <li key={index}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {selectedPOI.historicalImages && selectedPOI.historicalImages.length > 0 && (
          <div className="mt-3">
            <button
              onClick={handleToggleHistorical}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Ver Imágenes Históricas</span>
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // ==================== RENDER ====================
  
  if (!isARActive) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-blue-100 rounded-full p-4 inline-block mb-4">
              <Camera className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Exploración AR
            </h2>
            <p className="text-gray-600">
              Descubre puntos de interés con realidad aumentada
            </p>
          </div>
          
          <div className="space-y-3 mb-6 text-sm text-gray-700">
            <div className="flex items-start space-x-2">
              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>Visualiza POIs cercanos en tu cámara</p>
            </div>
            <div className="flex items-start space-x-2">
              <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>Navegación AR en tiempo real</p>
            </div>
            <div className="flex items-start space-x-2">
              <History className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>Comparación con imágenes históricas</p>
            </div>
            <div className="flex items-start space-x-2">
              <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>Modelos 3D y reconstrucciones</p>
            </div>
          </div>
          
          <button
            onClick={handleStartAR}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <Camera className="w-5 h-5" />
            <span>Iniciar Exploración AR</span>
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="w-full mt-3 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancelar
            </button>
          )}
          
          <p className="text-xs text-gray-500 text-center mt-4">
            Se requieren permisos de cámara y sensores
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black">
      {/* Camera Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />
      
      {/* Three.js Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      {/* AR Markers */}
      {arMode === 'markers' && markers.map((marker, index) => renderARMarker(marker, index))}
      
      {/* UI Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
              <p className="text-sm font-medium text-gray-900">
                {markers.filter(m => m.isVisible).length} POIs visibles
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg hover:bg-white transition-colors"
              >
                <Settings className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={handleStopAR}
                className="bg-red-600 rounded-lg p-2 shadow-lg hover:bg-red-700 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
          
          {/* Compass */}
          {renderCompass()}
          
          {/* Settings Panel */}
          {showSettings && renderSettings()}
          
          {/* Selected POI Info */}
          {renderSelectedPOI()}
          
          {/* Controls */}
          {renderControls()}
          
          {/* Marker Count */}
          <div className="absolute bottom-20 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
            <p className="text-xs text-gray-700">
              <Target className="w-3 h-3 inline mr-1" />
              Rango: {viewDistance}m
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARExplorer;
