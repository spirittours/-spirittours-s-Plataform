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
  RefreshControl,
  Share,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { authStore } from '../stores/authStore';

interface Ticket {
  id: string;
  booking_id: string;
  qr_code: string;
  barcode: string;
  status: 'valid' | 'used' | 'expired' | 'cancelled';
  issue_date: string;
  valid_until: string;
  tour: {
    id: string;
    title: string;
    description: string;
    location: string;
    image: string;
    duration: string;
    meeting_point: string;
    provider: {
      name: string;
      phone: string;
      email: string;
    };
  };
  booking_details: {
    date: string;
    time: string;
    participants: number;
    total_amount: number;
    currency: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    special_requests?: string;
    accessibility_needs?: string;
  };
  check_in?: {
    timestamp: string;
    location: string;
    staff_member: string;
  };
}

interface TicketFilter {
  status: 'all' | 'valid' | 'used' | 'expired' | 'cancelled';
  dateRange: 'all' | 'upcoming' | 'past' | 'thisMonth';
}

const TicketsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<TicketFilter>({
    status: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, filters]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/user/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Error loading tickets:', error);
      Alert.alert('Error', 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }

    // Filter by date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (filters.dateRange) {
      case 'upcoming':
        filtered = filtered.filter(ticket => 
          new Date(ticket.booking_details.date) >= now
        );
        break;
      case 'past':
        filtered = filtered.filter(ticket => 
          new Date(ticket.booking_details.date) < now
        );
        break;
      case 'thisMonth':
        filtered = filtered.filter(ticket => 
          new Date(ticket.booking_details.date) >= startOfMonth
        );
        break;
    }

    // Sort by date (upcoming first, then by date)
    filtered.sort((a, b) => {
      const dateA = new Date(a.booking_details.date);
      const dateB = new Date(b.booking_details.date);
      return dateA.getTime() - dateB.getTime();
    });

    setFilteredTickets(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return '#4CAF50';
      case 'used':
        return '#2196F3';
      case 'expired':
        return '#FF9800';
      case 'cancelled':
        return '#FF6B6B';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return 'checkmark-circle';
      case 'used':
        return 'checkmark-done-circle';
      case 'expired':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const shareTicket = async (ticket: Ticket) => {
    try {
      const message = `🎫 My ticket for ${ticket.tour.title}\n📍 ${ticket.tour.location}\n📅 ${new Date(ticket.booking_details.date).toLocaleDateString()}\n🕐 ${ticket.booking_details.time}\n\nBooking ID: ${ticket.booking_id}`;
      
      await Share.share({
        message,
        title: 'Tour Ticket'
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const downloadTicket = async (ticket: Ticket) => {
    try {
      Alert.alert(
        'Download Ticket',
        'Choose download format:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'PDF', 
            onPress: async () => {
              const response = await apiService.get(`/tickets/${ticket.id}/download?format=pdf`);
              // Handle PDF download
              console.log('PDF download:', response.data.url);
            }
          },
          { 
            text: 'Wallet Pass', 
            onPress: async () => {
              const response = await apiService.get(`/tickets/${ticket.id}/download?format=wallet`);
              // Handle wallet pass
              if (response.data.url) {
                Linking.openURL(response.data.url);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error downloading ticket:', error);
      Alert.alert('Error', 'Failed to download ticket');
    }
  };

  const cancelTicket = async (ticket: Ticket) => {
    Alert.alert(
      'Cancel Ticket',
      `Are you sure you want to cancel this ticket?\n\nBooking: ${ticket.tour.title}\nDate: ${new Date(ticket.booking_details.date).toLocaleDateString()}`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.post(`/tickets/${ticket.id}/cancel`);
              Alert.alert('Success', 'Ticket cancelled successfully');
              loadTickets();
            } catch (error) {
              console.error('Error cancelling ticket:', error);
              Alert.alert('Error', 'Failed to cancel ticket');
            }
          }
        }
      ]
    );
  };

  const contactProvider = (ticket: Ticket) => {
    Alert.alert(
      'Contact Provider',
      `Get in touch with ${ticket.tour.provider.name}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${ticket.tour.provider.phone}`)
        },
        {
          text: 'Email',
          onPress: () => Linking.openURL(`mailto:${ticket.tour.provider.email}`)
        }
      ]
    );
  };

  const renderTicketCard = (ticket: Ticket) => {
    const isUpcoming = new Date(ticket.booking_details.date) > new Date();
    const isPast = new Date(ticket.booking_details.date) < new Date();
    
    return (
      <TouchableOpacity
        key={ticket.id}
        style={[
          styles.ticketCard,
          ticket.status === 'cancelled' && styles.cancelledTicket
        ]}
        onPress={() => {
          setSelectedTicket(ticket);
          setShowTicketModal(true);
        }}
      >
        <View style={styles.ticketHeader}>
          <Image source={{ uri: ticket.tour.image }} style={styles.ticketImage} />
          <View style={styles.ticketInfo}>
            <Text style={styles.ticketTitle} numberOfLines={2}>
              {ticket.tour.title}
            </Text>
            <Text style={styles.ticketLocation}>📍 {ticket.tour.location}</Text>
            <Text style={styles.ticketDate}>
              📅 {new Date(ticket.booking_details.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
            <Text style={styles.ticketTime}>🕐 {ticket.booking_details.time}</Text>
          </View>
          <View style={styles.ticketStatus}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(ticket.status) }
            ]}>
              <Ionicons 
                name={getStatusIcon(ticket.status) as any} 
                size={16} 
                color="white" 
              />
              <Text style={styles.statusText}>
                {ticket.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ticketBody}>
          <View style={styles.ticketDetails}>
            <Text style={styles.detailLabel}>Participants</Text>
            <Text style={styles.detailValue}>{ticket.booking_details.participants}</Text>
          </View>
          <View style={styles.ticketDetails}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{ticket.tour.duration}</Text>
          </View>
          <View style={styles.ticketDetails}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <Text style={styles.detailValue}>
              {ticket.booking_details.currency} {ticket.booking_details.total_amount}
            </Text>
          </View>
        </View>

        {isUpcoming && ticket.status === 'valid' && (
          <View style={styles.ticketFooter}>
            <Text style={styles.upcomingLabel}>📱 Tap to view QR code</Text>
            <Ionicons name="qr-code" size={20} color="#007AFF" />
          </View>
        )}

        {ticket.check_in && (
          <View style={styles.checkInInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.checkInText}>
              Checked in on {new Date(ticket.check_in.timestamp).toLocaleDateString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const TicketModal = () => {
    if (!selectedTicket) return null;

    return (
      <Modal visible={showTicketModal} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTicketModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ticket Details</Text>
            <TouchableOpacity onPress={() => shareTicket(selectedTicket)}>
              <Ionicons name="share-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* QR Code Section */}
            <View style={styles.qrSection}>
              <Image source={{ uri: selectedTicket.qr_code }} style={styles.qrCode} />
              <Text style={styles.bookingId}>Booking ID: {selectedTicket.booking_id}</Text>
              <Text style={styles.ticketId}>Ticket ID: {selectedTicket.id}</Text>
            </View>

            {/* Tour Information */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Tour Information</Text>
              <Image source={{ uri: selectedTicket.tour.image }} style={styles.modalTourImage} />
              <Text style={styles.modalTourTitle}>{selectedTicket.tour.title}</Text>
              <Text style={styles.modalTourDescription}>
                {selectedTicket.tour.description}
              </Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.infoText}>{selectedTicket.tour.location}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.infoText}>{selectedTicket.tour.duration}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="pin" size={16} color="#666" />
                <Text style={styles.infoText}>
                  Meeting point: {selectedTicket.tour.meeting_point}
                </Text>
              </View>
            </View>

            {/* Booking Details */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Booking Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedTicket.booking_details.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} at {selectedTicket.booking_details.time}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Participants</Text>
                <Text style={styles.detailValue}>{selectedTicket.booking_details.participants}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount</Text>
                <Text style={styles.detailValue}>
                  {selectedTicket.booking_details.currency} {selectedTicket.booking_details.total_amount}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Contact Name</Text>
                <Text style={styles.detailValue}>{selectedTicket.booking_details.contact_name}</Text>
              </View>

              {selectedTicket.booking_details.special_requests && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Special Requests</Text>
                  <Text style={styles.detailValue}>{selectedTicket.booking_details.special_requests}</Text>
                </View>
              )}

              {selectedTicket.booking_details.accessibility_needs && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Accessibility Needs</Text>
                  <Text style={styles.detailValue}>{selectedTicket.booking_details.accessibility_needs}</Text>
                </View>
              )}
            </View>

            {/* Provider Information */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Provider Information</Text>
              
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{selectedTicket.tour.provider.name}</Text>
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={() => contactProvider(selectedTicket)}
                >
                  <Ionicons name="call" size={16} color="#007AFF" />
                  <Text style={styles.contactButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ticket Status */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Ticket Status</Text>
              
              <View style={styles.statusInfo}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(selectedTicket.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(selectedTicket.status) as any} 
                    size={20} 
                    color="white" 
                  />
                </View>
                <View style={styles.statusDetails}>
                  <Text style={styles.statusTitle}>
                    {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}
                  </Text>
                  <Text style={styles.statusDescription}>
                    {selectedTicket.status === 'valid' && 'Your ticket is valid and ready to use'}
                    {selectedTicket.status === 'used' && 'This ticket has been used for check-in'}
                    {selectedTicket.status === 'expired' && 'This ticket has expired'}
                    {selectedTicket.status === 'cancelled' && 'This ticket has been cancelled'}
                  </Text>
                  <Text style={styles.validityText}>
                    Valid until: {new Date(selectedTicket.valid_until).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Check-in Information */}
            {selectedTicket.check_in && (
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Check-in Information</Text>
                <View style={styles.checkInDetails}>
                  <Text style={styles.checkInLabel}>Checked in on:</Text>
                  <Text style={styles.checkInValue}>
                    {new Date(selectedTicket.check_in.timestamp).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <Text style={styles.checkInLabel}>Location:</Text>
                  <Text style={styles.checkInValue}>{selectedTicket.check_in.location}</Text>
                  <Text style={styles.checkInLabel}>Staff member:</Text>
                  <Text style={styles.checkInValue}>{selectedTicket.check_in.staff_member}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => downloadTicket(selectedTicket)}
            >
              <Ionicons name="download-outline" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => shareTicket(selectedTicket)}
            >
              <Ionicons name="share-outline" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            {selectedTicket.status === 'valid' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => cancelTicket(selectedTicket)}
              >
                <Ionicons name="close-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const FilterModal = () => (
    <Modal visible={showFilterModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.filterModalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFilterModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filter Tickets</Text>
          <TouchableOpacity onPress={() => {
            setFilters({ status: 'all', dateRange: 'all' });
            setShowFilterModal(false);
          }}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            {(['all', 'valid', 'used', 'expired', 'cancelled'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterOption,
                  filters.status === status && styles.selectedFilter
                ]}
                onPress={() => setFilters(prev => ({ ...prev, status }))}
              >
                <Text style={[
                  styles.filterOptionText,
                  filters.status === status && styles.selectedFilterText
                ]}>
                  {status === 'all' ? 'All Tickets' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
                {filters.status === status && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            {(['all', 'upcoming', 'past', 'thisMonth'] as const).map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.filterOption,
                  filters.dateRange === range && styles.selectedFilter
                ]}
                onPress={() => setFilters(prev => ({ ...prev, dateRange: range }))}
              >
                <Text style={[
                  styles.filterOptionText,
                  filters.dateRange === range && styles.selectedFilterText
                ]}>
                  {range === 'all' && 'All Dates'}
                  {range === 'upcoming' && 'Upcoming'}
                  {range === 'past' && 'Past'}
                  {range === 'thisMonth' && 'This Month'}
                </Text>
                {filters.dateRange === range && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterFooter}>
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your tickets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color="#007AFF" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Summary */}
      {(filters.status !== 'all' || filters.dateRange !== 'all') && (
        <View style={styles.filterSummary}>
          <Text style={styles.filterSummaryText}>
            Showing {filteredTickets.length} tickets
            {filters.status !== 'all' && ` • ${filters.status}`}
            {filters.dateRange !== 'all' && ` • ${filters.dateRange}`}
          </Text>
          <TouchableOpacity 
            onPress={() => setFilters({ status: 'all', dateRange: 'all' })}
          >
            <Text style={styles.clearFiltersLink}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredTickets.length > 0 ? (
          <View style={styles.ticketsList}>
            {filteredTickets.map(renderTicketCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateTitle}>
              {tickets.length === 0 ? 'No tickets yet' : 'No tickets match your filters'}
            </Text>
            <Text style={styles.emptyStateText}>
              {tickets.length === 0 
                ? 'Book your first tour to see your tickets here'
                : 'Try adjusting your filter criteria'
              }
            </Text>
            {tickets.length === 0 && (
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.exploreButtonText}>Explore Tours</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <TicketModal />
      <FilterModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333'
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  filterButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4
  },
  filterSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  filterSummaryText: {
    fontSize: 14,
    color: '#1976D2'
  },
  clearFiltersLink: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500'
  },
  content: {
    flex: 1
  },
  ticketsList: {
    padding: 16
  },
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden'
  },
  cancelledTicket: {
    opacity: 0.6
  },
  ticketHeader: {
    flexDirection: 'row',
    padding: 16
  },
  ticketImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: 'cover'
  },
  ticketInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  ticketLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  ticketDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  ticketTime: {
    fontSize: 12,
    color: '#666'
  },
  ticketStatus: {
    alignItems: 'flex-end'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden'
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4
  },
  ticketBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  ticketDetails: {
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333'
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5'
  },
  upcomingLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500'
  },
  checkInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  checkInText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 8
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 80
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
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
  modalContent: {
    flex: 1
  },
  qrSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8F9FA'
  },
  qrCode: {
    width: 200,
    height: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16
  },
  bookingId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  ticketId: {
    fontSize: 12,
    color: '#666'
  },
  modalSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  modalTourImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover'
  },
  modalTourTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  modalTourDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  providerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  contactButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  statusDetails: {
    flex: 1
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8
  },
  validityText: {
    fontSize: 12,
    color: '#999'
  },
  checkInDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16
  },
  checkInLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  checkInValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F4',
    paddingVertical: 12,
    borderRadius: 8
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4
  },
  cancelButton: {
    backgroundColor: '#FFEBEE'
  },
  cancelButtonText: {
    color: '#FF6B6B'
  },
  // Filter Modal Styles
  filterModalContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#007AFF'
  },
  filterContent: {
    flex: 1,
    padding: 16
  },
  filterSection: {
    marginBottom: 32
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8
  },
  selectedFilter: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333'
  },
  selectedFilterText: {
    color: '#007AFF',
    fontWeight: '500'
  },
  filterFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5'
  },
  applyFiltersButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  applyFiltersText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default TicketsScreen;