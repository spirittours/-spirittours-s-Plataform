/**
 * Storybook Main Configuration
 * @see https://storybook.js.org/docs/react/configure/overview
 */

import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
  ],
  
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true
      ),
    },
  },

  viteFinal: async (config) => {
    return mergeConfig(config, {
      optimizeDeps: {
        include: ['@mui/material', '@emotion/react', '@emotion/styled'],
      },
    });
  },
};

export default config;
