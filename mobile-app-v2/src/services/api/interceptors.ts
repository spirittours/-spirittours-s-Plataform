/**
 * API Interceptors
 * Setup for authentication and error handling
 */

import { Store } from '@reduxjs/toolkit';
import apiClient from './apiClient';

export const setupInterceptors = (store: Store) => {
  // Add any store-based interceptors here
  console.log('API interceptors configured');
};
