/**
 * Religious Perspective Selector Component
 * Allows users to select and change their religious/cultural perspective at any time
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Alert,
  Switch,
  Animated,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

interface PerspectiveOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  subtext: string;
}

const PERSPECTIVES: PerspectiveOption[] = [
  {
    id: 'catholic',
    name: 'Catholic',
    description: 'View through Catholic tradition and teachings',
    icon: '✝️',
    color: '#8B4513',
    subtext: 'Saints, Sacraments, Church History'
  },
  {
    id: 'protestant',
    name: 'Protestant/Evangelical',
    description: 'Biblical perspective with evangelical focus',
    icon: '📖',
    color: '#4169E1',
    subtext: 'Scripture, Personal Faith, Grace'
  },
  {
    id: 'orthodox',
    name: 'Orthodox Christian',
    description: 'Eastern Orthodox traditions and mysticism',
    icon: '☦️',
    color: '#DAA520',
    subtext: 'Icons, Liturgy, Ancient Traditions'
  },
  {
    id: 'jewish',
    name: 'Jewish',
    description: 'Jewish heritage and Torah perspective',
    icon: '✡️',
    color: '#000080',
    subtext: 'Torah, Talmud, Jewish History'
  },
  {
    id: 'islamic',
    name: 'Islamic',
    description: 'Islamic faith and Quranic guidance',
    icon: '☪️',
    color: '#006400',
    subtext: 'Quran, Prophet Muhammad, Five Pillars'
  },
  {
    id: 'hindu',
    name: 'Hindu',
    description: 'Hindu dharma and spiritual wisdom',
    icon: '🕉️',
    color: '#FF6347',
    subtext: 'Vedas, Karma, Dharma'
  },
  {
    id: 'buddhist',
    name: 'Buddhist',
    description: 'Buddhist teachings and mindfulness',
    icon: '☸️',
    color: '#FFD700',
    subtext: 'Four Noble Truths, Enlightenment'
  },
  {
    id: 'neutral',
    name: 'Neutral/Historical',
    description: 'Objective historical and cultural facts',
    icon: '🏛️',
    color: '#708090',
    subtext: 'History, Culture, Architecture'
  },
  {
    id: 'academic',
    name: 'Academic/Scholarly',
    description: 'Research-based scholarly perspective',
    icon: '🎓',
    color: '#2F4F4F',
    subtext: 'Research, Archaeology, Analysis'
  },
  {
    id: 'spiritual',
    name: 'General Spiritual',
    description: 'Universal spiritual themes',
    icon: '✨',
    color: '#9370DB',
    subtext: 'Universal Wisdom, Energy, Connection'
  }
];

interface PerspectiveSelectorProps {
  currentPerspective: string;
  onPerspectiveChange: (perspective: string) => void;
  allowComparison?: boolean;
  showQuickSwitch?: boolean;
}

const PerspectiveSelector: React.FC<PerspectiveSelectorProps> = ({
  currentPerspective,
  onPerspectiveChange,
  allowComparison = true,
  showQuickSwitch = true
}) => {
  const { t, i18n } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPerspective, setSelectedPerspective] = useState(currentPerspective);
  const [secondaryPerspective, setSecondaryPerspective] = useState<string | null>(null);
  const [enableComparison, setEnableComparison] = useState(false);
  const [recentPerspectives, setRecentPerspectives] = useState<string[]>([]);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadRecentPerspectives();
  }, []);

  useEffect(() => {
    // Animate perspective change
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  }, [currentPerspective]);

  const loadRecentPerspectives = async () => {
    try {
      const recent = await AsyncStorage.getItem('recentPerspectives');
      if (recent) {
        setRecentPerspectives(JSON.parse(recent));
      }
    } catch (error) {
      console.error('Error loading recent perspectives:', error);
    }
  };

  const saveRecentPerspective = async (perspective: string) => {
    try {
      let recent = [...recentPerspectives];
      recent = recent.filter(p => p !== perspective);
      recent.unshift(perspective);
      recent = recent.slice(0, 3); // Keep only 3 most recent
      
      setRecentPerspectives(recent);
      await AsyncStorage.setItem('recentPerspectives', JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving recent perspective:', error);
    }
  };

  const handlePerspectiveSelect = (perspectiveId: string) => {
    if (enableComparison && selectedPerspective === perspectiveId) {
      // Selecting as secondary for comparison
      setSecondaryPerspective(perspectiveId);
      return;
    }

    Alert.alert(
      t('perspective.changeTitle'),
      t('perspective.changeConfirm', {
        from: PERSPECTIVES.find(p => p.id === currentPerspective)?.name,
        to: PERSPECTIVES.find(p => p.id === perspectiveId)?.name
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setSelectedPerspective(perspectiveId);
            await saveRecentPerspective(perspectiveId);
            onPerspectiveChange(perspectiveId);
            setIsModalVisible(false);
            
            // Show success message
            Alert.alert(
              t('perspective.changed'),
              t('perspective.changedMessage', {
                perspective: PERSPECTIVES.find(p => p.id === perspectiveId)?.name
              })
            );
          }
        }
      ]
    );
  };

  const getCurrentPerspectiveInfo = () => {
    return PERSPECTIVES.find(p => p.id === currentPerspective) || PERSPECTIVES[7]; // Default to neutral
  };

  const renderQuickSwitchButtons = () => {
    if (!showQuickSwitch || recentPerspectives.length === 0) return null;

    return (
      <View style={styles.quickSwitchContainer}>
        <Text style={styles.quickSwitchTitle}>{t('perspective.quickSwitch')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentPerspectives.map(perspId => {
            const persp = PERSPECTIVES.find(p => p.id === perspId);
            if (!persp || persp.id === currentPerspective) return null;

            return (
              <TouchableOpacity
                key={perspId}
                style={[styles.quickSwitchButton, { borderColor: persp.color }]}
                onPress={() => handlePerspectiveSelect(perspId)}
              >
                <Text style={styles.quickSwitchIcon}>{persp.icon}</Text>
                <Text style={styles.quickSwitchText}>{persp.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderPerspectiveOption = (perspective: PerspectiveOption) => {
    const isSelected = selectedPerspective === perspective.id;
    const isSecondary = secondaryPerspective === perspective.id;
    const isCurrent = currentPerspective === perspective.id;

    return (
      <TouchableOpacity
        key={perspective.id}
        style={[
          styles.perspectiveOption,
          isSelected && styles.selectedOption,
          isSecondary && styles.secondaryOption,
          isCurrent && styles.currentOption
        ]}
        onPress={() => handlePerspectiveSelect(perspective.id)}
        activeOpacity={0.8}
      >
        <View style={styles.optionContent}>
          <View style={[styles.iconContainer, { backgroundColor: perspective.color + '20' }]}>
            <Text style={styles.optionIcon}>{perspective.icon}</Text>
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.optionName, isSelected && styles.selectedText]}>
                {t(`perspectives.${perspective.id}.name`, perspective.name)}
              </Text>
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>{t('perspective.current')}</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.optionDescription}>
              {t(`perspectives.${perspective.id}.description`, perspective.description)}
            </Text>
            
            <Text style={[styles.optionSubtext, { color: perspective.color }]}>
              {t(`perspectives.${perspective.id}.subtext`, perspective.subtext)}
            </Text>
          </View>

          {isSelected && (
            <Icon name="check-circle" size={24} color="#4CAF50" style={styles.checkIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const currentInfo = getCurrentPerspectiveInfo();

  return (
    <>
      {/* Main Perspective Display */}
      <Animated.View style={[styles.currentPerspectiveBar, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.perspectiveButton}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.miniIconContainer, { backgroundColor: currentInfo.color + '30' }]}>
            <Text style={styles.miniIcon}>{currentInfo.icon}</Text>
          </View>
          
          <View style={styles.perspectiveInfo}>
            <Text style={styles.perspectiveLabel}>{t('perspective.viewing')}</Text>
            <Text style={[styles.perspectiveName, { color: currentInfo.color }]}>
              {currentInfo.name}
            </Text>
          </View>
          
          <Icon name="arrow-drop-down" size={30} color={currentInfo.color} />
        </TouchableOpacity>

        {enableComparison && secondaryPerspective && (
          <View style={styles.comparisonIndicator}>
            <Text style={styles.comparisonText}>
              {t('perspective.comparing', {
                secondary: PERSPECTIVES.find(p => p.id === secondaryPerspective)?.name
              })}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Quick Switch Buttons */}
      {renderQuickSwitchButtons()}

      {/* Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('perspective.selectTitle')}</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {t('perspective.selectDescription')}
            </Text>

            {/* Comparison Toggle */}
            {allowComparison && (
              <View style={styles.comparisonToggle}>
                <Text style={styles.comparisonToggleText}>
                  {t('perspective.enableComparison')}
                </Text>
                <Switch
                  value={enableComparison}
                  onValueChange={setEnableComparison}
                  trackColor={{ false: '#ccc', true: currentInfo.color }}
                />
              </View>
            )}

            {/* Perspective Options */}
            <ScrollView style={styles.optionsScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.optionsGrid}>
                {PERSPECTIVES.map(renderPerspectiveOption)}
              </View>
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: currentInfo.color }]}
              onPress={() => {
                if (selectedPerspective !== currentPerspective) {
                  handlePerspectiveSelect(selectedPerspective);
                } else {
                  setIsModalVisible(false);
                }
              }}
            >
              <Text style={styles.applyButtonText}>
                {selectedPerspective !== currentPerspective 
                  ? t('perspective.apply') 
                  : t('common.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  currentPerspectiveBar: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  perspectiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  miniIcon: {
    fontSize: 20,
  },
  perspectiveInfo: {
    flex: 1,
  },
  perspectiveLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  perspectiveName: {
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonIndicator: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  comparisonText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  quickSwitchContainer: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickSwitchTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  quickSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  quickSwitchIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  quickSwitchText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  comparisonToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    marginBottom: 16,
  },
  comparisonToggleText: {
    fontSize: 14,
    color: '#333',
  },
  optionsScrollView: {
    maxHeight: height * 0.55,
  },
  optionsGrid: {
    paddingHorizontal: 16,
  },
  perspectiveOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  selectedOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  secondaryOption: {
    borderColor: '#FF9800',
    backgroundColor: '#fff8f0',
  },
  currentOption: {
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionIcon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedText: {
    color: '#4CAF50',
  },
  currentBadge: {
    marginLeft: 8,
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  optionSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 12,
  },
  applyButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PerspectiveSelector;