#!/usr/bin/env node

/**
 * Spirit Tours Logo Variant Generator
 * Generates all required logo variants from the master logo file
 * Including favicons, social media images, and optimized versions
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const svgo = require('svgo');

// Logo color scheme based on brand
const BRAND_COLORS = {
  primary: '#2563eb',
  primaryDark: '#1e3a8a',
  accent: '#9333ea',
  white: '#ffffff',
};

// Logo variant configurations
const LOGO_VARIANTS = {
  // Favicon variants
  favicons: [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'safari-pinned-tab.svg', size: 512, format: 'svg' },
    { name: 'mstile-150x150.png', size: 150 },
  ],
  
  // Social media variants
  social: [
    { name: 'spirit-tours-og.png', width: 1200, height: 630 }, // Open Graph
    { name: 'spirit-tours-twitter.png', width: 1200, height: 600 }, // Twitter
    { name: 'spirit-tours-whatsapp.png', width: 400, height: 400 }, // WhatsApp
    { name: 'spirit-tours-linkedin.png', width: 1200, height: 627 }, // LinkedIn
    { name: 'spirit-tours-instagram.png', width: 1080, height: 1080 }, // Instagram
  ],
  
  // Logo versions
  logos: [
    { name: 'spirit-tours-full.png', width: 400, height: 150 }, // Full logo
    { name: 'spirit-tours-compact.png', width: 250, height: 100 }, // Compact
    { name: 'spirit-tours-icon.png', size: 100 }, // Icon only
    { name: 'spirit-tours-email.png', width: 200, height: 70, quality: 60 }, // Email optimized
    { name: 'spirit-tours-white.png', width: 400, height: 150 }, // White version
    { name: 'spirit-tours-dark.png', width: 400, height: 150 }, // Dark version
  ],
  
  // App icons
  appIcons: [
    { name: 'app-icon-ios.png', size: 1024 }, // iOS App Store
    { name: 'app-icon-android.png', size: 512 }, // Google Play Store
  ],
};

// Directories
const INPUT_DIR = path.join(__dirname, '..', 'assets', 'logo', 'source');
const OUTPUT_DIR = path.join(__dirname, '..', 'frontend', 'public');
const CDN_DIR = path.join(__dirname, '..', 'assets', 'logo', 'cdn');

/**
 * Ensure directories exist
 */
