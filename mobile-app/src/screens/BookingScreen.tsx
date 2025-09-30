import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { authStore } from '../stores/authStore';

interface Tour {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string;
  images: string[];
  duration: string;
  max_participants: number;
  includes: string[];
  excludes: string[];
  cancellation_policy: string;
  accessibility_features: string[];
  sustainability_score: number;
  provider: {
    id: string;
    name: string;
    rating: number;
    verified: boolean;
  };
}

interface BookingData {
  tour_id: string;
  date: string;
  time: string;
  participants: number;
  special_requests: string;
  accessibility_needs: string;
  contact_info: {
    name: string;
    email: string;
    phone: string;
  };
  payment_method: string;
  promotional_code?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  name: string;
  last_four?: string;
  icon: string;
}

interface PromotionalCode {
  code: string;
  discount_percentage: number;
  discount_amount: number;
  valid: boolean;
  message: string;
}

const BookingScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { tourId } = route.params;
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [bookingData, setBookingData] = useState<BookingData>({
    tour_id: tourId,
    date: '',
    time: '',
    participants: 1,
    special_requests: '',
    accessibility_needs: '',
    contact_info: {
      name: authStore.user?.name || '',
      email: authStore.user?.email || '',
      phone: authStore.user?.phone || ''
    },
    payment_method: '',
    promotional_code: ''
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [promotionalCode, setPromotionalCode] = useState<PromotionalCode | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    loadTourDetails();
    loadPaymentMethods();
    loadAvailableDates();
  }, []);

  const loadTourDetails = async () => {
    try {
      const response = await apiService.get(`/tours/${tourId}`);
      setTour(response.data);
    } catch (error) {
      console.error('Error loading tour details:', error);
      Alert.alert('Error', 'Failed to load tour details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await apiService.get('/payment/methods');
      setPaymentMethods(response.data);
      if (response.data.length > 0) {
        setSelectedPaymentMethod(response.data[0]);
        setBookingData(prev => ({ ...prev, payment_method: response.data[0].id }));
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const loadAvailableDates = async () => {
    try {
      const response = await apiService.get(`/tours/${tourId}/availability`);
      setAvailableDates(response.data.dates);
    } catch (error) {
      console.error('Error loading available dates:', error);
    }
  };

  const loadAvailableTimes = async (date: string) => {
    try {
      const response = await apiService.get(`/tours/${tourId}/availability?date=${date}`);
      setAvailableTimes(response.data.times);
    } catch (error) {
      console.error('Error loading available times:', error);
    }
  };

  const validatePromotionalCode = async (code: string) => {
    if (!code.trim()) {
      setPromotionalCode(null);
      return;
    }

    try {
      const response = await apiService.post('/payment/validate-promo', {
        code: code.trim(),
        tour_id: tourId,
        amount: calculateTotal()
      });
      
      setPromotionalCode(response.data);
    } catch (error) {
      setPromotionalCode({
        code: code,
        discount_percentage: 0,
        discount_amount: 0,
        valid: false,
        message: 'Invalid promotional code'
      });
    }
  };

  const calculateSubtotal = () => {
    return tour ? tour.price * bookingData.participants : 0;
  };

  const calculateDiscount = () => {
    if (!promotionalCode?.valid) return 0;
    
    const subtotal = calculateSubtotal();
    if (promotionalCode.discount_percentage > 0) {
      return subtotal * (promotionalCode.discount_percentage / 100);
    }
    return Math.min(promotionalCode.discount_amount, subtotal);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const validateBookingData = (): boolean => {
    if (!bookingData.date) {
      Alert.alert('Missing Information', 'Please select a date');
      return false;
    }
    if (!bookingData.time) {
      Alert.alert('Missing Information', 'Please select a time');
      return false;
    }
    if (!bookingData.contact_info.name.trim()) {
      Alert.alert('Missing Information', 'Please enter your name');
      return false;
    }
    if (!bookingData.contact_info.email.trim()) {
      Alert.alert('Missing Information', 'Please enter your email');
      return false;
    }
    if (!bookingData.payment_method) {
      Alert.alert('Missing Information', 'Please select a payment method');
      return false;
    }
    if (bookingData.participants > (tour?.max_participants || 0)) {
      Alert.alert('Invalid Number', `Maximum ${tour?.max_participants} participants allowed`);
      return false;
    }
    return true;
  };

  const processBooking = async () => {
    if (!validateBookingData()) return;

    setBookingLoading(true);
    try {
      const response = await apiService.post('/bookings', {
        ...bookingData,
        total_amount: calculateTotal(),
        promotional_code: promotionalCode?.valid ? promotionalCode.code : undefined
      });

      Alert.alert(
        'Booking Confirmed!',
        `Your booking has been confirmed. Booking ID: ${response.data.id}`,
        [
          {
            text: 'View Booking',
            onPress: () => navigation.navigate('BookingDetails', { bookingId: response.data.id })
          },
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home')
          }
        ]
      );
    } catch (error: any) {
      console.error('Booking error:', error);
      Alert.alert(
        'Booking Failed',
        error.response?.data?.message || 'Failed to process booking. Please try again.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const PaymentMethodsModal = () => (
    <Modal visible={showPaymentMethods} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPaymentMethods(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Payment Methods</Text>
          <TouchableOpacity>
            <Text style={styles.addPaymentButton}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.paymentMethodsList}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethodCard,
                selectedPaymentMethod?.id === method.id && styles.selectedPaymentMethod
              ]}
              onPress={() => {
                setSelectedPaymentMethod(method);
                setBookingData(prev => ({ ...prev, payment_method: method.id }));
                setShowPaymentMethods(false);
              }}
            >
              <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>{method.name}</Text>
                {method.last_four && (
                  <Text style={styles.paymentMethodDetails}>**** {method.last_four}</Text>
                )}
              </View>
              {selectedPaymentMethod?.id === method.id && (
                <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading tour details...</Text>
      </View>
    );
  }

  if (!tour) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Tour Not Found</Text>
        <Text style={styles.errorText}>The requested tour could not be found.</Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tour Summary */}
        <View style={styles.tourSummary}>
          <Image source={{ uri: tour.images[0] }} style={styles.tourImage} />
          <View style={styles.tourInfo}>
            <Text style={styles.tourTitle}>{tour.title}</Text>
            <Text style={styles.tourLocation}>📍 {tour.location}</Text>
            <Text style={styles.tourDuration}>⏱️ {tour.duration}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.tourPrice}>{tour.currency} {tour.price}</Text>
              <Text style={styles.priceLabel}>per person</Text>
            </View>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          
          {/* Date Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Select Date *</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={bookingData.date ? styles.dateText : styles.placeholderText}>
                {bookingData.date || 'Choose a date'}
              </Text>
              <Ionicons name="calendar" size={20} color="#007AFF" />
            </TouchableOpacity>
            
            {/* Simple date picker - replace with proper date picker */}
            {showDatePicker && (
              <View style={styles.datePicker}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availableDates.map(date => (
                    <TouchableOpacity
                      key={date}
                      style={[
                        styles.dateOption,
                        bookingData.date === date && styles.selectedDate
                      ]}
                      onPress={() => {
                        setBookingData(prev => ({ ...prev, date, time: '' }));
                        loadAvailableTimes(date);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.dateOptionText,
                        bookingData.date === date && styles.selectedDateText
                      ]}>
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Time Selection */}
          {availableTimes.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Time *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {availableTimes.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeOption,
                      bookingData.time === time && styles.selectedTime
                    ]}
                    onPress={() => setBookingData(prev => ({ ...prev, time }))}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      bookingData.time === time && styles.selectedTimeText
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Participants */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of Participants</Text>
            <View style={styles.participantsContainer}>
              <TouchableOpacity
                style={styles.participantsButton}
                onPress={() => setBookingData(prev => ({ 
                  ...prev, 
                  participants: Math.max(1, prev.participants - 1) 
                }))}
                disabled={bookingData.participants <= 1}
              >
                <Ionicons 
                  name="remove" 
                  size={20} 
                  color={bookingData.participants <= 1 ? "#CCC" : "#007AFF"} 
                />
              </TouchableOpacity>
              <Text style={styles.participantsCount}>{bookingData.participants}</Text>
              <TouchableOpacity
                style={styles.participantsButton}
                onPress={() => setBookingData(prev => ({ 
                  ...prev, 
                  participants: Math.min(tour.max_participants, prev.participants + 1) 
                }))}
                disabled={bookingData.participants >= tour.max_participants}
              >
                <Ionicons 
                  name="add" 
                  size={20} 
                  color={bookingData.participants >= tour.max_participants ? "#CCC" : "#007AFF"} 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.maxParticipantsText}>
              Maximum {tour.max_participants} participants
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your full name"
              value={bookingData.contact_info.name}
              onChangeText={(text) => setBookingData(prev => ({
                ...prev,
                contact_info: { ...prev.contact_info, name: text }
              }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your email"
              value={bookingData.contact_info.email}
              onChangeText={(text) => setBookingData(prev => ({
                ...prev,
                contact_info: { ...prev.contact_info, email: text }
              }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your phone number"
              value={bookingData.contact_info.phone}
              onChangeText={(text) => setBookingData(prev => ({
                ...prev,
                contact_info: { ...prev.contact_info, phone: text }
              }))}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Special Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Requests</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Requests (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Any special requests or requirements..."
              value={bookingData.special_requests}
              onChangeText={(text) => setBookingData(prev => ({ ...prev, special_requests: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {tour.accessibility_features.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Accessibility Needs (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Please describe any accessibility requirements..."
                value={bookingData.accessibility_needs}
                onChangeText={(text) => setBookingData(prev => ({ ...prev, accessibility_needs: text }))}
                multiline
                numberOfLines={3}
              />
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity
            style={styles.paymentMethodSelector}
            onPress={() => setShowPaymentMethods(true)}
          >
            {selectedPaymentMethod ? (
              <>
                <Text style={styles.paymentIcon}>{selectedPaymentMethod.icon}</Text>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentName}>{selectedPaymentMethod.name}</Text>
                  {selectedPaymentMethod.last_four && (
                    <Text style={styles.paymentDetails}>**** {selectedPaymentMethod.last_four}</Text>
                  )}
                </View>
              </>
            ) : (
              <Text style={styles.selectPaymentText}>Select payment method</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Promotional Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Promotional Code (Optional)</Text>
            <View style={styles.promoCodeContainer}>
              <TextInput
                style={[styles.textInput, styles.promoCodeInput]}
                placeholder="Enter promo code"
                value={bookingData.promotional_code}
                onChangeText={(text) => {
                  setBookingData(prev => ({ ...prev, promotional_code: text }));
                  validatePromotionalCode(text);
                }}
                autoCapitalize="characters"
              />
              {promotionalCode && (
                <View style={[
                  styles.promoStatus,
                  promotionalCode.valid ? styles.validPromo : styles.invalidPromo
                ]}>
                  <Ionicons 
                    name={promotionalCode.valid ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={promotionalCode.valid ? "#4CAF50" : "#FF6B6B"} 
                  />
                </View>
              )}
            </View>
            {promotionalCode && !promotionalCode.valid && (
              <Text style={styles.promoError}>{promotionalCode.message}</Text>
            )}
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {tour.currency} {tour.price} × {bookingData.participants} participants
              </Text>
              <Text style={styles.priceValue}>
                {tour.currency} {calculateSubtotal().toFixed(2)}
              </Text>
            </View>
            
            {promotionalCode?.valid && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.discountLabel]}>
                  Discount ({promotionalCode.code})
                </Text>
                <Text style={[styles.priceValue, styles.discountValue]}>
                  -{tour.currency} {calculateDiscount().toFixed(2)}
                </Text>
              </View>
            )}
            
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {tour.currency} {calculateTotal().toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bookingFooter}>
        <TouchableOpacity
          style={[styles.bookButton, bookingLoading && styles.bookButtonDisabled]}
          onPress={processBooking}
          disabled={bookingLoading}
        >
          {bookingLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Text style={styles.bookButtonText}>Book Now</Text>
              <Text style={styles.bookButtonSubtext}>
                {tour.currency} {calculateTotal().toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <PaymentMethodsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  content: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24
  },
  goBackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  goBackText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  tourSummary: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  tourImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover'
  },
  tourInfo: {
    padding: 16
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  tourLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  tourDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  tourPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF'
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F8F9FA'
  },
  dateText: {
    fontSize: 16,
    color: '#333'
  },
  placeholderText: {
    fontSize: 16,
    color: '#999'
  },
  datePicker: {
    marginTop: 8,
    paddingVertical: 8
  },
  dateOption: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8
  },
  selectedDate: {
    backgroundColor: '#007AFF'
  },
  dateOptionText: {
    fontSize: 14,
    color: '#333'
  },
  selectedDateText: {
    color: 'white'
  },
  timeOption: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8
  },
  selectedTime: {
    backgroundColor: '#007AFF'
  },
  timeOptionText: {
    fontSize: 14,
    color: '#333'
  },
  selectedTimeText: {
    color: 'white'
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    padding: 12
  },
  participantsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  participantsCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 20
  },
  maxParticipantsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8
  },
  paymentMethodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    padding: 16
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 12
  },
  paymentInfo: {
    flex: 1
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  paymentDetails: {
    fontSize: 14,
    color: '#666'
  },
  selectPaymentText: {
    flex: 1,
    fontSize: 16,
    color: '#999'
  },
  promoCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  promoCodeInput: {
    flex: 1,
    marginRight: 8
  },
  promoStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  validPromo: {
    backgroundColor: '#E8F5E8'
  },
  invalidPromo: {
    backgroundColor: '#FFEBEE'
  },
  promoError: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4
  },
  priceBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 16
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  priceLabel: {
    fontSize: 14,
    color: '#666'
  },
  priceValue: {
    fontSize: 14,
    color: '#333'
  },
  discountLabel: {
    color: '#4CAF50'
  },
  discountValue: {
    color: '#4CAF50'
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 12,
    marginTop: 8
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF'
  },
  bookingFooter: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5'
  },
  bookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  bookButtonDisabled: {
    backgroundColor: '#CCC'
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8
  },
  bookButtonSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  addPaymentButton: {
    fontSize: 16,
    color: '#007AFF'
  },
  paymentMethodsList: {
    flex: 1,
    padding: 16
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedPaymentMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF'
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12
  },
  paymentMethodInfo: {
    flex: 1
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  paymentMethodDetails: {
    fontSize: 14,
    color: '#666'
  }
});

export default BookingScreen;