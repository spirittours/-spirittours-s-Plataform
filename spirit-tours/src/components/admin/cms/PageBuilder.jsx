/**
 * Page Builder Component
 * Main drag-and-drop page editor with block management
 */

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  FaPlus,
  FaSave,
  FaEye,
  FaUndo,
  FaRedo,
  FaCog,
  FaMobileAlt,
  FaTabletAlt,
  FaDesktop,
} from 'react-icons/fa';
import EditableBlock from './common/EditableBlock';
import BlockPalette from './common/BlockPalette';
import SEOSettings from './common/SEOSettings';
import { pageAPI } from '../../../services/api/cms/cmsAPI';

const PageBuilder = ({ pageId, initialData, onSave }) => {
  const [sections, setSections] = useState(initialData?.sections || []);
  const [history, setHistory] = useState([initialData?.sections || []]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showBlockPalette, setShowBlockPalette] = useState(false);
  const [showSEOSettings, setShowSEOSettings] = useState(false);
  const [viewMode, setViewMode] = useState('desktop'); // desktop, tablet, mobile
  const [pageData, setPageData] = useState(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-save effect
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (sections.length > 0 && pageId) {
        handleAutoSave();
      }
    }, 60000); // Auto-save every minute

    return () => clearInterval(autoSaveInterval);
  }, [sections, pageId]);

  // Add to history
  const addToHistory = (newSections) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSections);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newSections = arrayMove(items, oldIndex, newIndex);
        addToHistory(newSections);
        return newSections;
      });
    }
  };

  // Add new block
  const handleAddBlock = (blockType) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      content: {},
      settings: {},
      order: sections.length,
    };

    const newSections = [...sections, newBlock];
    setSections(newSections);
    addToHistory(newSections);
    setShowBlockPalette(false);
  };

  // Update block
  const handleUpdateBlock = (updatedBlock) => {
    const newSections = sections.map((section) =>
      section.id === updatedBlock.id ? updatedBlock : section
    );
    setSections(newSections);
    addToHistory(newSections);
  };

  // Delete block
  const handleDeleteBlock = (blockId) => {
    const newSections = sections.filter((section) => section.id !== blockId);
    setSections(newSections);
    addToHistory(newSections);
  };

  // Duplicate block
  const handleDuplicateBlock = (block) => {
    const newBlock = {
      ...block,
      id: `block-${Date.now()}`,
    };
    const blockIndex = sections.findIndex((s) => s.id === block.id);
    const newSections = [
      ...sections.slice(0, blockIndex + 1),
      newBlock,
      ...sections.slice(blockIndex + 1),
    ];
    setSections(newSections);
    addToHistory(newSections);
  };

  // Move block up
  const handleMoveUp = (blockId) => {
    const index = sections.findIndex((s) => s.id === blockId);
    if (index > 0) {
      const newSections = arrayMove(sections, index, index - 1);
      setSections(newSections);
      addToHistory(newSections);
    }
  };

  // Move block down
  const handleMoveDown = (blockId) => {
    const index = sections.findIndex((s) => s.id === blockId);
    if (index < sections.length - 1) {
      const newSections = arrayMove(sections, index, index + 1);
      setSections(newSections);
      addToHistory(newSections);
    }
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSections(history[historyIndex - 1]);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSections(history[historyIndex + 1]);
    }
  };

  // Auto-save
  const handleAutoSave = async () => {
    try {
      await pageAPI.updatePage(pageId, {
        sections,
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Save
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedPage = {
        ...pageData,
        sections,
      };

      if (pageId) {
        await pageAPI.updatePage(pageId, updatedPage);
      }

      setLastSaved(new Date());
      onSave?.(updatedPage);
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Failed to save page. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Preview
  const handlePreview = () => {
    // Open preview in new window
    window.open(`/preview/${pageId}`, '_blank');
  };

  // Get viewport width class
  const getViewportClass = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm';
      case 'tablet':
        return 'max-w-3xl';
      case 'desktop':
      default:
        return 'max-w-full';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBlockPalette(true)}
                className="btn btn-primary"
              >
                <FaPlus className="mr-2" />
                Add Block
              </button>

              <button
                onClick={handleUndo}
                disabled={historyIndex === 0}
                className="btn btn-secondary"
                title="Undo"
              >
                <FaUndo />
              </button>

              <button
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
                className="btn btn-secondary"
                title="Redo"
              >
                <FaRedo />
              </button>
            </div>

            {/* Center - Viewport Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('mobile')}
                className={`p-2 rounded ${
                  viewMode === 'mobile' ? 'bg-white shadow' : 'hover:bg-gray-200'
                }`}
                title="Mobile View"
              >
                <FaMobileAlt />
              </button>
              <button
                onClick={() => setViewMode('tablet')}
                className={`p-2 rounded ${
                  viewMode === 'tablet' ? 'bg-white shadow' : 'hover:bg-gray-200'
                }`}
                title="Tablet View"
              >
                <FaTabletAlt />
              </button>
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-2 rounded ${
                  viewMode === 'desktop' ? 'bg-white shadow' : 'hover:bg-gray-200'
                }`}
                title="Desktop View"
              >
                <FaDesktop />
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-sm text-gray-600">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}

              <button
                onClick={() => setShowSEOSettings(true)}
                className="btn btn-secondary"
              >
                <FaCog className="mr-2" />
                SEO
              </button>

              <button onClick={handlePreview} className="btn btn-secondary">
                <FaEye className="mr-2" />
                Preview
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary"
              >
                <FaSave className="mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`mx-auto transition-all ${getViewportClass()}`}>
          {sections.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-2xl font-semibold mb-2">Start Building Your Page</h3>
              <p className="text-gray-600 mb-6">
                Add blocks to create your content. Click the "Add Block" button to begin.
              </p>
              <button
                onClick={() => setShowBlockPalette(true)}
                className="btn btn-primary"
              >
                <FaPlus className="mr-2" />
                Add Your First Block
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-16">
                  {sections.map((section, index) => (
                    <EditableBlock
                      key={section.id}
                      block={section}
                      onUpdate={handleUpdateBlock}
                      onDelete={handleDeleteBlock}
                      onDuplicate={handleDuplicateBlock}
                      onMoveUp={() => handleMoveUp(section.id)}
                      onMoveDown={() => handleMoveDown(section.id)}
                      isFirst={index === 0}
                      isLast={index === sections.length - 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Block Palette Sidebar */}
      <BlockPalette
        isOpen={showBlockPalette}
        onClose={() => setShowBlockPalette(false)}
        onAddBlock={handleAddBlock}
      />

      {/* SEO Settings Modal */}
      {showSEOSettings && (
        <SEOSettings
          pageData={pageData}
          onSave={(seoData) => {
            setPageData({ ...pageData, seo: seoData });
            setShowSEOSettings(false);
          }}
          onClose={() => setShowSEOSettings(false)}
        />
      )}
    </div>
  );
};

export default PageBuilder;
