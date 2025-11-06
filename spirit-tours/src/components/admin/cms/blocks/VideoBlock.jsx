/**
 * Video Block Component
 * Embedded video player (YouTube, Vimeo, or direct upload)
 */

import React from 'react';
import { FaVideo } from 'react-icons/fa';

const VideoBlock = ({ content, settings, onChange, onSettingsChange, isEditing }) => {
  const defaultContent = {
    videoUrl: content?.videoUrl || '',
    videoType: content?.videoType || 'youtube', // youtube, vimeo, upload
    title: content?.title || '',
    caption: content?.caption || '',
  };

  const defaultSettings = {
    aspectRatio: settings?.aspectRatio || '16:9',
    autoplay: settings?.autoplay || false,
    controls: settings?.controls !== false, // default true
    loop: settings?.loop || false,
    muted: settings?.muted || false,
  };

  const handleContentChange = (key, value) => {
    onChange?.({ ...defaultContent, [key]: value });
  };

  const handleSettingChange = (key, value) => {
    onSettingsChange?.({ ...defaultSettings, [key]: value });
  };

  // Extract video ID from URL
  const getVideoEmbedUrl = () => {
    const url = defaultContent.videoUrl;
    if (!url) return '';

    if (defaultContent.videoType === 'youtube') {
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      if (match) {
        const videoId = match[1];
        const params = new URLSearchParams({
          autoplay: defaultSettings.autoplay ? '1' : '0',
          controls: defaultSettings.controls ? '1' : '0',
          loop: defaultSettings.loop ? '1' : '0',
          mute: defaultSettings.muted ? '1' : '0',
        });
        return `https://www.youtube.com/embed/${videoId}?${params}`;
      }
    } else if (defaultContent.videoType === 'vimeo') {
      const vimeoRegex = /vimeo\.com\/(\d+)/;
      const match = url.match(vimeoRegex);
      if (match) {
        const videoId = match[1];
        const params = new URLSearchParams({
          autoplay: defaultSettings.autoplay ? '1' : '0',
          loop: defaultSettings.loop ? '1' : '0',
          muted: defaultSettings.muted ? '1' : '0',
        });
        return `https://player.vimeo.com/video/${videoId}?${params}`;
      }
    }

    return url; // Direct URL
  };

  const getAspectRatioClass = () => {
    switch (defaultSettings.aspectRatio) {
      case '16:9':
        return 'aspect-video'; // 16:9
      case '4:3':
        return 'aspect-[4/3]';
      case '1:1':
        return 'aspect-square';
      case '21:9':
        return 'aspect-[21/9]';
      default:
        return 'aspect-video';
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Video Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Video Type</label>
          <select
            value={defaultContent.videoType}
            onChange={(e) => handleContentChange('videoType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="upload">Direct URL/Upload</option>
          </select>
        </div>

        {/* Video URL */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Video URL
            {defaultContent.videoType === 'youtube' && (
              <span className="text-gray-500 text-xs ml-2">
                (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
              </span>
            )}
            {defaultContent.videoType === 'vimeo' && (
              <span className="text-gray-500 text-xs ml-2">
                (e.g., https://vimeo.com/VIDEO_ID)
              </span>
            )}
          </label>
          <input
            type="url"
            value={defaultContent.videoUrl}
            onChange={(e) => handleContentChange('videoUrl', e.target.value)}
            placeholder="Enter video URL"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Title (optional)</label>
          <input
            type="text"
            value={defaultContent.title}
            onChange={(e) => handleContentChange('title', e.target.value)}
            placeholder="Video title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium mb-2">Caption (optional)</label>
          <textarea
            value={defaultContent.caption}
            onChange={(e) => handleContentChange('caption', e.target.value)}
            rows={2}
            placeholder="Add a description or caption"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
            <select
              value={defaultSettings.aspectRatio}
              onChange={(e) => handleSettingChange('aspectRatio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="21:9">21:9 (Ultrawide)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={defaultSettings.autoplay}
                onChange={(e) => handleSettingChange('autoplay', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Autoplay</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={defaultSettings.controls}
                onChange={(e) => handleSettingChange('controls', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Show Controls</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={defaultSettings.loop}
                onChange={(e) => handleSettingChange('loop', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Loop</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={defaultSettings.muted}
                onChange={(e) => handleSettingChange('muted', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Muted</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Preview mode
  if (!defaultContent.videoUrl) {
    return (
      <div className="py-8 text-center text-gray-400">
        <FaVideo className="text-4xl mx-auto mb-2" />
        <p>No video URL provided</p>
      </div>
    );
  }

  const embedUrl = getVideoEmbedUrl();

  return (
    <div className="py-4 max-w-4xl mx-auto">
      {defaultContent.title && (
        <h3 className="text-xl font-semibold mb-2">{defaultContent.title}</h3>
      )}
      
      <div className={`${getAspectRatioClass()} w-full overflow-hidden rounded-lg`}>
        <iframe
          src={embedUrl}
          title={defaultContent.title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {defaultContent.caption && (
        <p className="text-sm text-gray-600 mt-2 italic">{defaultContent.caption}</p>
      )}
    </div>
  );
};

export default VideoBlock;
