/**
 * Block Palette Component
 * Sidebar palette of available blocks for drag-and-drop
 */

import React, { useState } from 'react';
import { BLOCK_CATEGORIES, getBlocksByCategory, getAllBlockTypes } from '../blocks';
import { FaSearch, FaTimes } from 'react-icons/fa';

const BlockPalette = ({ onAddBlock, isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Get filtered blocks
  const getFilteredBlocks = () => {
    let blocks = activeCategory === 'all' 
      ? getAllBlockTypes()
      : getBlocksByCategory(activeCategory);

    if (searchQuery) {
      blocks = blocks.filter(
        (block) =>
          block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          block.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return blocks;
  };

  const handleAddBlock = (blockType) => {
    onAddBlock?.(blockType);
  };

  const filteredBlocks = getFilteredBlocks();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Add Block</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <FaTimes />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {Object.entries(BLOCK_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                activeCategory === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Block List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBlocks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No blocks found</p>
            <p className="text-sm mt-2">Try adjusting your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBlocks.map((block) => (
              <button
                key={block.type}
                onClick={() => handleAddBlock(block.type)}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-start">
                  <span className="text-3xl mr-3 group-hover:scale-110 transition-transform">
                    {block.icon}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {block.label}
                    </h4>
                    <p className="text-sm text-gray-600">{block.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          Click on a block to add it to your page
        </p>
      </div>
    </div>
  );
};

export default BlockPalette;
