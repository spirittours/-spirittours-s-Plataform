/**
 * PHASE 3: Mobile Analytics App - Metric Card Component
 * Reusable metric card component for displaying KPIs with trend indicators
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { MetricData } from '../types';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters';
import { useStore } from '../utils/store';

interface MetricCardProps {
  metric: MetricData;
  style?: ViewStyle;
  onPress?: () => void;
  showTrend?: boolean;
  showTarget?: boolean;
  compact?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  style,
  onPress,
  showTrend = true,
  showTarget = true,
  compact = false
}) => {
  const { theme } = useStore();

  // Format the metric value based on its format type
  const formattedValue = useMemo(() => {
    switch (metric.format) {
      case 'currency':
        return formatCurrency(metric.value, metric.unit);
      case 'percentage':
        return formatPercentage(metric.value);
      case 'number':
        return formatNumber(metric.value);
      case 'duration':
        return formatDuration(metric.value);
      default:
        return metric.value.toString();
    }
  }, [metric.value, metric.format, metric.unit]);

  // Format the change value
  const formattedChange = useMemo(() => {
    if (metric.format === 'currency') {
      return formatCurrency(Math.abs(metric.change), metric.unit);
    } else if (metric.format === 'percentage') {
      return formatPercentage(Math.abs(metric.changePercent));
    } else {
      return formatNumber(Math.abs(metric.change));
    }
  }, [metric.change, metric.changePercent, metric.format, metric.unit]);

  // Get trend color
  const trendColor = useMemo(() => {
    switch (metric.trend) {
      case 'up':
        return theme.colors.success;
      case 'down':
        return theme.colors.error;
      case 'stable':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  }, [metric.trend, theme.colors]);

  // Get trend icon
  const trendIcon = useMemo(() => {
    switch (metric.trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'stable':
        return 'remove';
      default:
        return 'help';
    }
  }, [metric.trend]);

  // Calculate target progress
  const targetProgress = useMemo(() => {
    if (!metric.target) return null;
    const progress = (metric.value / metric.target) * 100;
    return Math.min(progress, 100);
  }, [metric.value, metric.target]);

  // Get threshold status
  const thresholdStatus = useMemo(() => {
    if (!metric.threshold) return 'normal';
    
    if (metric.value >= metric.threshold.critical) {
      return 'critical';
    } else if (metric.value >= metric.threshold.warning) {
      return 'warning';
    }
    return 'normal';
  }, [metric.value, metric.threshold]);

  // Get threshold color
  const thresholdColor = useMemo(() => {
    switch (thresholdStatus) {
      case 'critical':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  }, [thresholdStatus, theme.colors]);

  const cardContent = (
    <Card 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.colors.surface,
          borderLeftColor: thresholdColor,
          borderLeftWidth: 4,
        },
        style
      ]}
      elevation={2}
    >
      <Card.Content style={[styles.content, compact && styles.compactContent]}>
        {/* Header */}
        <View style={styles.header}>
          <Text 
            style={[
              styles.title, 
              { color: theme.colors.textSecondary },
              compact && styles.compactTitle
            ]}
            numberOfLines={1}
          >
            {metric.name}
          </Text>
          
          {showTrend && (
            <View style={[styles.trendContainer, { backgroundColor: trendColor + '20' }]}>
              <Ionicons 
                name={trendIcon} 
                size={compact ? 14 : 16} 
                color={trendColor} 
              />
            </View>
          )}
        </View>

        {/* Main Value */}
        <View style={styles.valueContainer}>
          <Text 
            style={[
              styles.value, 
              { color: theme.colors.text },
              compact && styles.compactValue
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formattedValue}
          </Text>
        </View>

        {/* Change Indicator */}
        {showTrend && !compact && (
          <View style={styles.changeContainer}>
            <View style={styles.changeRow}>
              <Ionicons 
                name={metric.change >= 0 ? 'arrow-up' : 'arrow-down'} 
                size={14} 
                color={trendColor} 
              />
              <Text style={[styles.changeText, { color: trendColor }]}>
                {formattedChange} ({formatPercentage(Math.abs(metric.changePercent))})
              </Text>
            </View>
            
            {metric.previousValue !== undefined && (
              <Text style={[styles.previousValue, { color: theme.colors.textSecondary }]}>
                vs {formatValue(metric.previousValue, metric.format, metric.unit)}
              </Text>
            )}
          </View>
        )}

        {/* Target Progress */}
        {showTarget && targetProgress !== null && !compact && (
          <View style={styles.targetContainer}>
            <View style={styles.targetHeader}>
              <Text style={[styles.targetLabel, { color: theme.colors.textSecondary }]}>
                Target Progress
              </Text>
              <Text style={[styles.targetValue, { color: theme.colors.text }]}>
                {Math.round(targetProgress)}%
              </Text>
            </View>
            
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    backgroundColor: targetProgress >= 100 ? theme.colors.success : theme.colors.primary,
                    width: `${targetProgress}%`
                  }
                ]}
              />
            </View>
          </View>
        )}

        {/* Threshold Indicator */}
        {metric.threshold && !compact && (
          <View style={styles.thresholdContainer}>
            <View style={[styles.thresholdDot, { backgroundColor: thresholdColor }]} />
            <Text style={[styles.thresholdText, { color: theme.colors.textSecondary }]}>
              {thresholdStatus.charAt(0).toUpperCase() + thresholdStatus.slice(1)} Range
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

// Helper function to format values
const formatValue = (value: number, format: string, unit?: string): string => {
  switch (format) {
    case 'currency':
      return formatCurrency(value, unit);
    case 'percentage':
      return formatPercentage(value);
    case 'number':
      return formatNumber(value);
    case 'duration':
      return formatDuration(value);
    default:
      return value.toString();
  }
};

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    marginVertical: 4,
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  compactContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactTitle: {
    fontSize: 12,
  },
  trendContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  compactValue: {
    fontSize: 20,
    lineHeight: 24,
  },
  changeContainer: {
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  previousValue: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  targetContainer: {
    marginBottom: 8,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  targetValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thresholdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  thresholdText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default MetricCard;