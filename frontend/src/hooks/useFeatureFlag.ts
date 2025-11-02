import { useState, useEffect } from 'react';
import { featureFlags } from '../services/featureFlags';

/**
 * Hook to check if a feature flag is enabled
 * @param flagKey - The key of the feature flag
 * @returns boolean indicating if the feature is enabled
 */
export const useFeatureFlag = (flagKey: string): boolean => {
  const [isEnabled, setIsEnabled] = useState(() =>
    featureFlags.isEnabled(flagKey)
  );
  
  useEffect(() => {
    // Update state if flags change
    const checkFlag = () => {
      const enabled = featureFlags.isEnabled(flagKey);
      setIsEnabled(enabled);
    };
    
    // Check initially
    checkFlag();
    
    // Track usage
    featureFlags.trackUsage(flagKey);
    
    // Listen for storage changes (flags updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'feature_flags') {
        checkFlag();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [flagKey]);
  
  return isEnabled;
};

/**
 * Hook to get multiple feature flags at once
 * @param flagKeys - Array of feature flag keys
 * @returns Object with flag keys and their enabled status
 */
export const useFeatureFlags = (flagKeys: string[]): Record<string, boolean> => {
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    flagKeys.reduce((acc, key) => {
      acc[key] = featureFlags.isEnabled(key);
      return acc;
    }, {} as Record<string, boolean>)
  );
  
  useEffect(() => {
    const checkFlags = () => {
      const newFlags = flagKeys.reduce((acc, key) => {
        acc[key] = featureFlags.isEnabled(key);
        return acc;
      }, {} as Record<string, boolean>);
      
      setFlags(newFlags);
    };
    
    checkFlags();
    
    // Track usage for all flags
    flagKeys.forEach(key => featureFlags.trackUsage(key));
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'feature_flags') {
        checkFlags();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [flagKeys]);
  
  return flags;
};

/**
 * Hook to get all enabled feature flags
 * @returns Array of enabled feature flag keys
 */
export const useAllEnabledFlags = (): string[] => {
  const [enabledFlags, setEnabledFlags] = useState<string[]>(() =>
    featureFlags.getEnabledFlags()
  );
  
  useEffect(() => {
    const updateFlags = () => {
      setEnabledFlags(featureFlags.getEnabledFlags());
    };
    
    updateFlags();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'feature_flags') {
        updateFlags();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  return enabledFlags;
};
