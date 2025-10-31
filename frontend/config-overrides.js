/**
 * Webpack Configuration Overrides for React Scripts
 * 
 * This file provides custom webpack optimizations for code splitting,
 * bundle size optimization, and performance improvements.
 * 
 * To use this file, install: npm install --save-dev react-app-rewired
 * Then update package.json scripts to use react-app-rewired instead of react-scripts
 */

const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = function override(config, env) {
  // ============================================================================
  // CODE SPLITTING OPTIMIZATION
  // ============================================================================

  config.optimization = {
    ...config.optimization,
    
    // Split chunks strategy
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk for node_modules
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        
        // React and React-DOM in separate chunk
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react-vendor',
          priority: 20,
          reuseExistingChunk: true,
        },
        
        // Material-UI in separate chunk
        mui: {
          test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
          name: 'mui-vendor',
          priority: 20,
          reuseExistingChunk: true,
        },
        
        // Charts libraries
        charts: {
          test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts)[\\/]/,
          name: 'charts-vendor',
          priority: 15,
          reuseExistingChunk: true,
        },
        
        // Router libraries
        router: {
          test: /[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/,
          name: 'router-vendor',
          priority: 15,
          reuseExistingChunk: true,
        },
        
        // Common components used across the app
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
          name: 'common',
        },
      },
    },
    
    // Runtime chunk for webpack runtime code
    runtimeChunk: {
      name: 'runtime',
    },
    
    // Module IDs
    moduleIds: 'deterministic',
    
    // Minimize configuration
    minimize: env === 'production',
  };

  // ============================================================================
  // PERFORMANCE HINTS
  // ============================================================================

  config.performance = {
    maxEntrypointSize: 512000, // 500kb
    maxAssetSize: 512000, // 500kb
    hints: env === 'production' ? 'warning' : false,
  };

  // ============================================================================
  // BUNDLE ANALYZER (Development only)
  // ============================================================================

  if (env === 'development' && process.env.ANALYZE === 'true') {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        analyzerPort: 8888,
        openAnalyzer: true,
        generateStatsFile: true,
        statsFilename: 'bundle-stats.json',
      })
    );
  }

  // ============================================================================
  // PRODUCTION OPTIMIZATIONS
  // ============================================================================

  if (env === 'production') {
    // Tree shaking optimization
    config.optimization.usedExports = true;
    
    // Minimize CSS
    config.optimization.minimizer = config.optimization.minimizer || [];
    
    // Source maps for production debugging
    config.devtool = 'source-map';
    
    // Compression plugins
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      })
    );
  }

  // ============================================================================
  // RESOLVE CONFIGURATION
  // ============================================================================

  config.resolve = {
    ...config.resolve,
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
    alias: {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      '@components': require('path').resolve(__dirname, 'src/components'),
      '@services': require('path').resolve(__dirname, 'src/services'),
      '@hooks': require('path').resolve(__dirname, 'src/hooks'),
      '@utils': require('path').resolve(__dirname, 'src/utils'),
      '@store': require('path').resolve(__dirname, 'src/store'),
    },
  };

  // ============================================================================
  // MODULE RULES
  // ============================================================================

  // Add support for worker files
  config.module.rules.push({
    test: /\.worker\.(js|ts)$/,
    use: { loader: 'worker-loader' },
  });

  return config;
};
