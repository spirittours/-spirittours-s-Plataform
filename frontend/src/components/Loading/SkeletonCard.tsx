import React from 'react';
import { Card, CardContent, Skeleton, Box } from '@mui/material';

interface SkeletonCardProps {
  variant?: 'default' | 'media' | 'list';
  height?: number;
  count?: number;
}

/**
 * Skeleton Card Component
 * Displays placeholder cards while content is loading
 */
const SkeletonCard: React.FC<SkeletonCardProps> = ({
  variant = 'default',
  height = 200,
  count = 1,
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'media':
        return (
          <Card>
            <Skeleton variant="rectangular" height={height} />
            <CardContent>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Skeleton variant="rectangular" width={80} height={32} />
                <Skeleton variant="rectangular" width={80} height={32} />
              </Box>
            </CardContent>
          </Card>
        );

      case 'list':
        return (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="80%" height={20} />
                  <Skeleton variant="text" width="60%" height={16} />
                </Box>
                <Skeleton variant="rectangular" width={60} height={32} />
              </Box>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent>
              <Skeleton variant="text" width="70%" height={28} />
              <Skeleton variant="text" width="90%" height={20} sx={{ mt: 1 }} />
              <Skeleton variant="text" width="85%" height={20} />
              <Skeleton variant="rectangular" height={height} sx={{ mt: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Skeleton variant="rectangular" width={100} height={36} />
                <Skeleton variant="rectangular" width={100} height={36} />
              </Box>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>{renderSkeleton()}</React.Fragment>
      ))}
    </>
  );
};

export default SkeletonCard;
