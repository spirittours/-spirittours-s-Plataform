/**
 * Text Block Component
 * Rich text content block with full formatting options
 */

import React from 'react';
import RichTextEditor from '../editors/RichTextEditor';

const TextBlock = ({ content, settings, onChange, onSettingsChange, isEditing }) => {
  const defaultContent = {
    html: content?.html || '<p>Enter your text here...</p>',
  };

  const defaultSettings = {
    alignment: settings?.alignment || 'left',
    maxWidth: settings?.maxWidth || 'full',
    padding: settings?.padding || 'medium',
    backgroundColor: settings?.backgroundColor || 'transparent',
    textColor: settings?.textColor || '#000000',
  };

  const handleContentChange = (html) => {
    onChange?.({ ...defaultContent, html });
  };

  const handleSettingChange = (key, value) => {
    onSettingsChange?.({ ...defaultSettings, [key]: value });
  };

  const getMaxWidthClass = () => {
    switch (defaultSettings.maxWidth) {
      case 'narrow':
        return 'max-w-2xl';
      case 'medium':
        return 'max-w-4xl';
      case 'wide':
        return 'max-w-6xl';
      case 'full':
      default:
        return 'max-w-full';
    }
  };

  const getPaddingClass = () => {
    switch (defaultSettings.padding) {
      case 'none':
        return 'py-0';
      case 'small':
        return 'py-4';
      case 'medium':
        return 'py-8';
      case 'large':
        return 'py-12';
      default:
        return 'py-8';
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium mb-2">Content</label>
          <RichTextEditor
            content={defaultContent.html}
            onChange={handleContentChange}
          />
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
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
              <option value="justify">Justify</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Max Width</label>
            <select
              value={defaultSettings.maxWidth}
              onChange={(e) => handleSettingChange('maxWidth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="narrow">Narrow</option>
              <option value="medium">Medium</option>
              <option value="wide">Wide</option>
              <option value="full">Full Width</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Padding</label>
            <select
              value={defaultSettings.padding}
              onChange={(e) => handleSettingChange('padding', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="none">None</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
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
        </div>
      </div>
    );
  }

  // Preview mode
  return (
    <div
      className={`${getPaddingClass()} ${getMaxWidthClass()} mx-auto`}
      style={{
        backgroundColor: defaultSettings.backgroundColor,
        color: defaultSettings.textColor,
        textAlign: defaultSettings.alignment,
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: defaultContent.html }} />
    </div>
  );
};

export default TextBlock;
