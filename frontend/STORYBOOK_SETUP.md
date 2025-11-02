# Storybook Setup Guide

## 📦 Installation

### 1. Install Storybook Dependencies

Add these dependencies to your `package.json`:

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
    "@storybook/jest": "^0.2.3",
    "msw": "^2.0.0",
    "msw-storybook-addon": "^2.0.0",
    "storybook": "^7.6.0"
  },
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### 2. Install Packages

```bash
npm install
```

## 🚀 Quick Start

### Run Storybook

```bash
npm run storybook
```

Storybook will open at http://localhost:6006

### Build Storybook

```bash
npm run build-storybook
```

Output: `storybook-static/` directory

## 📁 Project Structure

```
frontend/
├── .storybook/
│   ├── main.ts              # Core configuration
│   └── preview.tsx          # Global decorators
├── src/
│   ├── components/
│   │   ├── Customer/
│   │   │   ├── CustomerProfile.tsx
│   │   │   └── CustomerProfile.stories.tsx  ✨
│   │   ├── Dashboard/
│   │   │   ├── DashboardWidgets.tsx
│   │   │   └── DashboardWidgets.stories.tsx  ✨
│   │   └── Notifications/
│   │       ├── NotificationCenter.tsx
│   │       └── NotificationCenter.stories.tsx  ✨
└── STORYBOOK.md            # Comprehensive guide
```

## ✨ What's Included

### Stories Created

1. **CustomerProfile.stories.tsx**
   - Default view (Gold tier)
   - Bronze/Silver/Gold/Platinum tiers
   - Loading and error states
   - Mobile, tablet views
   - Dark mode
   - Edit mode examples

2. **DashboardWidgets.stories.tsx**
   - Complete dashboard
   - Stats widgets only
   - Charts only (line, bar, pie, area)
   - Single widget displays
   - Mobile layouts
   - Dark mode

3. **NotificationCenter.stories.tsx**
   - Default with notifications
   - All unread
   - Empty state
   - Filtered by category
   - Filtered by priority
   - Loading and error states
   - Settings variations
   - Dark mode

### Addons Configured

- **Controls** - Interactive prop editing
- **Actions** - Event logging
- **Docs** - Auto-generated documentation
- **Viewport** - Responsive testing (mobile, tablet, desktop)
- **A11y** - Accessibility testing
- **Interactions** - User flow testing
- **Measure** - Element measurements
- **Outline** - Layout visualization

## 🎯 Features

### Theme Switching
Toggle between light and dark themes using the toolbar.

### Responsive Testing
Test components in mobile, tablet, and desktop viewports.

### API Mocking
Stories use MSW (Mock Service Worker) to mock API calls.

### Interactive Controls
Edit component props in real-time using the Controls panel.

### Accessibility Testing
Run automated accessibility checks with the A11y addon.

### Auto-Generated Docs
Component documentation is auto-generated from JSDoc comments and TypeScript types.

## 📖 Usage Examples

### Browse Stories

1. Start Storybook: `npm run storybook`
2. Navigate to Components in the sidebar
3. Select a component to view its stories
4. Use controls panel to modify props
5. Switch themes, viewports, and test interactions

### Creating New Stories

See `STORYBOOK.md` for detailed guide on writing stories.

Quick example:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Hello World',
  },
};
```

## 🔧 Configuration

### main.ts
Core Storybook configuration with:
- Stories glob patterns
- Addons list
- Framework settings (React + Vite)
- TypeScript configuration
- Vite optimization

### preview.tsx
Global decorators and parameters:
- ThemeProvider (Material-UI)
- QueryClientProvider (React Query)
- BrowserRouter (React Router)
- I18nextProvider (i18n)
- Default backgrounds and viewports

## 🎨 Customization

### Custom Viewports

Edit `.storybook/preview.tsx`:

```tsx
viewport: {
  viewports: {
    myDevice: {
      name: 'My Device',
      styles: { width: '1024px', height: '768px' },
    },
  },
}
```

### Custom Themes

Add themes in `preview.tsx`:

```tsx
const customTheme = createTheme({
  palette: {
    primary: { main: '#YOUR_COLOR' },
  },
});
```

## 📊 Statistics

### Current Coverage

- **3 Major Components** documented
- **30+ Stories** created
- **10+ Story variants** per component
- **Full responsive testing** (mobile, tablet, desktop)
- **Dark mode support** for all components
- **API mocking** configured
- **Accessibility testing** enabled

## 🚀 Next Steps

1. **Run Storybook**: `npm run storybook`
2. **Explore Stories**: Browse all component variations
3. **Test Responsiveness**: Use viewport addon
4. **Check Accessibility**: Review A11y addon results
5. **Create More Stories**: Document additional components

## 📚 Resources

- [Storybook Docs](https://storybook.js.org/docs/react/)
- [Writing Stories](https://storybook.js.org/docs/react/writing-stories/introduction)
- [Storybook Addons](https://storybook.js.org/addons)
- [Component Story Format](https://storybook.js.org/docs/react/api/csf)

## 💡 Tips

1. Use `npm run storybook` for development
2. Stories auto-reload on file changes
3. Use controls to test different prop combinations
4. Check A11y addon for accessibility issues
5. Test all viewport sizes
6. Document edge cases (loading, error, empty states)

## 🎓 Learning Path

1. ✅ **Setup** - Install dependencies (you are here)
2. ✅ **Configuration** - Review `.storybook/` files
3. ✅ **Stories** - Explore existing stories
4. **Create** - Write stories for new components
5. **Document** - Add MDX documentation
6. **Test** - Use interaction testing
7. **Deploy** - Build and deploy Storybook

---

**Ready to use!** Run `npm run storybook` to get started.

**Last Updated**: 2024-11-02  
**Version**: 1.0.0
