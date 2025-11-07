/**
 * Page Editor - Edit existing page or create new page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageBuilder from '../../../components/admin/cms/PageBuilder';
import { pageAPI } from '../../../services/api/cms/cmsAPI';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';

const PageEditor = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isNewPage = pageId === 'new';

  useEffect(() => {
    if (!isNewPage) {
      fetchPage();
    } else {
      // Initialize new page with defaults
      setPageData({
        title: 'New Page',
        slug: 'new-page',
        type: 'standard',
        status: 'draft',
        sections: [],
        seo: {},
      });
      setLoading(false);
    }
  }, [pageId, isNewPage]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const response = await pageAPI.getPage(pageId);
      setPageData(response.data.page);
    } catch (err) {
      console.error('Error fetching page:', err);
      setError('Failed to load page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedPageData) => {
    try {
      if (isNewPage) {
        const response = await pageAPI.createPage(updatedPageData);
        navigate(`/admin/cms/pages/${response.data.page._id}/edit`);
      } else {
        await pageAPI.updatePage(pageId, updatedPageData);
      }
      alert('Page saved successfully!');
    } catch (err) {
      console.error('Error saving page:', err);
      alert('Failed to save page. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Page</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin/cms/pages')}
            className="btn btn-primary"
          >
            <FaArrowLeft className="mr-2" />
            Back to Pages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={() => navigate('/admin/cms/pages')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <FaArrowLeft className="mr-2" />
          Back to Pages
        </button>
      </div>

      {/* Page Builder */}
      <PageBuilder
        pageId={isNewPage ? null : pageId}
        initialData={pageData}
        onSave={handleSave}
      />
    </div>
  );
};

export default PageEditor;
