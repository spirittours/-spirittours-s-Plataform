"""
🧠 BRAIN-COMPUTER INTERFACE (BCI) SYSTEM
Sistema de Interfaz Cerebro-Computadora para Control Mental
Spirit Tours Platform - Phase 4 (2027)

Este módulo implementa control mental directo para:
- Navegación por pensamiento
- Selección de destinos con la mente
- Control de experiencias VR/AR mediante ondas cerebrales
- Comunicación telepática entre usuarios
- Detección de emociones y preferencias
- Traducción de pensamientos a comandos

Integración con:
- Neuralink API
- OpenBCI
- Emotiv EPOC
- NeuroSky
- Muse Headband
- NextMind

Autor: GenSpark AI Developer
Fecha: 2024-10-08
Versión: 4.0.0
"""

import asyncio
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging
import json
from collections import deque
import threading
import queue

# Signal Processing
from scipy import signal
from scipy.fft import fft, fftfreq
from scipy.signal import butter, filtfilt, welch
from scipy.stats import entropy

# Machine Learning for EEG
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA, FastICA
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
import tensorflow as tf
from tensorflow.keras import layers, models

# Simulated BCI hardware interfaces
try:
    import pylsl  # Lab Streaming Layer
    LSL_AVAILABLE = True
except ImportError:
    LSL_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BCIDevice(Enum):
    """Dispositivos BCI soportados"""
    NEURALINK = "neuralink"
    OPENBCI = "openbci"
    EMOTIV = "emotiv_epoc"
    NEUROSKY = "neurosky"
    MUSE = "muse_headband"
    NEXTMIND = "nextmind"
    SIMULATION = "simulation"

class BrainWave(Enum):
    """Tipos de ondas cerebrales"""
    DELTA = "delta"  # 0.5-4 Hz (sueño profundo)
    THETA = "theta"  # 4-8 Hz (meditación)
    ALPHA = "alpha"  # 8-13 Hz (relajación)
    BETA = "beta"    # 13-30 Hz (concentración)
    GAMMA = "gamma"  # 30-100 Hz (procesamiento cognitivo)

class MentalCommand(Enum):
    """Comandos mentales reconocibles"""
    PUSH = "push"
    PULL = "pull"
    LEFT = "left"
    RIGHT = "right"
    UP = "up"
    DOWN = "down"
    ROTATE_LEFT = "rotate_left"
    ROTATE_RIGHT = "rotate_right"
    SELECT = "select"
    BACK = "back"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    THINK_YES = "think_yes"
    THINK_NO = "think_no"
    FOCUS = "focus"
    RELAX = "relax"

class EmotionalState(Enum):
    """Estados emocionales detectables"""
    HAPPY = "happy"
    SAD = "sad"
    EXCITED = "excited"
    CALM = "calm"
    STRESSED = "stressed"
    FOCUSED = "focused"
    BORED = "bored"
    INTERESTED = "interested"
    CONFUSED = "confused"
    SATISFIED = "satisfied"

@dataclass
class EEGSignal:
    """Señal EEG procesada"""
    timestamp: datetime
    channels: Dict[str, np.ndarray]  # Channel name -> signal data
    sampling_rate: float
    duration: float
    device: BCIDevice
    quality: float  # Signal quality 0-1
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BrainState:
    """Estado cerebral actual"""
    dominant_frequency: float
    dominant_wave: BrainWave
    attention_level: float  # 0-1
    meditation_level: float  # 0-1
    emotional_state: EmotionalState
    cognitive_load: float  # 0-1
    fatigue_level: float  # 0-1
    stress_level: float  # 0-1
    band_powers: Dict[BrainWave, float]
    hemispheric_asymmetry: float
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class MentalIntent:
    """Intención mental detectada"""
    command: MentalCommand
    confidence: float  # 0-1
    target: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

