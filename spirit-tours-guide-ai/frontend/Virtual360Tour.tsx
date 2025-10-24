import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Maximize2, Minimize2, Info, Map, Settings, X, RotateCw,
  ZoomIn, ZoomOut, Compass, Eye, Layers, Download, Share2
} from 'lucide-react';

// ==================== TYPES ====================

interface Hotspot {
  id: string;
  position: { theta: number; phi: number };
  type: 'info' | 'navigation' | 'media' | 'interactive';
  title: string;
  description?: string;
  targetSceneId?: string;
  mediaUrl?: string;
  icon?: string;
}

interface Scene360 {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
  audioNarrationUrl?: string;
  hotspots: Hotspot[];
  description: string;
  poi?: {
    id: string;
    name: string;
    category: string;
  };
}

interface Tour360 {
  id: string;
  name: string;
  description: string;
  scenes: Scene360[];
  defaultSceneId: string;
  duration?: number;
}

interface Props {
  tour: Tour360;
  autoPlay?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
}

// ==================== MAIN COMPONENT ====================

const Virtual360Tour: React.FC<Props> = ({ tour, autoPlay = false, onComplete, onClose }) => {
  // State
  const [currentSceneId, setCurrentSceneId] = useState(tour.defaultSceneId);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(75);
  const [loading, setLoading] = useState(false);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [deviceOrientation, setDeviceOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mouseDownRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  
  // Current scene
  const currentScene = tour.scenes.find(s => s.id === currentSceneId) || tour.scenes[0];
  
  // ==================== EFFECTS ====================
  
  // Initialize Three.js on mount
  useEffect(() => {
    initThreeJS();
    
    return () => {
      cleanup();
    };
  }, []);
  
  // Load scene when it changes
  useEffect(() => {
    if (currentScene) {
      loadScene(currentScene);
    }
  }, [currentSceneId]);
  
  // Handle audio playback
  useEffect(() => {
    if (audioRef.current && currentScene.audioNarrationUrl) {
      if (isPlaying && !isMuted) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted, currentScene]);
  
  // Handle gyroscope
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (gyroEnabled) {
        setDeviceOrientation({
          alpha: event.alpha || 0,
          beta: event.beta || 0,
          gamma: event.gamma || 0
        });
      }
    };
    
    if (gyroEnabled && typeof DeviceOrientationEvent !== 'undefined') {
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
  }, [gyroEnabled]);
  
  // Update camera rotation with gyroscope
  useEffect(() => {
    if (gyroEnabled && cameraRef.current) {
      const beta = THREE.MathUtils.degToRad(deviceOrientation.beta - 90);
      const gamma = THREE.MathUtils.degToRad(deviceOrientation.gamma);
      const alpha = THREE.MathUtils.degToRad(deviceOrientation.alpha);
      
      cameraRef.current.rotation.set(beta, alpha, -gamma, 'YXZ');
    }
  }, [deviceOrientation, gyroEnabled]);
  
  // ==================== THREE.JS SETUP ====================
  
  const initThreeJS = () => {
    if (!canvasRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      zoom,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    
    // Start render loop
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };
  
  const loadScene = async (scene: Scene360) => {
    if (!sceneRef.current) return;
    
    setLoading(true);
    
    try {
      // Remove old sphere if exists
      if (sphereRef.current) {
        sceneRef.current.remove(sphereRef.current);
        sphereRef.current.geometry.dispose();
        (sphereRef.current.material as THREE.Material).dispose();
      }
      
      // Load 360 image texture
      const textureLoader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(
          scene.imageUrl,
          resolve,
          undefined,
          reject
        );
      });
      
      // Create sphere geometry
      const geometry = new THREE.SphereGeometry(500, 60, 40);
      geometry.scale(-1, 1, 1); // Invert to see from inside
      
      // Create material with texture
      const material = new THREE.MeshBasicMaterial({ map: texture });
      
      // Create mesh
      const sphere = new THREE.Mesh(geometry, material);
      sphereRef.current = sphere;
      
      sceneRef.current.add(sphere);
      
      // Add hotspot markers
      if (showHotspots) {
        scene.hotspots.forEach(hotspot => {
          addHotspotMarker(hotspot);
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading 360 scene:', error);
      setLoading(false);
    }
  };
  
  const addHotspotMarker = (hotspot: Hotspot) => {
    if (!sceneRef.current) return;
    
    // Convert spherical coordinates to Cartesian
    const radius = 490; // Slightly smaller than sphere radius
    const theta = THREE.MathUtils.degToRad(hotspot.position.theta);
    const phi = THREE.MathUtils.degToRad(hotspot.position.phi);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    // Create hotspot sprite
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Draw hotspot icon
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, 2 * Math.PI);
    ctx.fillStyle = hotspot.type === 'navigation' ? '#3b82f6' : '#8b5cf6';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.set(x, y, z);
    sprite.scale.set(30, 30, 1);
    sprite.userData = { hotspot };
    
    sceneRef.current.add(sprite);
  };
  
  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    // Auto-rotate if playing and no gyro
    if (isPlaying && !gyroEnabled) {
      if (cameraRef.current) {
        cameraRef.current.rotation.y += 0.001;
      }
    }
    
    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // Continue loop
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (sphereRef.current) {
      sphereRef.current.geometry.dispose();
      (sphereRef.current.material as THREE.Material).dispose();
    }
    
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
  };
  
  // ==================== HANDLERS ====================
  
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseDownRef.current || !cameraRef.current || gyroEnabled) return;
    
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    
    cameraRef.current.rotation.y += deltaX * 0.002;
    cameraRef.current.rotation.x += deltaY * 0.002;
    
    // Limit vertical rotation
    cameraRef.current.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, cameraRef.current.rotation.x)
    );
    
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseUp = () => {
    mouseDownRef.current = false;
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    
    const newZoom = zoom + (e.deltaY > 0 ? 5 : -5);
    const clampedZoom = Math.max(40, Math.min(100, newZoom));
    
    setZoom(clampedZoom);
    cameraRef.current.fov = clampedZoom;
    cameraRef.current.updateProjectionMatrix();
  };
  
  const handleSceneChange = (sceneId: string) => {
    setCurrentSceneId(sceneId);
    setShowSceneSelector(false);
    setSelectedHotspot(null);
  };
  
  const handleNextScene = () => {
    const currentIndex = tour.scenes.findIndex(s => s.id === currentSceneId);
    const nextIndex = (currentIndex + 1) % tour.scenes.length;
    handleSceneChange(tour.scenes[nextIndex].id);
  };
  
  const handlePrevScene = () => {
    const currentIndex = tour.scenes.findIndex(s => s.id === currentSceneId);
    const prevIndex = (currentIndex - 1 + tour.scenes.length) % tour.scenes.length;
    handleSceneChange(tour.scenes[prevIndex].id);
  };
  
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  const handleHotspotClick = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    
    if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
      setTimeout(() => {
        handleSceneChange(hotspot.targetSceneId!);
      }, 500);
    }
  };
  
  const handleToggleGyro = async () => {
    if (!gyroEnabled && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setGyroEnabled(true);
        }
      } catch (error) {
        console.error('Error requesting gyroscope permission:', error);
      }
    } else {
      setGyroEnabled(!gyroEnabled);
    }
  };
  
  // ==================== RENDER ====================
  
  return (
    <div ref={containerRef} className="fixed inset-0 bg-black">
      {/* 360 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="absolute inset-0 w-full h-full cursor-move"
      />
      
      {/* Audio */}
      {currentScene.audioNarrationUrl && (
        <audio ref={audioRef} src={currentScene.audioNarrationUrl} />
      )}
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
            <p className="text-white font-medium">Cargando escena...</p>
          </div>
        </div>
      )}
      
      {/* UI Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
              <h2 className="text-white font-bold text-lg">{tour.name}</h2>
              <p className="text-white/80 text-sm">{currentScene.name}</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="bg-black/70 backdrop-blur-sm rounded-lg p-2 hover:bg-black/90 transition-colors"
              >
                <Info className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={handleToggleGyro}
                className={`backdrop-blur-sm rounded-lg p-2 transition-colors ${
                  gyroEnabled ? 'bg-blue-600' : 'bg-black/70 hover:bg-black/90'
                }`}
              >
                <Compass className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={handleToggleFullscreen}
                className="bg-black/70 backdrop-blur-sm rounded-lg p-2 hover:bg-black/90 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-6 h-6 text-white" /> : <Maximize2 className="w-6 h-6 text-white" />}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="bg-red-600 rounded-lg p-2 hover:bg-red-700 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              )}
            </div>
          </div>
          
          {/* Info Panel */}
          {showInfo && (
            <div className="absolute top-20 left-4 right-4 md:left-auto md:w-96 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-lg">Información</h3>
                <button onClick={() => setShowInfo(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-white/90 mb-4">{currentScene.description}</p>
              {currentScene.poi && (
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">POI:</span> {currentScene.poi.name}</p>
                  <p><span className="font-medium">Categoría:</span> {currentScene.poi.category}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Hotspot Info */}
          {selectedHotspot && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 max-w-md">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-gray-900">{selectedHotspot.title}</h3>
                <button onClick={() => setSelectedHotspot(null)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {selectedHotspot.description && (
                <p className="text-sm text-gray-700">{selectedHotspot.description}</p>
              )}
            </div>
          )}
          
          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded-lg p-2">
            <button
              onClick={handlePrevScene}
              className="p-2 hover:bg-white/20 rounded transition-colors"
            >
              <SkipBack className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 hover:bg-white/20 rounded transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
            </button>
            
            <button
              onClick={handleNextScene}
              className="p-2 hover:bg-white/20 rounded transition-colors"
            >
              <SkipForward className="w-5 h-5 text-white" />
            </button>
            
            <div className="w-px h-6 bg-white/30 mx-2"></div>
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 hover:bg-white/20 rounded transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>
            
            <button
              onClick={() => setShowHotspots(!showHotspots)}
              className={`p-2 rounded transition-colors ${showHotspots ? 'bg-blue-600' : 'hover:bg-white/20'}`}
            >
              <Eye className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={() => setShowSceneSelector(!showSceneSelector)}
              className="p-2 hover:bg-white/20 rounded transition-colors"
            >
              <Map className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Scene Selector */}
          {showSceneSelector && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-4 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">Escenas del Tour</h3>
                <button onClick={() => setShowSceneSelector(false)}>
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {tour.scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    onClick={() => handleSceneChange(scene.id)}
                    className={`relative rounded-lg overflow-hidden transition-all ${
                      scene.id === currentSceneId ? 'ring-4 ring-blue-500' : 'hover:ring-2 ring-white/50'
                    }`}
                  >
                    <img
                      src={scene.thumbnailUrl || scene.imageUrl}
                      alt={scene.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                      <div className="text-white text-xs font-medium">{scene.name}</div>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/70 rounded-full px-2 py-0.5 text-white text-xs font-bold">
                      {index + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Zoom Controls */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
            <button
              onClick={() => {
                const newZoom = Math.max(40, zoom - 10);
                setZoom(newZoom);
                if (cameraRef.current) {
                  cameraRef.current.fov = newZoom;
                  cameraRef.current.updateProjectionMatrix();
                }
              }}
              className="bg-black/70 backdrop-blur-sm rounded-lg p-2 hover:bg-black/90 transition-colors"
            >
              <ZoomIn className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => {
                const newZoom = Math.min(100, zoom + 10);
                setZoom(newZoom);
                if (cameraRef.current) {
                  cameraRef.current.fov = newZoom;
                  cameraRef.current.updateProjectionMatrix();
                }
              }}
              className="bg-black/70 backdrop-blur-sm rounded-lg p-2 hover:bg-black/90 transition-colors"
            >
              <ZoomOut className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Virtual360Tour;
