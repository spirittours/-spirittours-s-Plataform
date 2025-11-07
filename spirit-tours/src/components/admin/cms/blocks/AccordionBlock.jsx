/**
 * Accordion Block Component
 * Collapsible sections for FAQs, content organization
 */

import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaTrash } from 'react-icons/fa';

const AccordionBlock = ({ content, settings, onChange, onSettingsChange, isEditing }) => {
  const defaultContent = {
    items: content?.items || [
      {
        id: '1',
        title: 'Accordion Item 1',
        content: 'Content for accordion item 1',
      },
    ],
  };

  const defaultSettings = {
    allowMultiple: settings?.allowMultiple || false,
    startOpen: settings?.startOpen || false,
    style: settings?.style || 'bordered', // bordered, minimal, filled
  };

  const [openItems, setOpenItems] = useState(
    defaultSettings.startOpen ? new Set(defaultContent.items.map((item) => item.id)) : new Set()
  );

  const handleContentChange = (newItems) => {
    onChange?.({ ...defaultContent, items: newItems });
  };

  const handleSettingChange = (key, value) => {
    onSettingsChange?.({ ...defaultSettings, [key]: value });
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      title: `New Item ${defaultContent.items.length + 1}`,
      content: 'Content goes here...',
    };
    handleContentChange([...defaultContent.items, newItem]);
  };

  const updateItem = (id, field, value) => {
    const updatedItems = defaultContent.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    handleContentChange(updatedItems);
  };

  const removeItem = (id) => {
    const updatedItems = defaultContent.items.filter((item) => item.id !== id);
    handleContentChange(updatedItems);
  };

  const toggleItem = (id) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      if (!defaultSettings.allowMultiple) {
        newOpenItems.clear();
      }
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const getStyleClasses = () => {
    switch (defaultSettings.style) {
      case 'bordered':
        return {
          container: 'border border-gray-300 rounded-lg overflow-hidden',
          item: 'border-b border-gray-200 last:border-b-0',
          header: 'bg-white hover:bg-gray-50',
          content: 'bg-white',
        };
      case 'filled':
        return {
          container: 'space-y-2',
          item: 'bg-gray-100 rounded-lg overflow-hidden',
          header: 'bg-gray-100 hover:bg-gray-200',
          content: 'bg-white',
        };
      case 'minimal':
        return {
          container: 'space-y-1',
          item: 'border-b border-gray-200',
          header: 'hover:bg-gray-50',
          content: 'bg-transparent',
        };
      default:
        return {
          container: 'border border-gray-300 rounded-lg overflow-hidden',
          item: 'border-b border-gray-200 last:border-b-0',
          header: 'bg-white hover:bg-gray-50',
          content: 'bg-white',
        };
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Style</label>
            <select
              value={defaultSettings.style}
              onChange={(e) => handleSettingChange('style', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="bordered">Bordered</option>
              <option value="filled">Filled</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <div className="space-y-2 pt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={defaultSettings.allowMultiple}
                onChange={(e) => handleSettingChange('allowMultiple', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Allow Multiple Open</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={defaultSettings.startOpen}
                onChange={(e) => handleSettingChange('startOpen', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Start All Open</span>
            </label>
          </div>
        </div>

        {/* Items Editor */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium">Accordion Items</label>
            <button
              onClick={addItem}
              className="btn btn-sm btn-secondary flex items-center"
            >
              <FaPlus className="mr-1" /> Add Item
            </button>
          </div>

          {defaultContent.items.map((item, index) => (
            <div key={item.id} className="border border-gray-300 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Item {index + 1}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-700"
                  title="Remove item"
                >
                  <FaTrash />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Content</label>
                <textarea
                  value={item.content}
                  onChange={(e) => updateItem(item.id, 'content', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Preview mode
  const styleClasses = getStyleClasses();

  return (
    <div className="py-4 max-w-4xl mx-auto">
      <div className={styleClasses.container}>
        {defaultContent.items.map((item) => {
          const isOpen = openItems.has(item.id);

          return (
            <div key={item.id} className={styleClasses.item}>
              <button
                onClick={() => toggleItem(item.id)}
                className={`w-full px-6 py-4 flex justify-between items-center transition-colors ${styleClasses.header}`}
              >
                <span className="font-semibold text-left">{item.title}</span>
                {isOpen ? (
                  <FaChevronUp className="text-gray-600 flex-shrink-0 ml-4" />
                ) : (
                  <FaChevronDown className="text-gray-600 flex-shrink-0 ml-4" />
                )}
              </button>

              {isOpen && (
                <div className={`px-6 py-4 ${styleClasses.content}`}>
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AccordionBlock;
