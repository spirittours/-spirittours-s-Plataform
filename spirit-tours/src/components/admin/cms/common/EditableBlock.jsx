/**
 * Editable Block Component
 * Wrapper for blocks with edit/delete controls and drag handle
 */

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FaGripVertical,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEyeSlash,
  FaChevronUp,
  FaChevronDown,
  FaSave,
  FaTimes,
} from 'react-icons/fa';
import { getBlockComponent } from '../blocks';

const EditableBlock = ({
  block,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isEditing: defaultIsEditing = false,
}) => {
  const [isEditing, setIsEditing] = useState(defaultIsEditing);
  const [tempContent, setTempContent] = useState(block.content);
  const [tempSettings, setTempSettings] = useState(block.settings);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const BlockComponent = getBlockComponent(block.type);

  const handleSave = () => {
    onUpdate?.({
      ...block,
      content: tempContent,
      settings: tempSettings,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempContent(block.content);
    setTempSettings(block.settings);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this block?')) {
      onDelete?.(block.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-lg ${
        isEditing ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-300'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* Toolbar */}
      <div
        className={`absolute -top-12 left-0 right-0 flex items-center justify-between bg-white border border-gray-300 rounded-t-lg px-3 py-2 shadow-sm ${
          isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity z-10`}
      >
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-move p-1 hover:bg-gray-100 rounded text-gray-500"
            title="Drag to reorder"
          >
            <FaGripVertical />
          </button>

          {/* Block Type Label */}
          <span className="text-sm font-medium text-gray-700 px-2">
            {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              {/* Save Button */}
              <button
                onClick={handleSave}
                className="p-2 hover:bg-green-100 text-green-600 rounded transition-colors"
                title="Save changes"
              >
                <FaSave />
              </button>
              {/* Cancel Button */}
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 text-gray-600 rounded transition-colors"
                title="Cancel"
              >
                <FaTimes />
              </button>
            </>
          ) : (
            <>
              {/* Move Up */}
              {!isFirst && (
                <button
                  onClick={onMoveUp}
                  className="p-2 hover:bg-gray-100 text-gray-600 rounded transition-colors"
                  title="Move up"
                >
                  <FaChevronUp />
                </button>
              )}
              {/* Move Down */}
              {!isLast && (
                <button
                  onClick={onMoveDown}
                  className="p-2 hover:bg-gray-100 text-gray-600 rounded transition-colors"
                  title="Move down"
                >
                  <FaChevronDown />
                </button>
              )}
              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                title="Edit"
              >
                <FaEdit />
              </button>
              {/* Duplicate Button */}
              <button
                onClick={() => onDuplicate?.(block)}
                className="p-2 hover:bg-gray-100 text-gray-600 rounded transition-colors"
                title="Duplicate"
              >
                <FaCopy />
              </button>
              {/* Delete Button */}
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                title="Delete"
              >
                <FaTrash />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Block Content */}
      <div className={`${isEditing ? 'p-6' : 'p-0'}`}>
        {BlockComponent && (
          <BlockComponent
            content={isEditing ? tempContent : block.content}
            settings={isEditing ? tempSettings : block.settings}
            onChange={setTempContent}
            onSettingsChange={setTempSettings}
            isEditing={isEditing}
          />
        )}
      </div>

      {/* Hidden/Visible Indicator */}
      {block.hidden && (
        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs flex items-center gap-1">
          <FaEyeSlash className="text-xs" />
          <span>Hidden</span>
        </div>
      )}
    </div>
  );
};

export default EditableBlock;
