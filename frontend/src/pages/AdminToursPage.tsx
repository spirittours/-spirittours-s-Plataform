import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchTours } from '../store/slices/toursSlice';
import { addToast } from '../store/slices/uiSlice';
import { Card, Button, Badge, Loading, Modal, Input, Pagination } from '../components/UI';
import { Link } from 'react-router-dom';

const AdminToursPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tours, loading, pagination } = useSelector((state: RootState) => state.tours);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchTours({ page: 1, limit: 20 }));
  }, [dispatch]);

  const filteredTours = tours
    .filter(tour => {
      if (filterStatus === 'active') return tour.is_active;
      if (filterStatus === 'inactive') return !tour.is_active;
      return true;
    })
    .filter(tour => {
      if (filterType === 'all') return true;
      return tour.tour_type === filterType;
    })
    .filter(tour => {
      if (!searchQuery) return true;
      return (
        tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'created_asc':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        case 'price_desc':
          return b.price - a.price;
        case 'price_asc':
          return a.price - b.price;
        case 'rating_desc':
          return (b.average_rating || 0) - (a.average_rating || 0);
        case 'bookings_desc':
          return (b.total_bookings || 0) - (a.total_bookings || 0);
        default:
          return 0;
      }
    });

  const activeTours = tours.filter(t => t.is_active).length;
  const inactiveTours = tours.filter(t => t.is_active === false).length;
  const tourTypes = ['cultural', 'adventure', 'nature', 'food', 'historical', 'urban', 'beach', 'mountain'];

  const handleDeleteTour = async () => {
    if (!tourToDelete) return;
    
    setIsDeleting(true);
    try {
      // TODO: Implement delete tour API call
      // await dispatch(deleteTour(tourToDelete)).unwrap();
      dispatch(addToast({
        message: 'Tour deleted successfully',
        type: 'success'
      }));
      setShowDeleteModal(false);
      setTourToDelete(null);
      dispatch(fetchTours({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to delete tour',
        type: 'error'
      }));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleTourStatus = async (tourId: number, currentStatus: boolean) => {
    try {
      // TODO: Implement toggle tour status API call
      dispatch(addToast({
        message: `Tour ${currentStatus ? 'deactivated' : 'activated'} successfully`,
        type: 'success'
      }));
      dispatch(fetchTours({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to update tour status',
        type: 'error'
      }));
    }
  };

  if (loading && tours.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" text="Loading tours..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tour Management</h1>
          <p className="text-gray-600">Manage your tours and listings</p>
        </div>
        <Button size="lg">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Tour
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-l-4 border-blue-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Total Tours</p>
          <p className="text-3xl font-bold text-blue-600">{tours.length}</p>
        </Card>
        <Card className="bg-green-50 border-l-4 border-green-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Active Tours</p>
          <p className="text-3xl font-bold text-green-600">{activeTours}</p>
        </Card>
        <Card className="bg-red-50 border-l-4 border-red-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Inactive Tours</p>
          <p className="text-3xl font-bold text-red-600">{inactiveTours}</p>
        </Card>
        <Card className="bg-purple-50 border-l-4 border-purple-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
          <p className="text-3xl font-bold text-purple-600">
            {(tours.reduce((sum, t) => sum + (t.average_rating || 0), 0) / (tours.length || 1)).toFixed(1)}★
          </p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="Search tours by name or location..."
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterStatus('inactive')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'inactive' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tour Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                {tourTypes.map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_desc">Newest First</option>
                <option value="created_asc">Oldest First</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="rating_desc">Highest Rated</option>
                <option value="bookings_desc">Most Booked</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Tours Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tour
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rating
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
              {filteredTours.map((tour) => (
                <tr key={tour.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={tour.featured_image_url || 'https://via.placeholder.com/100x100'}
                        alt={tour.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{tour.title}</p>
                        <p className="text-sm text-gray-600">{tour.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="info" className="capitalize">{tour.tour_type}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-800">${tour.price}</p>
                      {tour.discounted_price && (
                        <p className="text-xs text-gray-500 line-through">${tour.discounted_price}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-800">{tour.duration_days} days</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold text-gray-800">
                        {tour.average_rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({tour.total_reviews || 0})
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={tour.is_active ? 'success' : 'danger'}>
                      {tour.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/tours/${tour.id}`}>
                        <Button variant="outline" size="sm" title="View">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" title="Edit">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </Button>
                      <Button
                        variant={tour.is_active ? 'warning' : 'success'}
                        size="sm"
                        onClick={() => handleToggleTourStatus(tour.id, tour.is_active)}
                        title={tour.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {tour.is_active ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setTourToDelete(tour.id);
                          setShowDeleteModal(true);
                        }}
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTours.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No tours found matching your criteria.</p>
              <Button onClick={() => {
                setFilterStatus('all');
                setFilterType('all');
                setSearchQuery('');
              }}>
                Clear Filters
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
            onPageChange={(page) => dispatch(fetchTours({ page, limit: 20 }))}
            showFirstLast
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTourToDelete(null);
        }}
        title="Delete Tour"
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this tour? This action cannot be undone and will affect all related bookings.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleDeleteTour}
              variant="danger"
              loading={isDeleting}
              disabled={isDeleting}
              className="flex-1"
            >
              Yes, Delete Tour
            </Button>
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setTourToDelete(null);
              }}
              variant="outline"
              disabled={isDeleting}
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

export default AdminToursPage;
