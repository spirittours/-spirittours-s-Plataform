/**
 * CTA (Call-to-Action) Block Component
 * Prominent call-to-action section
 */

import React from 'react';

const CTABlock = ({ content, settings, onChange, onSettingsChange, isEditing }) => {
  const defaultContent = {
    heading: content?.heading || 'Ready to Get Started?',
    text: content?.text || 'Join thousands of satisfied customers today',
    buttonText: content?.buttonText || 'Get Started Now',
    buttonLink: content?.buttonLink || '#',
  };

  const defaultSettings = {
    style: settings?.style || 'filled',
    backgroundColor: settings?.backgroundColor || '#3b82f6',
    textColor: settings?.textColor || '#ffffff',
    buttonColor: settings?.buttonColor || '#1e40af',
    alignment: settings?.alignment || 'center',
  };

  const handleContentChange = (key, value) => {
    onChange?.({ ...defaultContent, [key]: value });
  };

  const handleSettingChange = (key, value) => {
    onSettingsChange?.({ ...defaultSettings, [key]: value });
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Content */}
        <div>
          <label className="block text-sm font-medium mb-2">Heading</label>
          <input
            type="text"
            value={defaultContent.heading}
            onChange={(e) => handleContentChange('heading', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Text</label>
          <textarea
            value={defaultContent.text}
            onChange={(e) => handleContentChange('text', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Button Text</label>
            <input
              type="text"
              value={defaultContent.buttonText}
              onChange={(e) => handleContentChange('buttonText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Button Link</label>
            <input
              type="text"
              value={defaultContent.buttonLink}
              onChange={(e) => handleContentChange('buttonLink', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Style</label>
            <select
              value={defaultSettings.style}
              onChange={(e) => handleSettingChange('style', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="filled">Filled</option>
              <option value="outlined">Outlined</option>
              <option value="minimal">Minimal</option>
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

          <div>
            <label className="block text-sm font-medium mb-2">Background Color</label>
            <input
              type="color"
              value={defaultSettings.backgroundColor}
              onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
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
      </div>
    );
  }

  // Preview mode
  const getAlignmentClass = () => {
    switch (defaultSettings.alignment) {
      case 'left':
        return 'text-left';
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-center';
    }
  };

  const getStyleClasses = () => {
    switch (defaultSettings.style) {
      case 'filled':
        return 'py-16 rounded-lg';
      case 'outlined':
        return 'py-16 rounded-lg border-2';
      case 'minimal':
        return 'py-12';
      default:
        return 'py-16 rounded-lg';
    }
  };

  return (
    <div
      className={`${getStyleClasses()} ${getAlignmentClass()} px-8`}
      style={{
        backgroundColor: defaultSettings.style !== 'minimal' ? defaultSettings.backgroundColor : 'transparent',
        borderColor: defaultSettings.style === 'outlined' ? defaultSettings.backgroundColor : 'transparent',
        color: defaultSettings.textColor,
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{defaultContent.heading}</h2>
        <p className="text-lg md:text-xl mb-8 opacity-90">{defaultContent.text}</p>
        <a
          href={defaultContent.buttonLink}
          className="inline-block px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          style={{
            backgroundColor: defaultSettings.buttonColor,
            color: '#ffffff',
          }}
        >
          {defaultContent.buttonText}
        </a>
      </div>
    </div>
  );
};

export default CTABlock;
