/**
 * Image Block Component
 * Image display with various layout options
 */

import React, { useState } from 'react';
import { FaImage } from 'react-icons/fa';
import MediaLibrary from '../common/MediaLibrary';

const ImageBlock = ({ content, settings, onChange, onSettingsChange, isEditing }) => {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const defaultContent = {
    url: content?.url || '',
    alt: content?.alt || '',
    caption: content?.caption || '',
  };

  const defaultSettings = {
    alignment: settings?.alignment || 'center',
    size: settings?.size || 'large',
    rounded: settings?.rounded || false,
    shadow: settings?.shadow || false,
    link: settings?.link || '',
  };

  const handleContentChange = (key, value) => {
    onChange?.({ ...defaultContent, [key]: value });
  };

  const handleSettingChange = (key, value) => {
    onSettingsChange?.({ ...defaultSettings, [key]: value });
  };

  const handleMediaSelect = (asset) => {
    onChange?.({
      ...defaultContent,
      url: asset.url,
      alt: asset.metadata?.alt || asset.filename,
    });
    setShowMediaLibrary(false);
  };

  const getSizeClass = () => {
    switch (defaultSettings.size) {
      case 'small':
        return 'max-w-sm';
      case 'medium':
        return 'max-w-2xl';
      case 'large':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-full w-full';
      default:
        return 'max-w-2xl';
    }
  };

  const getAlignmentClass = () => {
    switch (defaultSettings.alignment) {
      case 'left':
        return 'mr-auto';
      case 'center':
        return 'mx-auto';
      case 'right':
        return 'ml-auto';
      default:
        return 'mx-auto';
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Image Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Image</label>
          {defaultContent.url ? (
            <div className="relative group">
              <img
                src={defaultContent.url}
                alt={defaultContent.alt}
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                onClick={() => setShowMediaLibrary(true)}
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-white font-medium">Change Image</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMediaLibrary(true)}
              className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 transition-colors"
            >
              <FaImage className="text-4xl text-gray-400 mb-2" />
              <span className="text-gray-600">Select Image</span>
            </button>
          )}
        </div>

        {/* Alt Text */}
        <div>
          <label className="block text-sm font-medium mb-2">Alt Text</label>
          <input
            type="text"
            value={defaultContent.alt}
            onChange={(e) => handleContentChange('alt', e.target.value)}
            placeholder="Describe the image"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium mb-2">Caption (optional)</label>
          <input
            type="text"
            value={defaultContent.caption}
            onChange={(e) => handleContentChange('caption', e.target.value)}
            placeholder="Add a caption"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Size</label>
            <select
              value={defaultSettings.size}
              onChange={(e) => handleSettingChange('size', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="full">Full Width</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Alignment</label>
            <select
              value={defaultSettings.alignment}
              onChange={(e) => handleSettingChange('alignment', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rounded"
              checked={defaultSettings.rounded}
              onChange={(e) => handleSettingChange('rounded', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="rounded" className="text-sm font-medium">
              Rounded Corners
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="shadow"
              checked={defaultSettings.shadow}
              onChange={(e) => handleSettingChange('shadow', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="shadow" className="text-sm font-medium">
              Add Shadow
            </label>
          </div>
        </div>

        {/* Link */}
        <div>
          <label className="block text-sm font-medium mb-2">Link (optional)</label>
          <input
            type="url"
            value={defaultSettings.link}
            onChange={(e) => handleSettingChange('link', e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Media Library Modal */}
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={handleMediaSelect}
          fileType="image"
        />
      </div>
    );
  }

  // Preview mode
  if (!defaultContent.url) {
    return (
      <div className="py-8 text-center text-gray-400">
        <FaImage className="text-4xl mx-auto mb-2" />
        <p>No image selected</p>
      </div>
    );
  }

  const imageElement = (
    <img
      src={defaultContent.url}
      alt={defaultContent.alt}
      className={`${getSizeClass()} ${getAlignmentClass()} ${
        defaultSettings.rounded ? 'rounded-lg' : ''
      } ${defaultSettings.shadow ? 'shadow-lg' : ''}`}
    />
  );

  return (
    <div className="py-4">
      {defaultSettings.link ? (
        <a href={defaultSettings.link} target="_blank" rel="noopener noreferrer">
          {imageElement}
        </a>
      ) : (
        imageElement
      )}
      {defaultContent.caption && (
        <p className={`text-sm text-gray-600 mt-2 italic ${getAlignmentClass()}`}>
          {defaultContent.caption}
        </p>
      )}
    </div>
  );
};

export default ImageBlock;
