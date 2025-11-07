/**
 * SEO Settings Component
 * Modal for managing page SEO metadata and optimization
 */

import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { seoAPI } from '../../../../services/api/cms/cmsAPI';

const SEOSettings = ({ pageData, onSave, onClose }) => {
  const [seoData, setSeoData] = useState({
    metaTitle: pageData?.seo?.metaTitle || '',
    metaDescription: pageData?.seo?.metaDescription || '',
    keywords: pageData?.seo?.keywords || [],
    ogTitle: pageData?.seo?.ogTitle || '',
    ogDescription: pageData?.seo?.ogDescription || '',
    ogImage: pageData?.seo?.ogImage || '',
    canonical: pageData?.seo?.canonical || '',
    robots: pageData?.seo?.robots || 'index, follow',
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Character limits
  const TITLE_MAX = 60;
  const DESCRIPTION_MAX = 160;

  useEffect(() => {
    if (pageData?._id) {
      analyzeSEO();
    }
  }, []);

  const analyzeSEO = async () => {
    if (!pageData?._id) return;

    try {
      setAnalyzing(true);
      const response = await seoAPI.analyzePage(pageData._id);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error analyzing SEO:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleChange = (field, value) => {
    setSeoData({ ...seoData, [field]: value });
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !seoData.keywords.includes(keywordInput.trim())) {
      setSeoData({
        ...seoData,
        keywords: [...seoData.keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword) => {
    setSeoData({
      ...seoData,
      keywords: seoData.keywords.filter((k) => k !== keyword),
    });
  };

  const handleSave = () => {
    onSave?.(seoData);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">SEO Settings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Optimize your page for search engines
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* SEO Score */}
            {analysis && (
              <div className={`p-4 rounded-lg ${getScoreBg(analysis.score)}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">SEO Score</h3>
                  <span className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      analysis.score >= 80
                        ? 'bg-green-600'
                        : analysis.score >= 50
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Meta Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Meta Title
                <span className="text-gray-500 ml-2">
                  ({seoData.metaTitle.length}/{TITLE_MAX})
                </span>
              </label>
              <input
                type="text"
                value={seoData.metaTitle}
                onChange={(e) => handleChange('metaTitle', e.target.value)}
                maxLength={TITLE_MAX}
                placeholder="Page title for search engines"
                className={`w-full px-3 py-2 border rounded-lg ${
                  seoData.metaTitle.length > TITLE_MAX - 10
                    ? 'border-yellow-500'
                    : 'border-gray-300'
                }`}
              />
              <p className="text-xs text-gray-600 mt-1">
                Keep it under {TITLE_MAX} characters for best results
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Meta Description
                <span className="text-gray-500 ml-2">
                  ({seoData.metaDescription.length}/{DESCRIPTION_MAX})
                </span>
              </label>
              <textarea
                value={seoData.metaDescription}
                onChange={(e) => handleChange('metaDescription', e.target.value)}
                maxLength={DESCRIPTION_MAX}
                rows={3}
                placeholder="Brief description of your page"
                className={`w-full px-3 py-2 border rounded-lg ${
                  seoData.metaDescription.length > DESCRIPTION_MAX - 20
                    ? 'border-yellow-500'
                    : 'border-gray-300'
                }`}
              />
              <p className="text-xs text-gray-600 mt-1">
                Keep it under {DESCRIPTION_MAX} characters for best results
              </p>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium mb-2">Keywords</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  placeholder="Add keyword and press Enter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button onClick={handleAddKeyword} className="btn btn-secondary">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {seoData.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="hover:text-blue-900"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Open Graph Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Social Media (Open Graph)</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">OG Title</label>
                  <input
                    type="text"
                    value={seoData.ogTitle}
                    onChange={(e) => handleChange('ogTitle', e.target.value)}
                    placeholder="Title for social media shares"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">OG Description</label>
                  <textarea
                    value={seoData.ogDescription}
                    onChange={(e) => handleChange('ogDescription', e.target.value)}
                    rows={2}
                    placeholder="Description for social media shares"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">OG Image URL</label>
                  <input
                    type="url"
                    value={seoData.ogImage}
                    onChange={(e) => handleChange('ogImage', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {seoData.ogImage && (
                    <img
                      src={seoData.ogImage}
                      alt="OG Preview"
                      className="mt-2 w-full max-w-xs h-auto rounded-lg"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Canonical URL</label>
                  <input
                    type="url"
                    value={seoData.canonical}
                    onChange={(e) => handleChange('canonical', e.target.value)}
                    placeholder="https://example.com/page"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Specify the canonical URL to prevent duplicate content issues
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Robots Meta Tag</label>
                  <select
                    value={seoData.robots}
                    onChange={(e) => handleChange('robots', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="index, follow">Index, Follow</option>
                    <option value="noindex, follow">No Index, Follow</option>
                    <option value="index, nofollow">Index, No Follow</option>
                    <option value="noindex, nofollow">No Index, No Follow</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEO Recommendations */}
            {analysis?.suggestions && analysis.suggestions.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                <div className="space-y-2">
                  {analysis.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg flex items-start gap-3 ${
                        suggestion.type === 'warning'
                          ? 'bg-yellow-50 border border-yellow-200'
                          : suggestion.type === 'error'
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      {suggestion.type === 'warning' ? (
                        <FaExclamationTriangle className="text-yellow-600 mt-1" />
                      ) : suggestion.type === 'error' ? (
                        <FaTimes className="text-red-600 mt-1" />
                      ) : (
                        <FaCheck className="text-blue-600 mt-1" />
                      )}
                      <p className="text-sm">{suggestion.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save SEO Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SEOSettings;
