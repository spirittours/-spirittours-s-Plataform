/**
 * Rich Text Editor Component
 * TipTap-based WYSIWYG editor for CMS content
 */

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaCode,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaUndo,
  FaRedo,
  FaLink,
  FaImage,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaHeading,
} from 'react-icons/fa';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1">
      {/* Text Style Buttons */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('bold') ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Bold"
      >
        <FaBold />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('italic') ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Italic"
      >
        <FaItalic />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('strike') ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Strikethrough"
      >
        <FaStrikethrough />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('code') ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Code"
      >
        <FaCode />
      </button>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('heading', { level: 1 }) ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Heading 1"
      >
        <span className="flex items-center">
          <FaHeading className="text-sm" />
          <span className="text-xs ml-1">1</span>
        </span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('heading', { level: 2 }) ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Heading 2"
      >
        <span className="flex items-center">
          <FaHeading className="text-sm" />
          <span className="text-xs ml-1">2</span>
        </span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('heading', { level: 3 }) ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Heading 3"
      >
        <span className="flex items-center">
          <FaHeading className="text-sm" />
          <span className="text-xs ml-1">3</span>
        </span>
      </button>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('bulletList') ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Bullet List"
      >
        <FaListUl />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('orderedList') ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Ordered List"
      >
        <FaListOl />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('blockquote') ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Blockquote"
      >
        <FaQuoteRight />
      </button>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      {/* Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Align Left"
      >
        <FaAlignLeft />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Align Center"
      >
        <FaAlignCenter />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Align Right"
      >
        <FaAlignRight />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Justify"
      >
        <FaAlignJustify />
      </button>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      {/* Link & Image */}
      <button
        onClick={addLink}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive('link') ? 'bg-gray-300 text-blue-600' : ''
        }`}
        title="Add Link"
      >
        <FaLink />
      </button>
      <button
        onClick={addImage}
        className="p-2 rounded hover:bg-gray-200"
        title="Add Image"
      >
        <FaImage />
      </button>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Undo"
      >
        <FaUndo />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Redo"
      >
        <FaRedo />
      </button>
    </div>
  );
};

const RichTextEditor = ({ content = '', onChange, placeholder = 'Start typing...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="min-h-[200px]" />
    </div>
  );
};

export default RichTextEditor;
