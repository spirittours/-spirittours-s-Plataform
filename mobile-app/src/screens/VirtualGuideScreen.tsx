import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
  FlatList,
  Platform,
  PermissionsAndroid
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Voice from '@react-native-voice/voice';
import Sound from 'react-native-sound';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import io from 'socket.io-client';

// Types
interface Guide {
  id: string;
  name: string;
  personality: string;
  avatar: string;
  language: string;
  voiceStyle: string;
}

interface Location {
  id: string;
  name: string;
  description: string;
  coordinates: { latitude: number; longitude: number };
  images: string[];
  audioUrl?: string;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
}

// Main Virtual Guide Screen
const VirtualGuideScreen: React.FC = ({ navigation, route }) => {
  // State
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentAudioText, setCurrentAudioText] = useState('');
  const [visitedLocations, setVisitedLocations] = useState<string[]>([]);
  const [guidePersonalities, setGuidePersonalities] = useState<Guide[]>([]);
  const [showGuideSelector, setShowGuideSelector] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  
  // Refs
  const mapRef = useRef<MapView>(null);
  const socketRef = useRef<any>(null);
  const soundRef = useRef<Sound | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Available Guide Personalities
  const availableGuides: Guide[] = [
    {
      id: '1',
      name: 'Professor Williams',
      personality: 'professional_formal',
      avatar: require('../assets/guides/professor.png'),
      language: 'en-US',
      voiceStyle: 'formal'
    },
    {
      id: '2',
      name: 'Sarah',
      personality: 'friendly_casual',
      avatar: require('../assets/guides/sarah.png'),
      language: 'en-US',
      voiceStyle: 'friendly'
    },
    {
      id: '3',
      name: 'Mike the Joker',
      personality: 'comedian_funny',
      avatar: require('../assets/guides/mike.png'),
      language: 'en-US',
      voiceStyle: 'playful'
    },
    {
      id: '4',
      name: 'Mama Rosa',
      personality: 'warm_maternal',
      avatar: require('../assets/guides/mama.png'),
      language: 'es-ES',
      voiceStyle: 'caring'
    },
    {
      id: '5',
      name: 'Alex',
      personality: 'cool_youth',
      avatar: require('../assets/guides/alex.png'),
      language: 'en-US',
      voiceStyle: 'trendy'
    },
    {
      id: '6',
      name: 'Giovanni',
      personality: 'storyteller_dramatic',
      avatar: require('../assets/guides/giovanni.png'),
      language: 'it-IT',
      voiceStyle: 'dramatic'
    },
    {
      id: '7',
      name: 'Ahmed',
      personality: 'local_insider',
      avatar: require('../assets/guides/ahmed.png'),
      language: 'ar-SA',
      voiceStyle: 'authentic'
    },
    {
      id: '8',
      name: 'Captain Adventure',
      personality: 'kids_entertainer',
      avatar: require('../assets/guides/captain.png'),
      language: 'en-US',
      voiceStyle: 'animated'
    },
    {
      id: '9',
      name: 'Isabella',
      personality: 'romantic_couples',
      avatar: require('../assets/guides/isabella.png'),
      language: 'fr-FR',
      voiceStyle: 'soft'
    },
    {
      id: '10',
      name: 'Sage',
      personality: 'spiritual_mindful',
      avatar: require('../assets/guides/sage.png'),
      language: 'en-US',
      voiceStyle: 'calm'
    }
  ];
  
  // Initialize
  useEffect(() => {
    initializeApp();
    return () => cleanup();
  }, []);
  
  const initializeApp = async () => {
    // Request permissions
    await requestPermissions();
    
    // Load saved preferences
    const savedGuideId = await AsyncStorage.getItem('selectedGuideId');
    if (savedGuideId) {
      const guide = availableGuides.find(g => g.id === savedGuideId);
      if (guide) setSelectedGuide(guide);
    }
    
    // Initialize location tracking
    startLocationTracking();
    
    // Connect to server
    connectToServer();
    
    // Check network status
    const netInfo = await NetInfo.fetch();
    setOfflineMode(!netInfo.isConnected);
    
    // Initialize voice recognition
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    
    // Start animations
    startPulseAnimation();
  };
  
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        ]);
        console.log('Permissions granted:', granted);
      } catch (err) {
        console.warn(err);
      }
    }
  };
  
  const startLocationTracking = () => {
    // Get initial location
    Geolocation.getCurrentPosition(
      position => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005
        });
      },
      error => console.log('Location error:', error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
    
    // Watch location changes
    watchIdRef.current = Geolocation.watchPosition(
      position => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        setCurrentLocation(prev => ({
          ...prev,
          ...newLocation
        }));
        
        // Send location update to server
        if (socketRef.current) {
          socketRef.current.emit('location_update', {
            location: newLocation,
            speed: position.coords.speed,
            heading: position.coords.heading
          });
        }
        
        // Check proximity to destinations
        checkProximityTriggers(newLocation);
      },
      error => console.log('Watch error:', error),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );
  };
  
  const connectToServer = () => {
    socketRef.current = io('wss://api.spirittours.com', {
      transports: ['websocket'],
      auth: {
        token: route.params?.token
      }
    });
    
    socketRef.current.on('connect', () => {
      console.log('Connected to server');
    });
    
    socketRef.current.on('guide_message', (data: any) => {
      speakText(data.text, data.personality);
    });
    
    socketRef.current.on('navigation_update', (data: any) => {
      setNavigationSteps(data.steps);
      if (data.currentInstruction) {
        speakText(data.currentInstruction);
      }
    });
  };
  
  const checkProximityTriggers = async (location: any) => {
    // Check if near any points of interest
    const response = await fetch('/api/nearby-pois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, radius: 100 })
    });
    
    const pois = await response.json();
    if (pois.length > 0 && selectedGuide) {
      // Trigger automatic explanation for nearby POI
      const poi = pois[0];
      if (!visitedLocations.includes(poi.id)) {
        explainLocation(poi);
        setVisitedLocations(prev => [...prev, poi.id]);
      }
    }
  };
  
  const explainLocation = async (location: Location) => {
    if (!selectedGuide) return;
    
    setIsSpeaking(true);
    
    const response = await fetch('/api/guide/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        guidePersonality: selectedGuide.personality,
        language: selectedGuide.language
      })
    });
    
    const data = await response.json();
    speakText(data.explanation);
  };
  
  const speakText = (text: string, personality?: string) => {
    setCurrentAudioText(text);
    setIsSpeaking(true);
    
    // In production, would use TTS API with personality-specific voice
    // For now, using react-native-tts or similar
    
    // Animate guide avatar while speaking
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    // Simulate speaking duration
    setTimeout(() => {
      setIsSpeaking(false);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    }, text.length * 50); // Rough estimate
  };
  
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };
  
  const startVoiceRecognition = async () => {
    try {
      setIsListening(true);
      await Voice.start(selectedGuide?.language || 'en-US');
    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
    }
  };
  
  const stopVoiceRecognition = async () => {
    try {
      setIsListening(false);
      await Voice.stop();
    } catch (error) {
      console.error('Voice stop error:', error);
    }
  };
  
  const onSpeechResults = (event: any) => {
    if (event.value && event.value[0]) {
      setQuestion(event.value[0]);
      handleQuestion(event.value[0]);
    }
  };
  
  const onSpeechError = (event: any) => {
    console.error('Speech recognition error:', event);
    setIsListening(false);
  };
  
  const handleQuestion = async (questionText: string) => {
    if (!selectedGuide) return;
    
    const response = await fetch('/api/guide/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: questionText,
        guidePersonality: selectedGuide.personality,
        language: selectedGuide.language,
        context: {
          currentLocation,
          visitedLocations
        }
      })
    });
    
    const data = await response.json();
    speakText(data.answer);
  };
  
  const startNavigation = async (destination: Location) => {
    if (!currentLocation || !selectedGuide) return;
    
    setDestination(destination);
    setIsNavigating(true);
    
    const response = await fetch('/api/navigation/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: currentLocation,
        destination: destination.coordinates,
        mode: 'walking',
        guidePersonality: selectedGuide.personality
      })
    });
    
    const data = await response.json();
    setNavigationSteps(data.steps);
    
    // Start with first instruction
    if (data.steps.length > 0) {
      speakText(data.steps[0].instruction);
    }
  };
  
  const stopNavigation = () => {
    setIsNavigating(false);
    setDestination(null);
    setNavigationSteps([]);
  };
  
  const changeGuidePersonality = (guide: Guide) => {
    setSelectedGuide(guide);
    AsyncStorage.setItem('selectedGuideId', guide.id);
    setShowGuideSelector(false);
    
    // Introduce new guide
    speakText(`Hello! I'm ${guide.name}, your new guide. Let's explore together!`);
  };
  
  const cleanup = () => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (soundRef.current) {
      soundRef.current.release();
    }
    Voice.destroy();
  };
  
  // Render Guide Avatar
  const renderGuideAvatar = () => {
    if (!selectedGuide) return null;
    
    return (
      <Animated.View 
        style={[
          styles.guideAvatar,
          {
            transform: [{ scale: isSpeaking ? pulseAnim : 1 }],
            opacity: fadeAnim
          }
        ]}
      >
        <TouchableOpacity onPress={() => setShowGuideSelector(true)}>
          <Image source={selectedGuide.avatar} style={styles.avatarImage} />
          <Text style={styles.guideName}>{selectedGuide.name}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  // Render Navigation Instructions
  const renderNavigationInstructions = () => {
    if (!isNavigating || navigationSteps.length === 0) return null;
    
    const currentStep = navigationSteps[0];
    
    return (
      <View style={styles.navigationContainer}>
        <View style={styles.navigationHeader}>
          <Icon name={getManeuverIcon(currentStep.maneuver)} size={30} color="#4CAF50" />
          <Text style={styles.navigationInstruction}>{currentStep.instruction}</Text>
        </View>
        <View style={styles.navigationDetails}>
          <Text style={styles.navigationDistance}>{currentStep.distance}m</Text>
          <Text style={styles.navigationDuration}>{Math.ceil(currentStep.duration / 60)} min</Text>
        </View>
        <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
          <Icon name="stop" size={20} color="#fff" />
          <Text style={styles.stopButtonText}>Stop Navigation</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render Guide Selector Modal
  const renderGuideSelectorModal = () => (
    <Modal
      visible={showGuideSelector}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowGuideSelector(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose Your Guide</Text>
          <FlatList
            data={availableGuides}
            keyExtractor={item => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.guideOption,
                  selectedGuide?.id === item.id && styles.selectedGuideOption
                ]}
                onPress={() => changeGuidePersonality(item)}
              >
                <Image source={item.avatar} style={styles.guideOptionAvatar} />
                <Text style={styles.guideOptionName}>{item.name}</Text>
                <Text style={styles.guideOptionPersonality}>
                  {item.personality.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowGuideSelector(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  const getManeuverIcon = (maneuver: string): string => {
    const icons: Record<string, string> = {
      'turn-left': 'turn-left',
      'turn-right': 'turn-right',
      'straight': 'arrow-upward',
      'arrival': 'flag'
    };
    return icons[maneuver] || 'navigation';
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      {currentLocation && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={currentLocation}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={isNavigating}
        >
          {/* Current location marker */}
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude
            }}
            title="You are here"
          />
          
          {/* Destination marker */}
          {destination && (
            <Marker
              coordinate={destination.coordinates}
              title={destination.name}
              description={destination.description}
            />
          )}
          
          {/* Navigation route */}
          {isNavigating && navigationSteps.length > 0 && (
            <Polyline
              coordinates={navigationSteps.map(step => ({
                latitude: step.startLocation.latitude,
                longitude: step.startLocation.longitude
              }))}
              strokeColor="#4CAF50"
              strokeWidth={4}
            />
          )}
        </MapView>
      )}
      
      {/* Guide Avatar */}
      {renderGuideAvatar()}
      
      {/* Navigation Instructions */}
      {renderNavigationInstructions()}
      
      {/* Current Audio Text */}
      {isSpeaking && (
        <View style={styles.audioTextContainer}>
          <Text style={styles.audioText}>{currentAudioText}</Text>
        </View>
      )}
      
      {/* Voice Control Button */}
      <TouchableOpacity
        style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
        onPressIn={startVoiceRecognition}
        onPressOut={stopVoiceRecognition}
      >
        <Icon 
          name={isListening ? 'mic' : 'mic-none'} 
          size={30} 
          color="#fff" 
        />
      </TouchableOpacity>
      
      {/* Guide Selector Modal */}
      {renderGuideSelectorModal()}
      
      {/* Offline Mode Indicator */}
      {offlineMode && (
        <View style={styles.offlineIndicator}>
          <Icon name="cloud-off" size={20} color="#fff" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    flex: 1
  },
  guideAvatar: {
    position: 'absolute',
    top: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  guideName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5
  },
  navigationContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  navigationInstruction: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1
  },
  navigationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  navigationDistance: {
    fontSize: 14,
    color: '#666'
  },
  navigationDuration: {
    fontSize: 14,
    color: '#666'
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    borderRadius: 20,
    padding: 10,
    marginTop: 10
  },
  stopButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: 'bold'
  },
  audioTextContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    padding: 15
  },
  audioText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center'
  },
  voiceButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  voiceButtonActive: {
    backgroundColor: '#f44336'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  guideOption: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    margin: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0'
  },
  selectedGuideOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9'
  },
  guideOptionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  guideOptionName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5
  },
  guideOptionPersonality: {
    fontSize: 10,
    color: '#666',
    textTransform: 'capitalize'
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    padding: 15,
    marginTop: 20
  },
  closeButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  offlineIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    borderRadius: 20,
    padding: 10
  },
  offlineText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: 'bold'
  }
});

export default VirtualGuideScreen;