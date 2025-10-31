import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Box,
} from '@mui/material';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

/**
 * Skeleton Table Component
 * Displays a placeholder table while data is loading
 */
const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        {showHeader && (
          <TableHead>
            <TableRow>
              {Array.from({ length: columns }).map((_, index) => (
                <TableCell key={index}>
                  <Skeleton variant="text" width="80%" height={24} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  {colIndex === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="text" width="60%" height={20} />
                    </Box>
                  ) : (
                    <Skeleton variant="text" width="70%" height={20} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SkeletonTable;
