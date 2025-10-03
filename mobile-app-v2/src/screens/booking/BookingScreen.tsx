/**
 * Booking Screen
 * Handles tour booking process
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Button, TextInput, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';
import { bookingAPI } from '../../services/api/bookingAPI';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';

export const BookingScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { tourId } = route.params as { tourId: string };

  const [date, setDate] = useState(new Date());
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleBooking = async () => {
    try {
      setIsLoading(true);
      const booking = await bookingAPI.createBooking({
        tourId,
        tourDate: date.toISOString(),
        adults: parseInt(adults),
        children: parseInt(children),
        specialRequests,
      });

      Alert.alert(
        t('booking.bookingConfirmed'),
        `${t('booking.bookingReference')}: ${booking.id}`,
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.navigate('BookingDetails', { bookingId: booking.id }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LoadingOverlay visible={isLoading} message="Processing booking..." />
      
      <ScrollView style={styles.scroll}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            {t('booking.selectDate')}
          </Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
          >
            {date.toLocaleDateString()}
          </Button>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            {t('booking.adults')}
          </Text>
          <TextInput
            value={adults}
            onChangeText={setAdults}
            keyboardType="number-pad"
            mode="outlined"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            {t('booking.children')}
          </Text>
          <TextInput
            value={children}
            onChangeText={setChildren}
            keyboardType="number-pad"
            mode="outlined"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            Special Requests
          </Text>
          <TextInput
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
            numberOfLines={4}
            mode="outlined"
          />
        </View>

        <Button
          mode="contained"
          onPress={handleBooking}
          style={styles.bookButton}
          contentStyle={styles.bookButtonContent}
        >
          {t('booking.bookNow')}
        </Button>
      </ScrollView>

      <DatePicker
        modal
        open={showDatePicker}
        date={date}
        minimumDate={new Date()}
        onConfirm={(selectedDate) => {
          setShowDatePicker(false);
          setDate(selectedDate);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateButton: {
    marginTop: 8,
  },
  bookButton: {
    marginTop: 20,
    marginBottom: 40,
  },
  bookButtonContent: {
    paddingVertical: 8,
  },
});
