/**
 * Gallery Block Component
 * Image gallery with grid and lightbox
 */

import React, { useState } from 'react';
import { FaImage, FaPlus, FaTimes } from 'react-icons/fa';
import MediaLibrary from '../common/MediaLibrary';

const GalleryBlock = ({ content, settings, onChange, onSettingsChange, isEditing }) => {
  const defaultContent = {
    images: content?.images || [],
    title: content?.title || '',
  };

  const defaultSettings = {
    columns: settings?.columns || 3,
    gap: settings?.gap || 'medium',
    aspectRatio: settings?.aspectRatio || 'square',
    lightbox: settings?.lightbox !== false,
  };

  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const handleContentChange = (key, value) => {
    onChange?.({ ...defaultContent, [key]: value });
  };

  const handleSettingChange = (key, value) => {
    onSettingsChange?.({ ...defaultSettings, [key]: value });
  };

  const handleMediaSelect = (assets) => {
    const newImages = assets.map((asset) => ({
      id: asset._id,
      url: asset.url,
      alt: asset.metadata?.alt || asset.filename,
      caption: asset.metadata?.title || '',
    }));
    handleContentChange('images', [...defaultContent.images, ...newImages]);
    setShowMediaLibrary(false);
  };

  const removeImage = (index) => {
    const updatedImages = defaultContent.images.filter((_, i) => i !== index);
    handleContentChange('images', updatedImages);
  };

  const updateImageCaption = (index, caption) => {
    const updatedImages = defaultContent.images.map((img, i) =>
      i === index ? { ...img, caption } : img
    );
    handleContentChange('images', updatedImages);
  };

  const getGridClass = () => {
    const columns = {
      2: 'grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-4',
      5: 'grid-cols-2 md:grid-cols-5',
    };
    return `grid ${columns[defaultSettings.columns] || columns[3]}`;
  };

  const getGapClass = () => {
    const gaps = {
      small: 'gap-2',
      medium: 'gap-4',
      large: 'gap-6',
    };
    return gaps[defaultSettings.gap] || gaps.medium;
  };

  const getAspectRatioClass = () => {
    const ratios = {
      square: 'aspect-square',
      portrait: 'aspect-[3/4]',
      landscape: 'aspect-[4/3]',
      wide: 'aspect-video',
    };
    return ratios[defaultSettings.aspectRatio] || ratios.square;
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Gallery Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Gallery Title (optional)</label>
          <input
            type="text"
            value={defaultContent.title}
            onChange={(e) => handleContentChange('title', e.target.value)}
            placeholder="Gallery Title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Columns</label>
            <select
              value={defaultSettings.columns}
              onChange={(e) => handleSettingChange('columns', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
              <option value={5}>5 Columns</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Gap</label>
            <select
              value={defaultSettings.gap}
              onChange={(e) => handleSettingChange('gap', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
            <select
              value={defaultSettings.aspectRatio}
              onChange={(e) => handleSettingChange('aspectRatio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="square">Square (1:1)</option>
              <option value="portrait">Portrait (3:4)</option>
              <option value="landscape">Landscape (4:3)</option>
              <option value="wide">Wide (16:9)</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={defaultSettings.lightbox}
                onChange={(e) => handleSettingChange('lightbox', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Enable Lightbox</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium">Images ({defaultContent.images.length})</label>
            <button
              onClick={() => setShowMediaLibrary(true)}
              className="btn btn-sm btn-secondary flex items-center"
            >
              <FaPlus className="mr-1" /> Add Images
            </button>
          </div>

          {defaultContent.images.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FaImage className="text-4xl text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-2">No images added yet</p>
              <button
                onClick={() => setShowMediaLibrary(true)}
                className="btn btn-sm btn-primary"
              >
                Add Images
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {defaultContent.images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                  <input
                    type="text"
                    value={image.caption}
                    onChange={(e) => updateImageCaption(index, e.target.value)}
                    placeholder="Caption"
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Media Library Modal */}
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={handleMediaSelect}
          multiple={true}
          fileType="image"
        />
      </div>
    );
  }

  // Preview mode
  if (defaultContent.images.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <FaImage className="text-4xl mx-auto mb-2" />
        <p>No images in gallery</p>
      </div>
    );
  }

  return (
    <div className="py-4 max-w-6xl mx-auto">
      {defaultContent.title && (
        <h2 className="text-2xl font-bold mb-6 text-center">{defaultContent.title}</h2>
      )}

      <div className={`${getGridClass()} ${getGapClass()}`}>
        {defaultContent.images.map((image, index) => (
          <div key={index} className="group relative overflow-hidden rounded-lg">
            <div className={getAspectRatioClass()}>
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => defaultSettings.lightbox && setLightboxIndex(index)}
              />
            </div>
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                {image.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {defaultSettings.lightbox && lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
          >
            <FaTimes />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex - 1 + defaultContent.images.length) % defaultContent.images.length);
            }}
            className="absolute left-4 text-white text-3xl hover:text-gray-300"
            disabled={lightboxIndex === 0}
          >
            ‹
          </button>

          <div className="max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={defaultContent.images[lightboxIndex].url}
              alt={defaultContent.images[lightboxIndex].alt}
              className="max-w-full max-h-screen object-contain"
            />
            {defaultContent.images[lightboxIndex].caption && (
              <p className="text-white text-center mt-4">
                {defaultContent.images[lightboxIndex].caption}
              </p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % defaultContent.images.length);
            }}
            className="absolute right-4 text-white text-3xl hover:text-gray-300"
            disabled={lightboxIndex === defaultContent.images.length - 1}
          >
            ›
          </button>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
            {lightboxIndex + 1} / {defaultContent.images.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryBlock;
