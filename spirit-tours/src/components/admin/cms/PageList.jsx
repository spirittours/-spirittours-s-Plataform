/**
 * Page List Component
 * Dashboard for managing all CMS pages
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaSearch,
  FaFilter,
  FaGlobe,
  FaClock,
  FaArchive,
} from 'react-icons/fa';
import { pageAPI } from '../../../services/api/cms/cmsAPI';

const PageList = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPages();
  }, [searchQuery, statusFilter, typeFilter, currentPage]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        page: currentPage,
        limit: 10,
      };

      const response = await pageAPI.getPages(filters);
      setPages(response.data.pages);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = () => {
    navigate('/admin/cms/pages/new');
  };

  const handleEditPage = (pageId) => {
    navigate(`/admin/cms/pages/${pageId}/edit`);
  };

  const handleDuplicatePage = async (pageId) => {
    try {
      await pageAPI.duplicatePage(pageId);
      fetchPages();
    } catch (error) {
      console.error('Error duplicating page:', error);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (window.confirm('Are you sure you want to delete this page?')) {
      try {
        await pageAPI.deletePage(pageId);
        fetchPages();
      } catch (error) {
        console.error('Error deleting page:', error);
      }
    }
  };

  const handlePublishPage = async (pageId) => {
    try {
      await pageAPI.publishPage(pageId);
      fetchPages();
    } catch (error) {
      console.error('Error publishing page:', error);
    }
  };

  const handleUnpublishPage = async (pageId) => {
    try {
      await pageAPI.unpublishPage(pageId);
      fetchPages();
    } catch (error) {
      console.error('Error unpublishing page:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <FaGlobe className="text-green-600" />;
      case 'scheduled':
        return <FaClock className="text-blue-600" />;
      case 'archived':
        return <FaArchive className="text-yellow-600" />;
      default:
        return <FaEdit className="text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pages</h1>
              <p className="text-gray-600 mt-1">
                Manage your website pages and content
              </p>
            </div>
            <button onClick={handleCreatePage} className="btn btn-primary">
              <FaPlus className="mr-2" />
              New Page
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="w-40">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="standard">Standard</option>
                <option value="home">Home</option>
                <option value="contact">Contact</option>
                <option value="about">About</option>
                <option value="policy">Policy</option>
              </select>
            </div>
          </div>
        </div>

        {/* Page List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading pages...</p>
            </div>
          </div>
        ) : pages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold mb-2">No pages found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first page to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
              <button onClick={handleCreatePage} className="btn btn-primary">
                <FaPlus className="mr-2" />
                Create Page
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Modified
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pages.map((page) => (
                    <tr key={page._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="text-2xl mr-3">{getStatusIcon(page.status)}</div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {page.title}
                            </div>
                            <div className="text-sm text-gray-500">/{page.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(page.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{page.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(page.updatedAt), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {page.modifiedBy?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditPage(page._id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => window.open(`/${page.slug}`, '_blank')}
                            className="text-gray-600 hover:text-gray-900"
                            title="View"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleDuplicatePage(page._id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Duplicate"
                          >
                            <FaCopy />
                          </button>
                          {page.status === 'published' ? (
                            <button
                              onClick={() => handleUnpublishPage(page._id)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Unpublish"
                            >
                              <FaArchive />
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePublishPage(page._id)}
                              className="text-green-600 hover:text-green-900"
                              title="Publish"
                            >
                              <FaGlobe />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePage(page._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PageList;