async function ensureDirectories() {
  const dirs = [
    OUTPUT_DIR,
    path.join(OUTPUT_DIR, 'icons'),
    path.join(OUTPUT_DIR, 'social'),
    CDN_DIR,
    path.join(CDN_DIR, 'favicons'),
    path.join(CDN_DIR, 'social'),
    path.join(CDN_DIR, 'logos'),
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Generate favicon variants
 */
async function generateFavicons(inputBuffer) {
  console.log('🎨 Generating favicon variants...');
  
  for (const config of LOGO_VARIANTS.favicons) {
    if (config.format === 'svg') {
      // For SVG, we'll create a simplified version
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <circle cx="256" cy="256" r="240" fill="${BRAND_COLORS.primary}"/>
          <path d="M256 100 L200 200 L256 300 L312 200 Z" fill="${BRAND_COLORS.white}"/>
        </svg>
      `;
      await fs.writeFile(
        path.join(OUTPUT_DIR, config.name),
        svgContent
      );
    } else {
      const output = await sharp(inputBuffer)
        .resize(config.size, config.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();
      
      await fs.writeFile(
        path.join(OUTPUT_DIR, config.name),
        output
      );
    }
    
    console.log(`  ✓ Generated ${config.name}`);
  }
  
  // Generate ICO file (multi-resolution)
  console.log('  ✓ Generating favicon.ico...');
  // Note: For production, use a proper ICO generator tool
  const ico16 = await sharp(inputBuffer)
    .resize(16, 16)
    .png()
    .toBuffer();
  await fs.writeFile(path.join(OUTPUT_DIR, 'favicon.ico'), ico16);
}

/**
 * Generate social media images
 */
async function generateSocialImages(inputBuffer) {
  console.log('📱 Generating social media images...');
  
  for (const config of LOGO_VARIANTS.social) {
    // Create a canvas with brand gradient background
    const background = await sharp({
      create: {
        width: config.width,
        height: config.height,
        channels: 4,
        background: { r: 37, g: 99, b: 235, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
    
    // Resize logo to fit
    const logoWidth = Math.min(config.width * 0.5, 600);
    const logoHeight = Math.min(config.height * 0.5, 300);
    
    const logo = await sharp(inputBuffer)
      .resize(logoWidth, logoHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // Composite logo on background
    const output = await sharp(background)
      .composite([
        {
          input: logo,
          gravity: 'center'
        }
      ])
      .png({ quality: 85 })
      .toBuffer();
    
    await fs.writeFile(
      path.join(CDN_DIR, 'social', config.name),
      output
    );
    
    console.log(`  ✓ Generated ${config.name}`);
  }
}

/**
 * Generate logo variants
 */
async function generateLogoVariants(inputBuffer) {
  console.log('🖼️ Generating logo variants...');
  
  for (const config of LOGO_VARIANTS.logos) {
    let processedImage = sharp(inputBuffer);
    
    // Apply dimensions
    if (config.size) {
      processedImage = processedImage.resize(config.size, config.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    } else {
      processedImage = processedImage.resize(config.width, config.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    }
    
    // Apply color variants
    if (config.name.includes('white')) {
      // Convert to white version
      processedImage = processedImage
        .tint({ r: 255, g: 255, b: 255 });
    } else if (config.name.includes('dark')) {
      // Convert to dark version
      processedImage = processedImage
        .tint({ r: 30, g: 58, b: 138 });
    }
    
    // Set quality for email optimization
    const quality = config.quality || 90;
    
    const output = await processedImage
      .png({ quality, compressionLevel: 9 })
      .toBuffer();
    
    await fs.writeFile(
      path.join(CDN_DIR, 'logos', config.name),
      output
    );
    
    // Check file size for email version
    if (config.name.includes('email')) {
      const stats = await fs.stat(path.join(CDN_DIR, 'logos', config.name));
      const sizeKB = stats.size / 1024;
      console.log(`  ✓ ${config.name} (${sizeKB.toFixed(1)}KB)`);
      
      if (sizeKB > 50) {
        console.warn(`    ⚠️ Email logo exceeds 50KB, consider further optimization`);
      }
    } else {
      console.log(`  ✓ Generated ${config.name}`);
    }
  }
}

/**
 * Generate app icons
 */
async function generateAppIcons(inputBuffer) {
  console.log('📲 Generating app icons...');
  
  for (const config of LOGO_VARIANTS.appIcons) {
    const output = await sharp(inputBuffer)
      .resize(config.size, config.size, {
        fit: 'contain',
        background: config.name.includes('ios') 
          ? { r: 255, g: 255, b: 255, alpha: 1 }
          : { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toBuffer();
    
    await fs.writeFile(
      path.join(CDN_DIR, 'logos', config.name),
      output
    );
    
    console.log(`  ✓ Generated ${config.name}`);
  }
}

/**
 * Generate manifest icons
 */
async function generateManifestIcons(inputBuffer) {
  console.log('📋 Updating manifest.json with icon paths...');
  
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  
  // Update icon paths to use CDN
  manifest.icons = manifest.icons.map(icon => ({
    ...icon,
    src: icon.src.startsWith('http') 
      ? icon.src 
      : `https://cdn.spirit-tours.com${icon.src}`
  }));
  
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('  ✓ Updated manifest.json');
}

/**
 * Generate browserconfig.xml for Windows tiles
 */
async function generateBrowserConfig() {
  console.log('🪟 Generating browserconfig.xml...');
  
  const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/mstile-150x150.png"/>
      <TileColor>${BRAND_COLORS.primary}</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;
  
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'browserconfig.xml'),
    browserConfig
  );
  console.log('  ✓ Generated browserconfig.xml');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Spirit Tours Logo Generator');
    console.log('================================\n');
    
    // Ensure directories exist
    await ensureDirectories();
    
    // Read the master logo file
    // For now, we'll create a placeholder since we don't have the actual file
    console.log('📂 Creating placeholder logo...');
    
    // Create a simple placeholder logo
    const placeholderLogo = await sharp({
      create: {
        width: 1000,
        height: 400,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="1000" height="400">
            <!-- Pegasus silhouette -->
            <path d="M 200 150 Q 250 100, 300 150 L 300 250 L 250 250 L 250 200 L 200 200 Z" 
                  fill="${BRAND_COLORS.primary}" />
            <path d="M 150 180 Q 100 160, 80 180 Q 100 200, 150 180 Z" 
                  fill="${BRAND_COLORS.accent}" />
            <path d="M 350 180 Q 400 160, 420 180 Q 400 200, 350 180 Z" 
                  fill="${BRAND_COLORS.accent}" />
            
            <!-- Globe -->
            <circle cx="350" cy="200" r="80" fill="${BRAND_COLORS.primaryDark}" opacity="0.8" />
            <ellipse cx="350" cy="200" rx="80" ry="30" fill="none" stroke="${BRAND_COLORS.white}" stroke-width="2" />
            <ellipse cx="350" cy="200" rx="30" ry="80" fill="none" stroke="${BRAND_COLORS.white}" stroke-width="2" />
            
            <!-- Text -->
            <text x="500" y="180" font-family="Arial, sans-serif" font-size="60" font-weight="bold" 
                  fill="${BRAND_COLORS.primaryDark}">SPIRIT TOURS</text>
            <text x="500" y="220" font-family="Arial, sans-serif" font-size="30" font-style="italic" 
                  fill="${BRAND_COLORS.accent}">memory designers</text>
          </svg>
        `),
        gravity: 'center'
      }
    ])
    .png()
    .toBuffer();
    
    // Generate all variants
    await generateFavicons(placeholderLogo);
    await generateSocialImages(placeholderLogo);
    await generateLogoVariants(placeholderLogo);
    await generateAppIcons(placeholderLogo);
    await generateBrowserConfig();
    
    console.log('\n✅ Logo generation completed successfully!');
    console.log('📁 Output directories:');
    console.log(`   - Favicons: ${OUTPUT_DIR}`);
    console.log(`   - CDN assets: ${CDN_DIR}`);
    console.log('\n⚠️  Note: Replace placeholder with actual Spirit Tours logo file');
    
  } catch (error) {
    console.error('❌ Error generating logo variants:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { generateLogoVariants: main };