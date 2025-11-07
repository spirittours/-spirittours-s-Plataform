/**
 * Media Library Component
 * Complete media management interface with upload, search, and organization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { mediaAPI } from '../../../../services/api/cms/cmsAPI';
import {
  FaUpload,
  FaSearch,
  FaFolder,
  FaFolderPlus,
  FaTrash,
  FaTimes,
  FaImage,
  FaVideo,
  FaFile,
  FaMusic,
  FaCheck,
  FaEdit,
  FaDownload,
} from 'react-icons/fa';

const MediaLibrary = ({ onSelect, multiple = false, fileType = 'all', isOpen, onClose }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('');
  const [folders, setFolders] = useState([]);
  const [filterType, setFilterType] = useState(fileType !== 'all' ? fileType : '');
  const [uploadProgress, setUploadProgress] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch assets
  const fetchAssets = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      const currentPage = resetPage ? 1 : page;
      const response = await mediaAPI.getAssets({
        folder: currentFolder,
        type: filterType,
        search: searchQuery,
        page: currentPage,
        limit: 24,
      });

      if (resetPage) {
        setAssets(response.data.assets);
        setPage(1);
      } else {
        setAssets((prev) => [...prev, ...response.data.assets]);
      }

      setHasMore(response.data.hasMore);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, filterType, searchQuery, page]);

  // Fetch folders
  const fetchFolders = async () => {
    try {
      const response = await mediaAPI.getFolders();
      setFolders(response.data.folders);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets(true);
      fetchFolders();
    }
  }, [isOpen, currentFolder, filterType, searchQuery]);

  // Handle file upload
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const response = await mediaAPI.uploadFile(file, {
          folder: currentFolder,
        });

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        setAssets((prev) => [response.data.asset, ...prev]);

        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 2000);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }
  };

  // Handle asset selection
  const handleSelectAsset = (asset) => {
    if (multiple) {
      setSelectedAssets((prev) => {
        const isSelected = prev.find((a) => a._id === asset._id);
        if (isSelected) {
          return prev.filter((a) => a._id !== asset._id);
        }
        return [...prev, asset];
      });
    } else {
      setSelectedAssets([asset]);
    }
  };

  // Handle confirm selection
  const handleConfirmSelection = () => {
    if (multiple) {
      onSelect?.(selectedAssets);
    } else {
      onSelect?.(selectedAssets[0]);
    }
    onClose?.();
  };

  // Handle delete asset
  const handleDeleteAsset = async (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await mediaAPI.deleteAsset(assetId);
        setAssets((prev) => prev.filter((a) => a._id !== assetId));
      } catch (error) {
        console.error('Error deleting asset:', error);
      }
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    const folderName = window.prompt('Enter folder name:');
    if (folderName) {
      try {
        const path = currentFolder ? `${currentFolder}/${folderName}` : folderName;
        await mediaAPI.createFolder(path);
        fetchFolders();
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    }
  };

  // Get file icon
  const getFileIcon = (type) => {
    switch (type) {
      case 'image':
        return <FaImage className="text-blue-500" />;
      case 'video':
        return <FaVideo className="text-red-500" />;
      case 'audio':
        return <FaMusic className="text-purple-500" />;
      default:
        return <FaFile className="text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Media Library</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
          {/* Upload Button */}
          <label className="btn btn-primary cursor-pointer">
            <FaUpload className="mr-2" />
            Upload Files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </label>

          {/* Create Folder */}
          <button
            onClick={handleCreateFolder}
            className="btn btn-secondary"
          >
            <FaFolderPlus className="mr-2" />
            New Folder
          </button>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter by Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
          </select>
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            {Object.entries(uploadProgress).map(([filename, progress]) => (
              <div key={filename} className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate">{filename}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Folders */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <FaFolder className="mr-2" />
                Folders
              </h3>
              <button
                onClick={() => setCurrentFolder('')}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                  currentFolder === '' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                All Files
              </button>
              {folders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setCurrentFolder(folder)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                    currentFolder === folder ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  {folder}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && assets.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading assets...</p>
                </div>
              </div>
            ) : assets.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <FaImage className="mx-auto text-6xl mb-4 opacity-50" />
                  <p className="text-lg">No assets found</p>
                  <p className="text-sm">Upload files to get started</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {assets.map((asset) => {
                    const isSelected = selectedAssets.find((a) => a._id === asset._id);
                    return (
                      <div
                        key={asset._id}
                        className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                        onClick={() => handleSelectAsset(asset)}
                      >
                        {/* Asset Preview */}
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          {asset.type === 'image' ? (
                            <img
                              src={asset.thumbnailUrl || asset.url}
                              alt={asset.metadata?.alt || asset.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-4xl">{getFileIcon(asset.type)}</div>
                          )}
                        </div>

                        {/* Selection Checkbox */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                            <FaCheck />
                          </div>
                        )}

                        {/* Asset Info */}
                        <div className="p-2 bg-white">
                          <p className="text-xs truncate font-medium">{asset.filename}</p>
                          <p className="text-xs text-gray-500">
                            {(asset.size / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        {/* Actions (on hover) */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAsset(asset._id);
                            }}
                            className="bg-red-600 text-white p-2 rounded-lg mx-1 hover:bg-red-700"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                          <a
                            href={asset.url}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="bg-blue-600 text-white p-2 rounded-lg mx-1 hover:bg-blue-700"
                            title="Download"
                          >
                            <FaDownload />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center mt-6">
                    <button
                      onClick={() => {
                        setPage((prev) => prev + 1);
                        fetchAssets();
                      }}
                      className="btn btn-secondary"
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedAssets.length > 0 && (
              <span>{selectedAssets.length} asset(s) selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleConfirmSelection}
              className="btn btn-primary"
              disabled={selectedAssets.length === 0}
            >
              Insert Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
