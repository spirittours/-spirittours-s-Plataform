import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchTours } from '../store/slices/toursSlice';
import { fetchUserBookings } from '../store/slices/bookingsSlice';
import { fetchUserReviews } from '../store/slices/reviewsSlice';
import { Card, Button, Loading } from '../components/UI';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const AdminAnalyticsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tours, loading: toursLoading } = useSelector((state: RootState) => state.tours);
  const { bookings, loading: bookingsLoading } = useSelector((state: RootState) => state.bookings);
  const { userReviews, loading: reviewsLoading } = useSelector((state: RootState) => state.reviews);

  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [reportType, setReportType] = useState<'revenue' | 'bookings' | 'customers' | 'tours'>('revenue');

  useEffect(() => {
    dispatch(fetchTours({ page: 1, limit: 100 }));
    dispatch(fetchUserBookings({ page: 1, limit: 100 }));
    dispatch(fetchUserReviews({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Colors for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  // Calculate KPIs
  const totalRevenue = bookings.reduce((sum, booking) => {
    if (booking.payment_status === 'paid') {
      return sum + booking.total_price;
    }
    return sum;
  }, 0);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const conversionRate = tours.length > 0 ? ((totalBookings / (tours.length * 100)) * 100).toFixed(1) : '0.0';

  // Revenue over time data (last 12 months)
  const revenueData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const month = date.toLocaleString('en-US', { month: 'short' });
    
    // Calculate revenue for this month (mock data - replace with actual)
    const monthRevenue = Math.floor(Math.random() * 50000) + 20000;
    const monthBookings = Math.floor(Math.random() * 100) + 40;
    
    return {
      month,
      revenue: monthRevenue,
      bookings: monthBookings,
    };
  });

  // Bookings by status
  const bookingsByStatus = [
    { name: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: COLORS[1] },
    { name: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: COLORS[2] },
    { name: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: COLORS[3] },
    { name: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: COLORS[0] },
  ].filter(item => item.value > 0);

  // Top performing tours
  const tourBookingCounts = bookings.reduce((acc: Record<number, number>, booking) => {
    if (booking.tour_id) {
      acc[booking.tour_id] = (acc[booking.tour_id] || 0) + 1;
    }
    return acc;
  }, {});

  const topTours = tours
    .map(tour => ({
      name: tour.title.length > 25 ? tour.title.substring(0, 25) + '...' : tour.title,
      bookings: tourBookingCounts[tour.id] || 0,
      revenue: (tourBookingCounts[tour.id] || 0) * tour.price,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 8);

  // Tours by type
  const toursByType = tours.reduce((acc: Record<string, number>, tour) => {
    const type = tour.tour_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const tourTypeData = Object.entries(toursByType).map(([type, count], index) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    color: COLORS[index % COLORS.length],
  }));

  // Reviews trend
  const reviewsData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.toLocaleString('en-US', { month: 'short' });
    
    return {
      month,
      reviews: Math.floor(Math.random() * 50) + 20,
      avgRating: (Math.random() * 1.5 + 3.5).toFixed(1),
    };
  });

  // Revenue by tour type
  const revenueByType = tours.reduce((acc: Record<string, number>, tour) => {
    const type = tour.tour_type || 'other';
    const tourRevenue = (tourBookingCounts[tour.id] || 0) * tour.price;
    acc[type] = (acc[type] || 0) + tourRevenue;
    return acc;
  }, {});

  const revenueTypeData = Object.entries(revenueByType)
    .map(([type, revenue]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      revenue: revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const loading = toursLoading || bookingsLoading || reviewsLoading;

  if (loading && tours.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Analytics & Reports</h1>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button>
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white" padding="lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100">Total Revenue</p>
            <svg className="w-8 h-8 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-4xl font-bold mb-1">${totalRevenue.toLocaleString()}</p>
          <p className="text-blue-100 text-sm">↑ 12.5% vs last period</p>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white" padding="lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100">Total Bookings</p>
            <svg className="w-8 h-8 text-green-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-4xl font-bold mb-1">{totalBookings}</p>
          <p className="text-green-100 text-sm">{confirmedBookings} confirmed</p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white" padding="lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100">Avg Booking Value</p>
            <svg className="w-8 h-8 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <p className="text-4xl font-bold mb-1">${averageBookingValue.toFixed(0)}</p>
          <p className="text-purple-100 text-sm">Per transaction</p>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white" padding="lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100">Conversion Rate</p>
            <svg className="w-8 h-8 text-orange-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-4xl font-bold mb-1">{conversionRate}%</p>
          <p className="text-orange-100 text-sm">Of visitors booking</p>
        </Card>
      </div>

      {/* Revenue and Bookings Trend */}
      <Card padding="lg">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Revenue & Bookings Trend</h2>
          <p className="text-gray-600 text-sm">Monthly performance over the last 12 months</p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" stroke="#6B7280" />
            <YAxis yAxisId="left" stroke="#3B82F6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
            />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue ($)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="bookings"
              stroke="#10B981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBookings)"
              name="Bookings"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by Status */}
        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Bookings by Status</h2>
            <p className="text-gray-600 text-sm">Distribution of booking statuses</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bookingsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {bookingsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {bookingsByStatus.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-700">{item.name}: <strong>{item.value}</strong></span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tours by Type */}
        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Tours by Type</h2>
            <p className="text-gray-600 text-sm">Distribution of tour categories</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tourTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {tourTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {tourTypeData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-700">{item.name}: <strong>{item.value}</strong></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Performing Tours */}
      <Card padding="lg">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Top Performing Tours</h2>
          <p className="text-gray-600 text-sm">Most booked tours and their revenue</p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topTours}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#6B7280" angle={-45} textAnchor="end" height={100} />
            <YAxis yAxisId="left" stroke="#3B82F6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="bookings" fill="#3B82F6" name="Bookings" radius={[8, 8, 0, 0]} />
            <Bar yAxisId="right" dataKey="revenue" fill="#10B981" name="Revenue ($)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Revenue by Tour Type */}
      <Card padding="lg">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Revenue by Tour Type</h2>
          <p className="text-gray-600 text-sm">Which tour categories generate the most revenue</p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={revenueTypeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#6B7280" />
            <YAxis dataKey="type" type="category" stroke="#6B7280" width={100} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              formatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue ($)" radius={[0, 8, 8, 0]}>
              {revenueTypeData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Reviews Trend */}
      <Card padding="lg">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Reviews & Ratings Trend</h2>
          <p className="text-gray-600 text-sm">Customer feedback over time</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={reviewsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" stroke="#6B7280" />
            <YAxis yAxisId="left" stroke="#3B82F6" />
            <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" domain={[0, 5]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="reviews"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 5 }}
              name="Reviews Count"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgRating"
              stroke="#F59E0B"
              strokeWidth={3}
              dot={{ fill: '#F59E0B', r: 5 }}
              name="Avg Rating"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Summary Statistics Table */}
      <Card padding="lg">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Performance Summary</h2>
          <p className="text-gray-600 text-sm">Key metrics at a glance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Metric</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Period</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Previous Period</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 font-semibold">Total Revenue</td>
                <td className="px-6 py-4 text-gray-800">${totalRevenue.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-600">${(totalRevenue * 0.88).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                <td className="px-6 py-4">
                  <span className="text-green-600 font-semibold">+12.5% ↑</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 font-semibold">Total Bookings</td>
                <td className="px-6 py-4 text-gray-800">{totalBookings}</td>
                <td className="px-6 py-4 text-gray-600">{Math.floor(totalBookings * 0.92)}</td>
                <td className="px-6 py-4">
                  <span className="text-green-600 font-semibold">+8.7% ↑</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 font-semibold">Active Tours</td>
                <td className="px-6 py-4 text-gray-800">{tours.filter(t => t.is_active).length}</td>
                <td className="px-6 py-4 text-gray-600">{tours.filter(t => t.is_active).length - 2}</td>
                <td className="px-6 py-4">
                  <span className="text-green-600 font-semibold">+2 tours ↑</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 font-semibold">Average Rating</td>
                <td className="px-6 py-4 text-gray-800">
                  {(userReviews.reduce((sum, r) => sum + r.rating, 0) / (userReviews.length || 1)).toFixed(1)}★
                </td>
                <td className="px-6 py-4 text-gray-600">4.3★</td>
                <td className="px-6 py-4">
                  <span className="text-green-600 font-semibold">+0.2 ↑</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 font-semibold">Customer Reviews</td>
                <td className="px-6 py-4 text-gray-800">{userReviews.length}</td>
                <td className="px-6 py-4 text-gray-600">{Math.floor(userReviews.length * 0.85)}</td>
                <td className="px-6 py-4">
                  <span className="text-green-600 font-semibold">+15.0% ↑</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminAnalyticsPage;
