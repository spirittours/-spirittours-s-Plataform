import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchUserBookings } from '../store/slices/bookingsSlice';
import { addToast } from '../store/slices/uiSlice';
import { Card, Button, Badge, Loading, Modal, Input, Pagination } from '../components/UI';
import { Link } from 'react-router-dom';

const AdminBookingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading, pagination } = useSelector((state: RootState) => state.bookings);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('booking_date_desc');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    dispatch(fetchUserBookings({ page: 1, limit: 20 }));
  }, [dispatch]);

  // Filter and sort bookings
  const filteredBookings = bookings
    .filter(booking => {
      // Status filter
      if (filterStatus === 'all') return true;
      return booking.status === filterStatus;
    })
    .filter(booking => {
      // Payment status filter
      if (filterPaymentStatus === 'all') return true;
      return booking.payment_status === filterPaymentStatus;
    })
    .filter(booking => {
      // Search filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        booking.booking_reference.toLowerCase().includes(query) ||
        booking.tour?.title.toLowerCase().includes(query) ||
        (booking as any).user_name?.toLowerCase().includes(query)
      );
    })
    .filter(booking => {
      // Date range filter
      if (!dateRange.start && !dateRange.end) return true;
      const bookingDate = new Date(booking.booking_date);
      if (dateRange.start && bookingDate < new Date(dateRange.start)) return false;
      if (dateRange.end && bookingDate > new Date(dateRange.end)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'booking_date_desc':
          return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
        case 'booking_date_asc':
          return new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
        case 'tour_date_desc':
          return new Date(b.tour_date).getTime() - new Date(a.tour_date).getTime();
        case 'tour_date_asc':
          return new Date(a.tour_date).getTime() - new Date(b.tour_date).getTime();
        case 'amount_desc':
          return b.total_price - a.total_price;
        case 'amount_asc':
          return a.total_price - b.total_price;
        default:
          return 0;
      }
    });

  // Calculate statistics
  const totalRevenue = bookings.reduce((sum, booking) => {
    if (booking.payment_status === 'paid') {
      return sum + booking.total_price;
    }
    return sum;
  }, 0);

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

  // Action handlers
  const handleApproveBooking = async () => {
    if (!selectedBooking) return;
    
    setIsProcessing(true);
    try {
      // TODO: Implement approve booking API call
      dispatch(addToast({
        message: 'Booking approved successfully',
        type: 'success'
      }));
      setShowApproveModal(false);
      setSelectedBooking(null);
      dispatch(fetchUserBookings({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to approve booking',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancellationReason.trim()) {
      dispatch(addToast({
        message: 'Please provide a cancellation reason',
        type: 'warning'
      }));
      return;
    }
    
    setIsProcessing(true);
    try {
      // TODO: Implement cancel booking API call
      dispatch(addToast({
        message: 'Booking cancelled successfully',
        type: 'success'
      }));
      setShowCancelModal(false);
      setSelectedBooking(null);
      setCancellationReason('');
      dispatch(fetchUserBookings({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to cancel booking',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefundBooking = async () => {
    if (!selectedBooking || !refundAmount.trim()) {
      dispatch(addToast({
        message: 'Please provide a refund amount',
        type: 'warning'
      }));
      return;
    }
    
    setIsProcessing(true);
    try {
      // TODO: Implement refund booking API call
      dispatch(addToast({
        message: `Refund of $${refundAmount} processed successfully`,
        type: 'success'
      }));
      setShowRefundModal(false);
      setSelectedBooking(null);
      setRefundAmount('');
      dispatch(fetchUserBookings({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to process refund',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info', text: string }> = {
      confirmed: { variant: 'success', text: 'Confirmed' },
      pending: { variant: 'warning', text: 'Pending' },
      cancelled: { variant: 'danger', text: 'Cancelled' },
      completed: { variant: 'info', text: 'Completed' },
      refunded: { variant: 'info', text: 'Refunded' },
    };
    const config = statusMap[status] || { variant: 'info', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info', text: string }> = {
      paid: { variant: 'success', text: 'Paid' },
      pending: { variant: 'warning', text: 'Pending' },
      failed: { variant: 'danger', text: 'Failed' },
      refunded: { variant: 'info', text: 'Refunded' },
      partially_refunded: { variant: 'info', text: 'Partial Refund' },
    };
    const config = statusMap[status] || { variant: 'info', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" text="Loading bookings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Booking Management</h1>
          <p className="text-gray-600">Manage all bookings and reservations</p>
        </div>
        <Button size="lg">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          Export Bookings
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-l-4 border-blue-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
          <p className="text-3xl font-bold text-blue-600">{bookings.length}</p>
        </Card>
        <Card className="bg-green-50 border-l-4 border-green-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Confirmed</p>
          <p className="text-3xl font-bold text-green-600">{confirmedBookings}</p>
        </Card>
        <Card className="bg-yellow-50 border-l-4 border-yellow-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingBookings}</p>
        </Card>
        <Card className="bg-red-50 border-l-4 border-red-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Cancelled</p>
          <p className="text-3xl font-bold text-red-600">{cancelledBookings}</p>
        </Card>
        <Card className="bg-purple-50 border-l-4 border-purple-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-purple-600">${totalRevenue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="Search by booking reference, user name, or tour name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              }
              fullWidth
            />
          </div>

          {/* Filters Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Booking Status</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('confirmed')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    filterStatus === 'confirmed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Confirmed
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus('cancelled')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    filterStatus === 'cancelled' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancelled
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Status</label>
              <select
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="partially_refunded">Partially Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="booking_date_desc">Booking Date: Newest First</option>
                <option value="booking_date_asc">Booking Date: Oldest First</option>
                <option value="tour_date_desc">Tour Date: Latest First</option>
                <option value="tour_date_asc">Tour Date: Earliest First</option>
                <option value="amount_desc">Amount: High to Low</option>
                <option value="amount_asc">Amount: Low to High</option>
              </select>
            </div>
          </div>

          {/* Filters Row 2 - Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                fullWidth
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Bookings Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Booking Ref
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tour
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tour Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Guests
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-800">{booking.booking_reference}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {booking.tour?.featured_image_url && (
                        <img
                          src={booking.tour.featured_image_url}
                          alt={booking.tour.title}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {booking.tour?.title || 'Unknown Tour'}
                        </p>
                        <p className="text-xs text-gray-600">{booking.tour?.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-800">
                      {new Date(booking.tour_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-gray-800">
                        {booking.number_of_adults + booking.number_of_children + booking.number_of_infants} guests
                      </p>
                      <p className="text-xs text-gray-600">
                        {booking.number_of_adults}A, {booking.number_of_children}C, {booking.number_of_infants}I
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">
                      ${booking.total_price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">{booking.currency}</p>
                  </td>
                  <td className="px-6 py-4">
                    {getPaymentBadge(booking.payment_status)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/bookings/${booking.id}`}>
                        <Button variant="outline" size="sm" title="View Details">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </Button>
                      </Link>
                      
                      {booking.status === 'pending' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking.id);
                            setShowApproveModal(true);
                          }}
                          title="Approve Booking"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </Button>
                      )}

                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking.id);
                            setShowCancelModal(true);
                          }}
                          title="Cancel Booking"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </Button>
                      )}

                      {booking.payment_status === 'paid' && booking.status === 'cancelled' && (
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking.id);
                            setRefundAmount(booking.total_price.toString());
                            setShowRefundModal(true);
                          }}
                          title="Process Refund"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-600 mb-4">No bookings found matching your criteria.</p>
              <Button onClick={() => {
                setFilterStatus('all');
                setFilterPaymentStatus('all');
                setSearchQuery('');
                setDateRange({ start: '', end: '' });
              }}>
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => dispatch(fetchUserBookings({ page, limit: 20 }))}
            showFirstLast
          />
        </div>
      )}

      {/* Approve Booking Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedBooking(null);
        }}
        title="Approve Booking"
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-6">
            Are you sure you want to approve this booking? The customer will receive a confirmation email.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleApproveBooking}
              variant="success"
              loading={isProcessing}
              disabled={isProcessing}
              className="flex-1"
            >
              Yes, Approve Booking
            </Button>
            <Button
              onClick={() => {
                setShowApproveModal(false);
                setSelectedBooking(null);
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedBooking(null);
          setCancellationReason('');
        }}
        title="Cancel Booking"
        size="md"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Please provide a reason for cancelling this booking. The customer will be notified.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cancellation Reason *
            </label>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter reason for cancellation..."
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleCancelBooking}
              variant="danger"
              loading={isProcessing}
              disabled={isProcessing || !cancellationReason.trim()}
              className="flex-1"
            >
              Cancel Booking
            </Button>
            <Button
              onClick={() => {
                setShowCancelModal(false);
                setSelectedBooking(null);
                setCancellationReason('');
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Back
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refund Booking Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setSelectedBooking(null);
          setRefundAmount('');
        }}
        title="Process Refund"
        size="md"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Enter the refund amount to process. This will initiate a refund to the customer's original payment method.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Refund Amount ($) *
            </label>
            <Input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="Enter refund amount"
              fullWidth
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the full booking amount for a complete refund, or a partial amount.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefundBooking}
              variant="success"
              loading={isProcessing}
              disabled={isProcessing || !refundAmount.trim()}
              className="flex-1"
            >
              Process Refund
            </Button>
            <Button
              onClick={() => {
                setShowRefundModal(false);
                setSelectedBooking(null);
                setRefundAmount('');
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminBookingsPage;
