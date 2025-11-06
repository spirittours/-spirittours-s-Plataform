/**
 * Hero Block Component
 * Full-width hero section with background image and CTA
 */

import React, { useState } from 'react';
import { FaImage } from 'react-icons/fa';
import MediaLibrary from '../common/MediaLibrary';

const HeroBlock = ({ content, settings, onChange, onSettingsChange, isEditing }) => {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const defaultContent = {
    heading: content?.heading || 'Welcome to Our Website',
    subheading: content?.subheading || 'Discover amazing experiences',
    backgroundImage: content?.backgroundImage || '',
    ctaText: content?.ctaText || 'Get Started',
    ctaLink: content?.ctaLink || '#',
    secondaryCtaText: content?.secondaryCtaText || '',
    secondaryCtaLink: content?.secondaryCtaLink || '',
  };

  const defaultSettings = {
    height: settings?.height || 'medium',
    textPosition: settings?.textPosition || 'center',
    textColor: settings?.textColor || '#ffffff',
    overlayOpacity: settings?.overlayOpacity || 0.5,
    overlayColor: settings?.overlayColor || '#000000',
  };

  const handleContentChange = (key, value) => {
    onChange?.({ ...defaultContent, [key]: value });
  };

  const handleSettingChange = (key, value) => {
    onSettingsChange?.({ ...defaultSettings, [key]: value });
  };

  const handleMediaSelect = (asset) => {
    handleContentChange('backgroundImage', asset.url);
    setShowMediaLibrary(false);
  };

  const getHeightClass = () => {
    switch (defaultSettings.height) {
      case 'small':
        return 'h-64 md:h-96';
      case 'medium':
        return 'h-96 md:h-[500px]';
      case 'large':
        return 'h-screen';
      default:
        return 'h-96 md:h-[500px]';
    }
  };

  const getTextPositionClass = () => {
    switch (defaultSettings.textPosition) {
      case 'left':
        return 'items-center justify-start text-left';
      case 'center':
        return 'items-center justify-center text-center';
      case 'right':
        return 'items-center justify-end text-right';
      default:
        return 'items-center justify-center text-center';
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Background Image */}
        <div>
          <label className="block text-sm font-medium mb-2">Background Image</label>
          {defaultContent.backgroundImage ? (
            <div className="relative group">
              <img
                src={defaultContent.backgroundImage}
                alt="Hero background"
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
              <span className="text-gray-600">Select Background Image</span>
            </button>
          )}
        </div>

        {/* Heading */}
        <div>
          <label className="block text-sm font-medium mb-2">Heading</label>
          <input
            type="text"
            value={defaultContent.heading}
            onChange={(e) => handleContentChange('heading', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Subheading */}
        <div>
          <label className="block text-sm font-medium mb-2">Subheading</label>
          <input
            type="text"
            value={defaultContent.subheading}
            onChange={(e) => handleContentChange('subheading', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Primary CTA */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Primary Button Text</label>
            <input
              type="text"
              value={defaultContent.ctaText}
              onChange={(e) => handleContentChange('ctaText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Primary Button Link</label>
            <input
              type="text"
              value={defaultContent.ctaLink}
              onChange={(e) => handleContentChange('ctaLink', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Secondary Button Text (optional)</label>
            <input
              type="text"
              value={defaultContent.secondaryCtaText}
              onChange={(e) => handleContentChange('secondaryCtaText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Secondary Button Link</label>
            <input
              type="text"
              value={defaultContent.secondaryCtaLink}
              onChange={(e) => handleContentChange('secondaryCtaLink', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Height</label>
            <select
              value={defaultSettings.height}
              onChange={(e) => handleSettingChange('height', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large (Full Screen)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Text Position</label>
            <select
              value={defaultSettings.textPosition}
              onChange={(e) => handleSettingChange('textPosition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Overlay Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={defaultSettings.overlayOpacity}
              onChange={(e) => handleSettingChange('overlayOpacity', parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-gray-600">{defaultSettings.overlayOpacity}</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Text Color</label>
            <input
              type="color"
              value={defaultSettings.textColor}
              onChange={(e) => handleSettingChange('textColor', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>
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
  return (
    <div
      className={`relative ${getHeightClass()} flex ${getTextPositionClass()}`}
      style={{
        backgroundImage: defaultContent.backgroundImage
          ? `url(${defaultContent.backgroundImage})`
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: defaultSettings.overlayColor,
          opacity: defaultSettings.overlayOpacity,
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" style={{ color: defaultSettings.textColor }}>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          {defaultContent.heading}
        </h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90">
          {defaultContent.subheading}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          {defaultContent.ctaText && (
            <a
              href={defaultContent.ctaLink}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {defaultContent.ctaText}
            </a>
          )}
          {defaultContent.secondaryCtaText && (
            <a
              href={defaultContent.secondaryCtaLink}
              className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              {defaultContent.secondaryCtaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroBlock;
