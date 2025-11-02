// Storybook Documentation Guide

## 🎨 Spirit Tours Storybook

Comprehensive component library documentation and development environment.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Running Storybook](#running-storybook)
- [Component Stories](#component-stories)
- [Writing Stories](#writing-stories)
- [Addons](#addons)
- [Best Practices](#best-practices)
- [Building Storybook](#building-storybook)

## 🚀 Getting Started

### Installation

Storybook dependencies are included in package.json. To install:

```bash
cd frontend
npm install
```

### Required Dependencies

```json
{
  "devDependencies": {
    "@storybook/react": "^7.6.0",
    "@storybook/react-vite": "^7.6.0",
    "@storybook/addon-links": "^7.6.0",
    "@storybook/addon-essentials": "^7.6.0",
    "@storybook/addon-interactions": "^7.6.0",
    "@storybook/addon-a11y": "^7.6.0",
    "@storybook/addon-viewport": "^7.6.0",
    "@storybook/addon-measure": "^7.6.0",
    "@storybook/addon-outline": "^7.6.0",
    "@storybook/testing-library": "^0.2.2",
    "msw": "^2.0.0",
    "msw-storybook-addon": "^2.0.0"
  }
}
```

## 🎯 Running Storybook

### Development Mode

Start Storybook in development mode with hot-reload:

```bash
npm run storybook
```

This will start Storybook on http://localhost:6006

### Build Static Storybook

Build a static version for deployment:

```bash
npm run build-storybook
```

Output will be in `storybook-static/` directory.

## 📚 Component Stories

### Available Stories

#### Customer Components
- **CustomerProfile** - Complete customer profile management
  - Default view (Gold tier)
  - Bronze/Silver/Gold/Platinum tiers
  - Loading and error states
  - Mobile and tablet layouts
  - Dark mode
  - Edit mode demonstrations

#### Dashboard Components
- **DashboardWidgets** - Modular widget system
  - Complete dashboard (all widget types)
  - Stats widgets only
  - Charts only (line, bar, pie, area)
  - Single widget displays
  - Mobile layouts
  - Dark mode

#### Notification Components
- **NotificationCenter** - Real-time notification system
  - Default with mixed notifications
  - All unread notifications
  - Empty state
  - Filtered by category (booking, payment, promo)
  - Filtered by priority (urgent, high)
  - Loading and error states
  - Settings variations
  - Dark mode

## ✍️ Writing Stories

### Story Structure

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta = {
  title: 'Components/Category/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Detailed component description with features and usage',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    prop1: {
      description: 'Description of prop1',
      control: 'text',
    },
  },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    prop1: 'value1',
  },
};
```

### Story Types

1. **Default Story** - Basic component usage
2. **Variants** - Different configurations/states
3. **Interactive Stories** - User interaction examples
4. **Edge Cases** - Error states, loading, empty states
5. **Responsive** - Mobile, tablet, desktop layouts
6. **Theming** - Light/dark mode variations

### API Mocking with MSW

Mock API calls in stories using Mock Service Worker:

```tsx
export const WithData: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/data', (req, res, ctx) => {
          return res(ctx.json({ data: 'mock data' }));
        }),
      ],
    },
  },
};
```

## 🧩 Addons

### Essential Addons

1. **Controls** - Interactive prop editing
   - Modify component props in real-time
   - Test different configurations

2. **Actions** - Event logging
   - Track user interactions
   - Debug event handlers

3. **Docs** - Auto-generated documentation
   - Component API documentation
   - Props table
   - Usage examples

4. **Viewport** - Responsive testing
   - Test mobile, tablet, desktop layouts
   - Custom viewport sizes

5. **A11y** - Accessibility testing
   - WCAG compliance checks
   - Contrast ratios
   - Keyboard navigation

6. **Interactions** - User flow testing
   - Test user interactions
   - Verify component behavior

### Using Addons

#### Controls
```tsx
argTypes: {
  backgroundColor: { control: 'color' },
  size: { control: { type: 'select', options: ['small', 'medium', 'large'] } },
  disabled: { control: 'boolean' },
}
```

#### Actions
```tsx
argTypes: {
  onClick: { action: 'clicked' },
  onChange: { action: 'changed' },
}
```

#### Viewport
```tsx
parameters: {
  viewport: {
    defaultViewport: 'mobile',
  },
}
```

## 🎨 Best Practices

### 1. Component Organization

```
src/components/
├── ComponentName/
│   ├── ComponentName.tsx
│   ├── ComponentName.stories.tsx
│   ├── ComponentName.test.tsx
│   └── index.ts
```

### 2. Story Naming

Use descriptive names that explain the story:
- ✅ `CustomerProfileWithGoldTier`
- ✅ `DashboardWithAllWidgets`
- ❌ `Test1`
- ❌ `Example`

### 3. Documentation

Always include:
- Component description
- Feature list
- Usage examples
- Props documentation
- API examples

### 4. Story Coverage

Create stories for:
- Default/happy path
- All prop variations
- Loading states
- Error states
- Empty states
- Mobile/tablet layouts
- Dark mode
- Edge cases

### 5. Args vs Parameters

**Args** - Component props:
```tsx
args: {
  title: 'My Title',
  onClick: () => {},
}
```

**Parameters** - Story configuration:
```tsx
parameters: {
  layout: 'centered',
  viewport: { defaultViewport: 'mobile' },
}
```

## 🏗️ Building Storybook

### For Production

```bash
npm run build-storybook
```

### Deploy to Static Hosting

1. **Vercel**
```bash
vercel --prod storybook-static
```

2. **Netlify**
```bash
netlify deploy --prod --dir=storybook-static
```

3. **GitHub Pages**
```bash
# Add to .github/workflows/storybook.yml
- name: Build Storybook
  run: npm run build-storybook
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./storybook-static
```

### Chromatic (Visual Testing)

```bash
npm install --save-dev chromatic
npx chromatic --project-token=<token>
```

## 🔧 Configuration

### main.ts

Core Storybook configuration:
- Stories location
- Addons
- Framework settings
- Build optimization

### preview.tsx

Global decorators and parameters:
- Theme provider
- Router setup
- Query client
- Global styles
- Default parameters

## 📱 Responsive Testing

### Viewport Presets

```tsx
parameters: {
  viewport: {
    viewports: {
      mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
      tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
      desktop: { name: 'Desktop', styles: { width: '1920px', height: '1080px' } },
    },
  },
}
```

## 🎭 Theming

### Light/Dark Mode

Toggle theme in toolbar or story-specific:

```tsx
globals: {
  theme: 'dark',
}
```

### Custom Themes

Define themes in `preview.tsx`:

```tsx
const lightTheme = createTheme({ palette: { mode: 'light' } });
const darkTheme = createTheme({ palette: { mode: 'dark' } });
```

## 🧪 Testing

### Interaction Testing

```tsx
import { userEvent, within } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