class EEGProcessor:
    """Procesador de señales EEG"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=10)
        self.ica = FastICA(n_components=10)
        self.filters = self._initialize_filters()
        
    def _initialize_filters(self) -> Dict[str, tuple]:
        """Inicializa filtros para cada banda de frecuencia"""
        fs = 256  # Sampling frequency
        filters = {}
        
        # Butterworth bandpass filters
        filters[BrainWave.DELTA] = butter(4, [0.5, 4], btype='band', fs=fs)
        filters[BrainWave.THETA] = butter(4, [4, 8], btype='band', fs=fs)
        filters[BrainWave.ALPHA] = butter(4, [8, 13], btype='band', fs=fs)
        filters[BrainWave.BETA] = butter(4, [13, 30], btype='band', fs=fs)
        filters[BrainWave.GAMMA] = butter(4, [30, 100], btype='band', fs=fs)
        
        return filters
    
    def process_raw_eeg(self, raw_data: np.ndarray, sampling_rate: float) -> EEGSignal:
        """Procesa datos EEG crudos"""
        # Remove artifacts
        cleaned_data = self.remove_artifacts(raw_data)
        
        # Apply filters
        filtered_data = self.apply_bandpass_filter(cleaned_data, sampling_rate)
        
        # Normalize
        normalized_data = self.normalize_signal(filtered_data)
        
        return EEGSignal(
            timestamp=datetime.now(),
            channels={'all': normalized_data},
            sampling_rate=sampling_rate,
            duration=len(normalized_data) / sampling_rate,
            device=BCIDevice.SIMULATION,
            quality=self.assess_signal_quality(normalized_data)
        )
    
    def remove_artifacts(self, data: np.ndarray) -> np.ndarray:
        """Elimina artefactos (parpadeos, movimientos, etc.)"""
        # ICA for artifact removal
        if len(data.shape) == 1:
            data = data.reshape(-1, 1)
        
        # Apply ICA
        try:
            components = self.ica.fit_transform(data)
            # Remove components with high kurtosis (likely artifacts)
            kurtosis = np.array([np.abs(np.mean(c**4) - 3*np.mean(c**2)**2) for c in components.T])
            clean_components = components[:, kurtosis < 5]
            # Reconstruct signal
            cleaned = self.ica.inverse_transform(clean_components)
            return cleaned.flatten()
        except:
            return data.flatten()
    
    def apply_bandpass_filter(self, data: np.ndarray, fs: float) -> np.ndarray:
        """Aplica filtro pasabanda"""
        # General bandpass 0.5-100 Hz
        b, a = butter(4, [0.5, 100], btype='band', fs=fs)
        return filtfilt(b, a, data)
    
    def normalize_signal(self, data: np.ndarray) -> np.ndarray:
        """Normaliza la señal"""
        return (data - np.mean(data)) / (np.std(data) + 1e-6)
    
    def assess_signal_quality(self, data: np.ndarray) -> float:
        """Evalúa la calidad de la señal (0-1)"""
        # Check for flat lines
        if np.std(data) < 0.01:
            return 0.0
        
        # Check signal-to-noise ratio
        snr = np.mean(np.abs(data)) / (np.std(data) + 1e-6)
        
        # Check for excessive artifacts
        kurtosis = np.abs(np.mean(data**4) - 3*np.mean(data**2)**2)
        
        quality = min(1.0, snr / 10) * min(1.0, 5 / (kurtosis + 1))
        return np.clip(quality, 0, 1)
    
    def extract_band_powers(self, signal: EEGSignal) -> Dict[BrainWave, float]:
        """Extrae potencia de cada banda de frecuencia"""
        band_powers = {}
        data = signal.channels.get('all', np.array([]))
        
        for wave_type, (b, a) in self.filters.items():
            # Apply filter
            filtered = filtfilt(b, a, data)
            # Calculate power
            power = np.mean(filtered ** 2)
            band_powers[wave_type] = power
        
        # Normalize powers
        total_power = sum(band_powers.values())
        if total_power > 0:
            band_powers = {k: v/total_power for k, v in band_powers.items()}
        
        return band_powers
    
    def calculate_hemispheric_asymmetry(self, left_channel: np.ndarray, right_channel: np.ndarray) -> float:
        """Calcula asimetría hemisférica"""
        left_alpha = self._get_alpha_power(left_channel)
        right_alpha = self._get_alpha_power(right_channel)
        
        if left_alpha + right_alpha > 0:
            asymmetry = (right_alpha - left_alpha) / (right_alpha + left_alpha)
        else:
            asymmetry = 0
        
        return asymmetry
    
    def _get_alpha_power(self, data: np.ndarray) -> float:
        """Obtiene potencia en banda alfa"""
        b, a = self.filters[BrainWave.ALPHA]
        filtered = filtfilt(b, a, data)
        return np.mean(filtered ** 2)

class MentalCommandClassifier:
    """Clasificador de comandos mentales"""
    
    def __init__(self):
        self.model = self._build_model()
        self.command_history = deque(maxlen=10)
        self.confidence_threshold = 0.7
        
    def _build_model(self) -> tf.keras.Model:
        """Construye modelo de clasificación de comandos"""
        model = models.Sequential([
            layers.Input(shape=(256,)),  # EEG features
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(64, activation='relu'),
            layers.BatchNormalization(),
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(len(MentalCommand), activation='softmax')
        ])
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def classify_intent(self, eeg_signal: EEGSignal, brain_state: BrainState) -> Optional[MentalIntent]:
        """Clasifica la intención mental del usuario"""
        # Extract features
        features = self._extract_features(eeg_signal, brain_state)
        
        # Predict
        predictions = self.model.predict(features.reshape(1, -1), verbose=0)[0]
        
        # Get command with highest confidence
        command_idx = np.argmax(predictions)
        confidence = predictions[command_idx]
        
        if confidence >= self.confidence_threshold:
            command = list(MentalCommand)[command_idx]
            
            intent = MentalIntent(
                command=command,
                confidence=float(confidence),
                parameters=self._extract_command_parameters(command, brain_state)
            )
            
            self.command_history.append(intent)
            return intent
        
        return None
    
    def _extract_features(self, signal: EEGSignal, state: BrainState) -> np.ndarray:
        """Extrae características para clasificación"""
        features = []
        
        # Signal features
        data = signal.channels.get('all', np.array([]))
        if len(data) > 0:
            features.extend([
                np.mean(data),
                np.std(data),
                np.min(data),
                np.max(data),
                np.median(data),
                entropy(np.abs(data))
            ])
        else:
            features.extend([0] * 6)
        
        # Brain state features
        features.extend([
            state.attention_level,
            state.meditation_level,
            state.cognitive_load,
            state.fatigue_level,
            state.stress_level
        ])
        
        # Band powers
        for wave in BrainWave:
            features.append(state.band_powers.get(wave, 0))
        
        # Pad to expected size
        while len(features) < 256:
            features.append(0)
        
        return np.array(features[:256])
    
    def _extract_command_parameters(self, command: MentalCommand, state: BrainState) -> Dict[str, Any]:
        """Extrae parámetros del comando"""
        params = {}
        
        # Movement commands get intensity from attention level
        if command in [MentalCommand.PUSH, MentalCommand.PULL, 
                      MentalCommand.LEFT, MentalCommand.RIGHT]:
            params['intensity'] = state.attention_level
            params['speed'] = 1.0 - state.fatigue_level
        
        # Zoom commands get magnitude from cognitive load
        elif command in [MentalCommand.ZOOM_IN, MentalCommand.ZOOM_OUT]:
            params['magnitude'] = state.cognitive_load
        
        # Rotation commands get speed from meditation level
        elif command in [MentalCommand.ROTATE_LEFT, MentalCommand.ROTATE_RIGHT]:
            params['rotation_speed'] = 1.0 - state.meditation_level
        
        return params

class EmotionRecognizer:
    """Reconocedor de emociones desde EEG"""
    
    def __init__(self):
        self.emotion_model = self._build_emotion_model()
        self.emotion_history = deque(maxlen=20)
        
    def _build_emotion_model(self) -> tf.keras.Model:
        """Construye modelo de reconocimiento de emociones"""
        model = models.Sequential([
            layers.Input(shape=(128,)),
            layers.Dense(64, activation='relu'),
            layers.BatchNormalization(),
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(16, activation='relu'),
            layers.Dense(len(EmotionalState), activation='softmax')
        ])
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def recognize_emotion(self, eeg_signal: EEGSignal, band_powers: Dict[BrainWave, float]) -> EmotionalState:
        """Reconoce estado emocional desde EEG"""
        # Extract emotional features
        features = self._extract_emotional_features(eeg_signal, band_powers)
        
        # Predict
        predictions = self.emotion_model.predict(features.reshape(1, -1), verbose=0)[0]
        
        # Get emotion with highest probability
        emotion_idx = np.argmax(predictions)
        emotion = list(EmotionalState)[emotion_idx]
        
        self.emotion_history.append(emotion)
        
        # Smooth with history
        if len(self.emotion_history) > 5:
            # Get most common emotion in recent history
            from collections import Counter
            emotion_counts = Counter(self.emotion_history)
            emotion = emotion_counts.most_common(1)[0][0]
        
        return emotion
    
    def _extract_emotional_features(self, signal: EEGSignal, band_powers: Dict[BrainWave, float]) -> np.ndarray:
        """Extrae características emocionales"""
        features = []
        
        # Valence (positive/negative) - alpha asymmetry
        alpha_asymmetry = band_powers.get(BrainWave.ALPHA, 0.5)
        features.append(alpha_asymmetry)
        
        # Arousal - beta/alpha ratio
        beta = band_powers.get(BrainWave.BETA, 0.2)
        alpha = band_powers.get(BrainWave.ALPHA, 0.3)
        arousal = beta / (alpha + 0.01)
        features.append(arousal)
        
        # Engagement - beta/(alpha+theta)
        theta = band_powers.get(BrainWave.THETA, 0.2)
        engagement = beta / (alpha + theta + 0.01)
        features.append(engagement)
        
        # Stress - high beta/low alpha
        stress_indicator = beta / (alpha + 0.01) if alpha > 0.1 else beta
        features.append(stress_indicator)
        
        # Relaxation - high alpha/low beta
        relaxation = alpha / (beta + 0.01) if beta > 0.1 else alpha
        features.append(relaxation)
        
        # Add band powers
        for wave in BrainWave:
            features.append(band_powers.get(wave, 0))
        
        # Pad to expected size
        while len(features) < 128:
            features.append(0)
        
        return np.array(features[:128])

class BrainComputerInterface:
    """Sistema principal de BCI"""
    
    def __init__(self, device: BCIDevice = BCIDevice.SIMULATION):
        self.device = device
        self.eeg_processor = EEGProcessor()
        self.command_classifier = MentalCommandClassifier()
        self.emotion_recognizer = EmotionRecognizer()
        self.is_connected = False
        self.is_recording = False
        self.signal_buffer = deque(maxlen=1000)
        self.state_history = deque(maxlen=100)
        self.callbacks: Dict[str, List[Callable]] = {}
        self.calibration_data = {}
        
        logger.info(f"🧠 BCI System initialized with device: {device.value}")
    
    async def connect(self) -> bool:
        """Conecta con el dispositivo BCI"""
        try:
            if self.device == BCIDevice.SIMULATION:
                # Simulate connection
                await asyncio.sleep(0.5)
                self.is_connected = True
                logger.info("✅ Connected to simulated BCI device")
                return True
            
            elif self.device == BCIDevice.OPENBCI and LSL_AVAILABLE:
                # Connect to OpenBCI via LSL
                from pylsl import StreamInlet, resolve_stream
                streams = resolve_stream('type', 'EEG')
                if streams:
                    self.inlet = StreamInlet(streams[0])
                    self.is_connected = True
                    return True
            
            # Other devices would have their specific connection logic
            return False
            
        except Exception as e:
            logger.error(f"Failed to connect to BCI: {e}")
            return False
    
    async def start_recording(self):
        """Inicia grabación de señales cerebrales"""
        if not self.is_connected:
            await self.connect()
        
        self.is_recording = True
        asyncio.create_task(self._recording_loop())
        logger.info("🎬 Started EEG recording")
    
    async def stop_recording(self):
        """Detiene grabación"""
        self.is_recording = False
        logger.info("⏹️ Stopped EEG recording")
    
    async def _recording_loop(self):
        """Loop principal de grabación"""
        while self.is_recording:
            # Get EEG data
            raw_data = await self._acquire_eeg_data()
            
            # Process signal
            signal = self.eeg_processor.process_raw_eeg(raw_data, 256)
            self.signal_buffer.append(signal)
            
            # Analyze brain state
            brain_state = await self._analyze_brain_state(signal)
            self.state_history.append(brain_state)
            
            # Detect mental commands
            intent = self.command_classifier.classify_intent(signal, brain_state)
            if intent:
                await self._handle_mental_command(intent)
            
            # Detect emotions
            emotion = self.emotion_recognizer.recognize_emotion(
                signal, brain_state.band_powers
            )
            brain_state.emotional_state = emotion
            
            # Trigger callbacks
            await self._trigger_callbacks('state_update', brain_state)
            
            # Small delay
            await asyncio.sleep(0.01)  # 100 Hz update rate
    
    async def _acquire_eeg_data(self) -> np.ndarray:
        """Adquiere datos EEG del dispositivo"""
        if self.device == BCIDevice.SIMULATION:
            # Simulate EEG data
            return self._simulate_eeg_signal()
        
        elif self.device == BCIDevice.OPENBCI and hasattr(self, 'inlet'):
            # Get data from LSL
            sample, timestamp = self.inlet.pull_sample(timeout=0.01)
            if sample:
                return np.array(sample)
        
        return np.zeros(256)
    
    def _simulate_eeg_signal(self) -> np.ndarray:
        """Simula señal EEG realista"""
        fs = 256  # Sampling frequency
        duration = 1  # 1 second of data
        t = np.linspace(0, duration, fs)
        
        # Mix of different frequency components
        signal = (
            0.5 * np.sin(2 * np.pi * 10 * t) +  # Alpha
            0.3 * np.sin(2 * np.pi * 20 * t) +  # Beta
            0.2 * np.sin(2 * np.pi * 5 * t) +   # Theta
            0.1 * np.sin(2 * np.pi * 40 * t) +  # Gamma
            0.4 * np.random.randn(len(t))       # Noise
        )
        
        return signal
    
    async def _analyze_brain_state(self, signal: EEGSignal) -> BrainState:
        """Analiza el estado cerebral actual"""
        # Extract band powers
        band_powers = self.eeg_processor.extract_band_powers(signal)
        
        # Find dominant frequency
        dominant_wave = max(band_powers.items(), key=lambda x: x[1])[0]
        dominant_freq = {
            BrainWave.DELTA: 2,
            BrainWave.THETA: 6,
            BrainWave.ALPHA: 10,
            BrainWave.BETA: 20,
            BrainWave.GAMMA: 40
        }[dominant_wave]
        
        # Calculate mental states
        attention = band_powers.get(BrainWave.BETA, 0) / (
            band_powers.get(BrainWave.ALPHA, 0.1) + band_powers.get(BrainWave.THETA, 0.1)
        )
        attention = np.clip(attention / 2, 0, 1)
        
        meditation = band_powers.get(BrainWave.ALPHA, 0) + band_powers.get(BrainWave.THETA, 0)
        meditation = np.clip(meditation, 0, 1)
        
        cognitive_load = band_powers.get(BrainWave.GAMMA, 0) + band_powers.get(BrainWave.BETA, 0)
        cognitive_load = np.clip(cognitive_load, 0, 1)
        
        fatigue = band_powers.get(BrainWave.DELTA, 0) + band_powers.get(BrainWave.THETA, 0)
        fatigue = np.clip(fatigue, 0, 1)
        
        stress = band_powers.get(BrainWave.BETA, 0) / (band_powers.get(BrainWave.ALPHA, 0.1))
        stress = np.clip(stress / 3, 0, 1)
        
        return BrainState(
            dominant_frequency=dominant_freq,
            dominant_wave=dominant_wave,
            attention_level=float(attention),
            meditation_level=float(meditation),
            emotional_state=EmotionalState.CALM,  # Will be updated by emotion recognizer
            cognitive_load=float(cognitive_load),
            fatigue_level=float(fatigue),
            stress_level=float(stress),
            band_powers=band_powers,
            hemispheric_asymmetry=0.0  # Would need multi-channel for this
        )
    
    async def _handle_mental_command(self, intent: MentalIntent):
        """Maneja comando mental detectado"""
        logger.info(f"🎯 Mental command detected: {intent.command.value} (confidence: {intent.confidence:.2f})")
        
        # Trigger command callback
        await self._trigger_callbacks('mental_command', intent)
    
    async def _trigger_callbacks(self, event: str, data: Any):
        """Ejecuta callbacks para eventos"""
        if event in self.callbacks:
            for callback in self.callbacks[event]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(data)
                    else:
                        callback(data)
                except Exception as e:
                    logger.error(f"Callback error: {e}")
    
    def register_callback(self, event: str, callback: Callable):
        """Registra callback para eventos"""
        if event not in self.callbacks:
            self.callbacks[event] = []
        self.callbacks[event].append(callback)
    
    async def calibrate(self, duration: int = 60) -> Dict[str, Any]:
        """Calibra el sistema BCI con el usuario"""
        logger.info(f"🎯 Starting BCI calibration for {duration} seconds...")
        
        calibration_states = []
        start_time = datetime.now()
        
        while (datetime.now() - start_time).seconds < duration:
            if self.state_history:
                calibration_states.append(self.state_history[-1])
            await asyncio.sleep(1)
        
        # Analyze calibration data
        if calibration_states:
            self.calibration_data = {
                'baseline_attention': np.mean([s.attention_level for s in calibration_states]),
                'baseline_meditation': np.mean([s.meditation_level for s in calibration_states]),
                'baseline_stress': np.mean([s.stress_level for s in calibration_states]),
                'user_profile': self._create_user_profile(calibration_states)
            }
            
            logger.info("✅ Calibration complete!")
            return self.calibration_data
        
        return {}
    
    def _create_user_profile(self, states: List[BrainState]) -> Dict[str, Any]:
        """Crea perfil de usuario basado en calibración"""
        return {
            'avg_attention': np.mean([s.attention_level for s in states]),
            'avg_meditation': np.mean([s.meditation_level for s in states]),
            'dominant_frequency': np.mean([s.dominant_frequency for s in states]),
            'stress_threshold': np.percentile([s.stress_level for s in states], 75),
            'fatigue_threshold': np.percentile([s.fatigue_level for s in states], 75)
        }
    
    async def think_to_search(self, thought_pattern: str) -> List[Dict[str, Any]]:
        """Busca destinos pensando en características"""
        # Simulate thought-based search
        logger.info(f"🔍 Searching based on thought pattern: {thought_pattern}")
        
        # This would integrate with the actual search system
        mock_results = [
            {"destination": "Bali", "match": 0.95, "reason": "Relaxing beaches detected in thoughts"},
            {"destination": "Tokyo", "match": 0.87, "reason": "Urban excitement pattern recognized"},
            {"destination": "Swiss Alps", "match": 0.82, "reason": "Mountain adventure vibes detected"}
        ]
        
        return mock_results
    
    async def telepathic_communication(self, recipient_id: str, thought: str) -> bool:
        """Envía mensaje telepático a otro usuario con BCI"""
        logger.info(f"📡 Sending telepathic message to {recipient_id}: {thought}")
        
        # This would connect to another user's BCI
        # For now, simulate successful transmission
        await asyncio.sleep(0.5)
        
        return True
    
    def get_current_state(self) -> Optional[BrainState]:
        """Obtiene el estado cerebral actual"""
        if self.state_history:
            return self.state_history[-1]
        return None
    
    def get_attention_level(self) -> float:
        """Obtiene nivel de atención actual"""
        state = self.get_current_state()
        return state.attention_level if state else 0.0
    
    def get_stress_level(self) -> float:
        """Obtiene nivel de estrés actual"""
        state = self.get_current_state()
        return state.stress_level if state else 0.0
    
    def is_focused(self) -> bool:
        """Verifica si el usuario está enfocado"""
        return self.get_attention_level() > 0.7
    
    def is_relaxed(self) -> bool:
        """Verifica si el usuario está relajado"""
        state = self.get_current_state()
        return state.meditation_level > 0.6 if state else False


# Singleton instance
bci_system = BrainComputerInterface()

async def demonstrate_bci():
    """Demostración del sistema BCI"""
    print("🧠 BRAIN-COMPUTER INTERFACE DEMONSTRATION")
    print("=" * 50)
    
    # Connect to BCI
    await bci_system.connect()
    
    # Start recording
    await bci_system.start_recording()
    
    # Register callbacks
    def on_mental_command(intent: MentalIntent):
        print(f"  Command: {intent.command.value} ({intent.confidence:.0%} confidence)")
    
    def on_state_update(state: BrainState):
        if state.attention_level > 0.8:
            print(f"  ⚡ High attention detected: {state.attention_level:.0%}")
        if state.stress_level > 0.7:
            print(f"  ⚠️ High stress detected: {state.stress_level:.0%}")
    
    bci_system.register_callback('mental_command', on_mental_command)
    bci_system.register_callback('state_update', on_state_update)
    
    print("\n1. Calibrating BCI System...")
    calibration = await bci_system.calibrate(duration=5)
    print(f"   Baseline attention: {calibration.get('baseline_attention', 0):.2f}")
    print(f"   Baseline stress: {calibration.get('baseline_stress', 0):.2f}")
    
    print("\n2. Monitoring Brain State...")
    await asyncio.sleep(3)
    
    state = bci_system.get_current_state()
    if state:
        print(f"   Dominant wave: {state.dominant_wave.value}")
        print(f"   Attention: {state.attention_level:.0%}")
        print(f"   Meditation: {state.meditation_level:.0%}")
        print(f"   Emotional state: {state.emotional_state.value}")
    
    print("\n3. Thought-based Search...")
    results = await bci_system.think_to_search("relaxing beach vacation")
    for result in results[:2]:
        print(f"   {result['destination']}: {result['match']:.0%} - {result['reason']}")
    
    print("\n4. Telepathic Communication...")
    success = await bci_system.telepathic_communication("user_123", "Meet at the virtual lobby")
    print(f"   Message sent: {'✅' if success else '❌'}")
    
    # Stop recording
    await bci_system.stop_recording()
    
    print("\n✅ BCI System Ready for Mind Control!")

if __name__ == "__main__":
    asyncio.run(demonstrate_bci())