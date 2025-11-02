import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { searchTours, setFilters } from '../store/slices/toursSlice';
import TourCard from '../components/TourCard/TourCard';
import { Pagination, Button, Input, Badge } from '../components/UI';

const SearchPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tours, loading, pagination } = useSelector((state: RootState) => state.tours);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setLocalFilters] = useState({
    tour_type: searchParams.get('type') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    difficulty_level: searchParams.get('difficulty') || '',
    min_duration: searchParams.get('min_duration') || '',
    max_duration: searchParams.get('max_duration') || '',
    min_rating: searchParams.get('min_rating') || '',
    location: searchParams.get('location') || '',
  });

  const tourTypes = ['cultural', 'adventure', 'nature', 'food', 'historical', 'urban', 'beach', 'mountain'];
  const difficultyLevels = ['easy', 'moderate', 'challenging', 'difficult'];

  // Initial search from URL params
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      handleSearchWithParams(query, filters);
    }
  }, []); // Run once on mount

  const handleSearchWithParams = async (query: string, currentFilters: any) => {
    setHasSearched(true);
    const searchPayload = {
      query,
      ...Object.fromEntries(
        Object.entries(currentFilters).filter(([_, value]) => value !== '')
      ),
      page: 1,
      limit: 12,
    };
    await dispatch(searchTours(searchPayload));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Update URL params
    const params: any = { q: searchQuery };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    setSearchParams(params);

    await handleSearchWithParams(searchQuery, filters);
  };

  const handleFilterChange = (key: string, value: any) => {
    setLocalFilters({ ...filters, [key]: value });
  };

  const applyFilters = () => {
    const params: any = { q: searchQuery };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    setSearchParams(params);
    handleSearchWithParams(searchQuery, filters);
  };

  const clearFilters = () => {
    setLocalFilters({
      tour_type: '',
      min_price: '',
      max_price: '',
      difficulty_level: '',
      min_duration: '',
      max_duration: '',
      min_rating: '',
      location: '',
    });
    setSearchParams({ q: searchQuery });
    handleSearchWithParams(searchQuery, {});
  };

  const handlePageChange = (page: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // TODO: Implement page change in search
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(v => v !== '').length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Search Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-6 text-center">Search Tours</h1>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations, activities, or tour names..."
              className="flex-1 px-6 py-4 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition font-semibold whitespace-nowrap"
            >
              Search
            </button>
          </form>
          
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {tourTypes.slice(0, 5).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setLocalFilters({ ...filters, tour_type: type });
                  handleFilterChange('tour_type', type);
                  setSearchParams({ q: searchQuery, type });
                  handleSearchWithParams(searchQuery, { ...filters, tour_type: type });
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  filters.tour_type === type
                    ? 'bg-white text-blue-600'
                    : 'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {hasSearched && (
          <div className="mb-6">
            {/* Results Header & Filters Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {loading ? 'Searching...' : `Found ${pagination.total || tours.length} tours`}
                </h2>
                {searchQuery && (
                  <p className="text-gray-600 mt-1">
                    Results for "<span className="font-semibold">{searchQuery}</span>"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="font-semibold">Filters</span>
                  {getActiveFiltersCount() > 0 && (
                    <Badge variant="info">{getActiveFiltersCount()}</Badge>
                  )}
                </button>

                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                    title="Grid view"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                    title="List view"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {getActiveFiltersCount() > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-sm font-semibold text-gray-700 py-2">Active filters:</span>
                {Object.entries(filters).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <Badge
                      key={key}
                      variant="info"
                      className="flex items-center gap-2"
                    >
                      <span>{key.replace('_', ' ')}: {value}</span>
                      <button
                        onClick={() => {
                          handleFilterChange(key, '');
                          const newFilters = { ...filters, [key]: '' };
                          setLocalFilters(newFilters);
                          handleSearchWithParams(searchQuery, newFilters);
                        }}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Tour Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tour Type
                    </label>
                    <select
                      value={filters.tour_type}
                      onChange={(e) => handleFilterChange('tour_type', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      {tourTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={filters.difficulty_level}
                      onChange={(e) => handleFilterChange('difficulty_level', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Levels</option>
                      {difficultyLevels.map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price Range ($)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.min_price}
                        onChange={(e) => handleFilterChange('min_price', e.target.value)}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.max_price}
                        onChange={(e) => handleFilterChange('max_price', e.target.value)}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration (days)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.min_duration}
                        onChange={(e) => handleFilterChange('min_duration', e.target.value)}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.max_duration}
                        onChange={(e) => handleFilterChange('max_duration', e.target.value)}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="City or country"
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Minimum Rating */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Min Rating
                    </label>
                    <select
                      value={filters.min_rating}
                      onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Any Rating</option>
                      <option value="4">4+ Stars</option>
                      <option value="3">3+ Stars</option>
                      <option value="2">2+ Stars</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button onClick={applyFilters} className="flex-1 sm:flex-initial">
                    Apply Filters
                  </Button>
                  <Button onClick={clearFilters} variant="outline" className="flex-1 sm:flex-initial">
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className={viewMode === 'grid' ? 'h-64 bg-gray-300' : 'h-32 bg-gray-300'}></div>
                <div className="p-4">
                  <div className="h-6 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : hasSearched ? (
          tours.length > 0 ? (
            <>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {tours.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    variant={viewMode === 'list' ? 'compact' : 'default'}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    showFirstLast
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No tours found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
              <Button onClick={clearFilters} variant="primary">
                Clear all filters
              </Button>
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <svg className="mx-auto h-20 w-20 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Start Your Search</h3>
            <p className="text-gray-600 mb-6">Enter a destination or activity to find your perfect tour</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-gray-600">Popular searches:</span>
              {['Paris', 'Adventure', 'Beach', 'Cultural', 'Nature'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    setSearchParams({ q: term });
                    handleSearchWithParams(term, {});
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
