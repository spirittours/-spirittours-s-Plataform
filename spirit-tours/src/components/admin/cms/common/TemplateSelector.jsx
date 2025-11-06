/**
 * Template Selector Component
 * Browse and apply page templates
 */

import React, { useState, useEffect } from 'react';
import { templateAPI } from '../../../../services/api/cms/cmsAPI';
import { FaTimes, FaSearch, FaStar, FaEye, FaCheck } from 'react-icons/fa';

const TemplateSelector = ({ isOpen, onClose, onSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, categoryFilter, searchQuery]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateAPI.getTemplates({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchQuery,
      });
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Use fallback templates if API fails
      setTemplates(getFallbackTemplates());
    } finally {
      setLoading(false);
    }
  };

  // Fallback templates for demo/offline mode
  const getFallbackTemplates = () => [
    {
      _id: '1',
      name: 'About Us Template',
      description: 'Professional about us page with team section',
      category: 'page',
      thumbnail: '/api/placeholder/400/300',
      sections: [
        { type: 'hero', content: { heading: 'About Us', subheading: 'Our Story' } },
        { type: 'text', content: { html: '<p>Company information...</p>' } },
        { type: 'gallery', content: { title: 'Our Team' } },
      ],
      variables: [],
      stats: { uses: 150, rating: 4.8 },
    },
    {
      _id: '2',
      name: 'Contact Page',
      description: 'Complete contact page with form and map',
      category: 'page',
      thumbnail: '/api/placeholder/400/300',
      sections: [
        { type: 'hero', content: { heading: 'Contact Us' } },
        { type: 'form', content: { title: 'Get in Touch' } },
      ],
      variables: [],
      stats: { uses: 200, rating: 4.9 },
    },
    {
      _id: '3',
      name: 'Services Page',
      description: 'Showcase your services with icons',
      category: 'page',
      thumbnail: '/api/placeholder/400/300',
      sections: [
        { type: 'hero', content: { heading: 'Our Services' } },
        { type: 'text', content: { html: '<p>Services overview...</p>' } },
      ],
      variables: [],
      stats: { uses: 120, rating: 4.7 },
    },
    {
      _id: '4',
      name: 'FAQ Template',
      description: 'Frequently asked questions with accordion',
      category: 'page',
      thumbnail: '/api/placeholder/400/300',
      sections: [
        { type: 'hero', content: { heading: 'FAQ' } },
        { type: 'accordion', content: { items: [] } },
      ],
      variables: [],
      stats: { uses: 180, rating: 4.6 },
    },
    {
      _id: '5',
      name: 'Privacy Policy',
      description: 'Legal page template for privacy policy',
      category: 'page',
      thumbnail: '/api/placeholder/400/300',
      sections: [
        { type: 'hero', content: { heading: 'Privacy Policy' } },
        { type: 'text', content: { html: '<p>Privacy policy content...</p>' } },
      ],
      variables: [],
      stats: { uses: 95, rating: 4.5 },
    },
    {
      _id: '6',
      name: 'Team Page',
      description: 'Showcase your team members',
      category: 'page',
      thumbnail: '/api/placeholder/400/300',
      sections: [
        { type: 'hero', content: { heading: 'Meet Our Team' } },
        { type: 'gallery', content: { title: 'Team Members' } },
      ],
      variables: [],
      stats: { uses: 110, rating: 4.7 },
    },
  ];

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onSelect?.(selectedTemplate);
      onClose?.();
    }
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Choose a Template</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a pre-designed template to get started quickly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="page">Full Pages</option>
            <option value="section">Sections</option>
            <option value="header">Headers</option>
            <option value="footer">Footers</option>
          </select>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading templates...</p>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg">No templates found</p>
                <p className="text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => {
                const isSelected = selectedTemplate?._id === template._id;

                return (
                  <div
                    key={template._id}
                    className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    {/* Template Thumbnail */}
                    <div className="aspect-video bg-gray-100 relative">
                      {template.thumbnail ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-4xl">📄</span>
                        </div>
                      )}

                      {/* Preview Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(template);
                        }}
                        className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Preview"
                      >
                        <FaEye className="text-gray-700" />
                      </button>

                      {/* Selected Badge */}
                      {isSelected && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white p-2 rounded-full">
                          <FaCheck />
                        </div>
                      )}
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {template.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center">
                          <FaStar className="text-yellow-500 mr-1" />
                          {template.stats?.rating?.toFixed(1) || 'N/A'}
                        </span>
                        <span>{template.stats?.uses || 0} uses</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedTemplate ? (
              <>
                Selected: <span className="font-medium">{selectedTemplate.name}</span>
              </>
            ) : (
              'Select a template to continue'
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleApplyTemplate}
              className="btn btn-primary"
              disabled={!selectedTemplate}
            >
              Use Template
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewMode && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold">{selectedTemplate.name}</h3>
              <button
                onClick={() => setPreviewMode(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-8">
              <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
              <div className="space-y-4">
                {selectedTemplate.sections?.map((section, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <span className="text-sm font-medium text-gray-700">
                      {section.type.charAt(0).toUpperCase() + section.type.slice(1)} Block
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
