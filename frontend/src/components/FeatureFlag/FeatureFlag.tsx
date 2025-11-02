import React from 'react';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

interface FeatureFlagProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render content based on feature flag
 * @example
 * <FeatureFlag flag="enable-new-dashboard">
 *   <NewDashboard />
 * </FeatureFlag>
 */
export const FeatureFlag: React.FC<FeatureFlagProps> = ({
  flag,
  children,
  fallback = null,
}) => {
  const isEnabled = useFeatureFlag(flag);
  
  return <>{isEnabled ? children : fallback}</>;
};

export default FeatureFlag;
