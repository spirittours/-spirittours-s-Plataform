import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertCircle, Cloud, CloudOff } from 'lucide-react';
import OfflineDataManager from './OfflineDataManager';

interface OfflineIndicatorProps {
  dataManager: OfflineDataManager;
  showDetails?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  dataManager, 
  showDetails = true 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingItems, setPendingItems] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Listeners para cambios de conexión
    const handleOnline = () => {
      setIsOnline(true);
      setSyncError(null);
      // Intentar sincronizar automáticamente
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar stats iniciales
    loadStats();

    // Actualizar stats cada 30 segundos
    const interval = setInterval(loadStats, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    try {
      const syncStats = await dataManager.getSyncStats();
      setStats(syncStats);
      setPendingItems(syncStats.pendingItems);
      setLastSync(syncStats.lastSync);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      setSyncError('No internet connection');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await dataManager.fullSync();
      
      if (result.upload.conflicts > 0) {
        setSyncError(`${result.upload.conflicts} conflicts detected`);
      }
      
      await loadStats();
      
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Indicador compacto */}
      <div
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg cursor-pointer transition-all ${
          isOnline
            ? 'bg-green-100 text-green-800 border-2 border-green-300'
            : 'bg-red-100 text-red-800 border-2 border-red-300'
        } ${isSyncing ? 'animate-pulse' : ''}`}
        onClick={() => setShowDetailsPanel(!showDetailsPanel)}
      >
        {isSyncing ? (
          <RefreshCw className="animate-spin" size={20} />
        ) : isOnline ? (
          <Wifi size={20} />
        ) : (
          <WifiOff size={20} />
        )}
        
        <div className="flex flex-col">
          <span className="font-semibold text-sm">
            {isSyncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
          </span>
          {pendingItems > 0 && (
            <span className="text-xs">
              {pendingItems} pending {pendingItems === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        
        {!isSyncing && isOnline && pendingItems > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSync();
            }}
            className="ml-2 p-1 hover:bg-green-200 rounded"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Panel de detalles expandido */}
      {showDetailsPanel && showDetails && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Sync Status</h3>
            <button
              onClick={() => setShowDetailsPanel(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          {/* Estado de conexión */}
          <div className="mb-4 p-3 rounded bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Connection</span>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <>
                    <Cloud className="text-green-600" size={16} />
                    <span className="text-sm text-green-600">Online</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="text-red-600" size={16} />
                    <span className="text-sm text-red-600">Offline</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Last sync:</span>
              <span>{formatTimestamp(lastSync)}</span>
            </div>
          </div>

          {/* Items pendientes */}
          {pendingItems > 0 && (
            <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="text-yellow-600" size={16} />
                <span className="text-sm font-semibold text-yellow-800">
                  Pending Changes
                </span>
              </div>
              <p className="text-xs text-yellow-700">
                {pendingItems} {pendingItems === 1 ? 'change' : 'changes'} waiting to sync
              </p>
            </div>
          )}

          {/* Error de sincronización */}
          {syncError && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200">
              <div className="flex items-center space-x-2 mb-1">
                <AlertCircle className="text-red-600" size={16} />
                <span className="text-sm font-semibold text-red-800">Sync Error</span>
              </div>
              <p className="text-xs text-red-700">{syncError}</p>
            </div>
          )}

          {/* Estadísticas */}
          {stats && (
            <div className="mb-4 p-3 rounded bg-blue-50">
              <h4 className="text-sm font-semibold mb-2 text-blue-800">Statistics</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Offline data:</span>
                  <span className="font-medium">{stats.totalEntities} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage used:</span>
                  <span className="font-medium">{formatBytes(stats.storageUsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending sync:</span>
                  <span className="font-medium">{stats.pendingItems} items</span>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex space-x-2">
            <button
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded font-medium text-sm ${
                !isOnline || isSyncing
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            
            <button
              onClick={loadStats}
              className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              title="Refresh stats"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Modo offline activo */}
          {!isOnline && (
            <div className="mt-4 p-3 rounded bg-orange-50 border border-orange-200">
              <div className="flex items-start space-x-2">
                <WifiOff className="text-orange-600 mt-0.5" size={16} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-orange-800 mb-1">
                    Offline Mode Active
                  </p>
                  <p className="text-xs text-orange-700">
                    Your changes are being saved locally and will sync automatically 
                    when connection is restored.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sincronización exitosa */}
          {!isSyncing && isOnline && pendingItems === 0 && lastSync && (
            <div className="mt-4 p-3 rounded bg-green-50 border border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-green-600" size={16} />
                <p className="text-xs text-green-700">
                  All data is synced and up to date
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