export const TestInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(canvas.getByText('Success')).toBeInTheDocument();
  },
};
```

## 📖 Documentation

### MDX Stories

Create rich documentation with MDX:

```mdx
import { Meta, Canvas, Story } from '@storybook/blocks';
import * as Stories from './Component.stories';

<Meta of={Stories} />

# Component Name

Component description and usage guide.

<Canvas>
  <Story of={Stories.Default} />
</Canvas>

## Props

<ArgTypes of={Stories} />
```

## 🚀 Performance

### Optimization Tips

1. **Lazy Loading**
   - Stories are lazy-loaded by default

2. **Code Splitting**
   - Use dynamic imports for large dependencies

3. **Build Optimization**
   - Vite builds are optimized automatically

4. **Assets**
   - Use CDN for large assets
   - Optimize images

## 🔗 Resources

- [Storybook Documentation](https://storybook.js.org/docs/react/)
- [Storybook Addons](https://storybook.js.org/addons)
- [Component Story Format (CSF)](https://storybook.js.org/docs/react/api/csf)
- [Testing with Storybook](https://storybook.js.org/docs/react/writing-tests/introduction)

## 💡 Tips

1. **Use Controls** - Make props editable for interactive testing
2. **Document Everything** - Good docs = happy developers
3. **Test Edge Cases** - Loading, errors, empty states
4. **Mobile First** - Always test responsive layouts
5. **Accessibility** - Use A11y addon to catch issues
6. **Version Control** - Commit story files with components
7. **Visual Testing** - Use Chromatic for regression testing

## 🎓 Examples

### Complete Story Example

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and sizes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select', options: ['primary', 'secondary', 'outline'] },
    },
    size: {
      control: { type: 'radio', options: ['small', 'medium', 'large'] },
    },
    disabled: {
      control: 'boolean',
    },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
    onClick: action('button-click'),
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    children: 'Large Button',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};
```

---

**Last Updated**: 2024-11-02  
**Version**: 1.0.0  
**Maintainer**: Spirit Tours Development Team
