/**
 * CMS Block Components Registry
 * Export all available block types
 */

import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';
import HeroBlock from './HeroBlock';
import CTABlock from './CTABlock';
import VideoBlock from './VideoBlock';
import AccordionBlock from './AccordionBlock';
import FormBlock from './FormBlock';
import GalleryBlock from './GalleryBlock';

// Block type definitions with metadata
export const BLOCK_TYPES = {
  text: {
    component: TextBlock,
    label: 'Text',
    description: 'Rich text content with formatting',
    icon: '📝',
    category: 'content',
  },
  image: {
    component: ImageBlock,
    label: 'Image',
    description: 'Single image with caption',
    icon: '🖼️',
    category: 'media',
  },
  video: {
    component: VideoBlock,
    label: 'Video',
    description: 'Embedded video player',
    icon: '🎬',
    category: 'media',
  },
  gallery: {
    component: GalleryBlock,
    label: 'Gallery',
    description: 'Image gallery with lightbox',
    icon: '🖼️',
    category: 'media',
  },
  hero: {
    component: HeroBlock,
    label: 'Hero',
    description: 'Full-width hero section',
    icon: '🎭',
    category: 'layout',
  },
  cta: {
    component: CTABlock,
    label: 'Call to Action',
    description: 'Prominent CTA section',
    icon: '📢',
    category: 'marketing',
  },
  form: {
    component: FormBlock,
    label: 'Form',
    description: 'Contact or lead capture form',
    icon: '📋',
    category: 'forms',
  },
  accordion: {
    component: AccordionBlock,
    label: 'Accordion',
    description: 'Collapsible FAQ sections',
    icon: '📑',
    category: 'content',
  },
  heading: {
    component: TextBlock, // Reuse TextBlock for now
    label: 'Heading',
    description: 'Section heading',
    icon: 'H',
    category: 'content',
  },
  spacer: {
    component: ({ settings }) => (
      <div style={{ height: settings?.height || 40 }} />
    ),
    label: 'Spacer',
    description: 'Add vertical space',
    icon: '↕️',
    category: 'layout',
  },
  divider: {
    component: ({ settings }) => (
      <hr
        style={{
          borderColor: settings?.color || '#e5e7eb',
          borderWidth: settings?.thickness || 1,
          margin: `${settings?.margin || 20}px 0`,
        }}
      />
    ),
    label: 'Divider',
    description: 'Horizontal divider line',
    icon: '➖',
    category: 'layout',
  },
};

// Block categories for organization
export const BLOCK_CATEGORIES = {
  content: {
    label: 'Content',
    icon: '📄',
  },
  media: {
    label: 'Media',
    icon: '🎬',
  },
  layout: {
    label: 'Layout',
    icon: '📐',
  },
  marketing: {
    label: 'Marketing',
    icon: '📣',
  },
  forms: {
    label: 'Forms',
    icon: '📝',
  },
  advanced: {
    label: 'Advanced',
    icon: '⚙️',
  },
};

// Get block component by type
export const getBlockComponent = (type) => {
  return BLOCK_TYPES[type]?.component || TextBlock;
};

// Get all blocks in a category
export const getBlocksByCategory = (category) => {
  return Object.entries(BLOCK_TYPES)
    .filter(([_, block]) => block.category === category)
    .map(([type, block]) => ({ type, ...block }));
};

// Get all block types
export const getAllBlockTypes = () => {
  return Object.entries(BLOCK_TYPES).map(([type, block]) => ({
    type,
    ...block,
  }));
};

export default BLOCK_TYPES;
