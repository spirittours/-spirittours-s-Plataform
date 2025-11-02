/**
 * Feature Flags System
 * Enables gradual rollout of new features and A/B testing
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  userGroups?: string[]; // ['admin', 'beta', 'premium']
  startDate?: Date;
  endDate?: Date;
  description?: string;
}

export interface FeatureFlagsConfig {
  [key: string]: FeatureFlag;
}

// Default feature flags configuration
const DEFAULT_FLAGS: FeatureFlagsConfig = {
  // Core Features
  'enable-tours-management': {
    key: 'enable-tours-management',
    enabled: true,
    description: 'Enable tours management features',
  },
  'enable-bookings': {
    key: 'enable-bookings',
    enabled: true,
    description: 'Enable booking system',
  },
  'enable-customers': {
    key: 'enable-customers',
    enabled: true,
    description: 'Enable customer management',
  },
  
  // Advanced Features
  'enable-ai-agents': {
    key: 'enable-ai-agents',
    enabled: false,
    rolloutPercentage: 20,
    userGroups: ['admin', 'beta'],
    description: 'Enable AI agents features',
  },
  'enable-real-time-chat': {
    key: 'enable-real-time-chat',
    enabled: true,
    description: 'Enable real-time chat with WebSocket',
  },
  'enable-gps-tracking': {
    key: 'enable-gps-tracking',
    enabled: true,
    description: 'Enable GPS tracking for trips',
  },
  
  // Payment Features
  'enable-stripe-payments': {
    key: 'enable-stripe-payments',
    enabled: true,
    description: 'Enable Stripe payment processing',
  },
  'enable-paypal-payments': {
    key: 'enable-paypal-payments',
    enabled: false,
    rolloutPercentage: 50,
    description: 'Enable PayPal payment processing',
  },
  
  // Analytics & Reporting
  'enable-advanced-analytics': {
    key: 'enable-advanced-analytics',
    enabled: true,
    userGroups: ['admin', 'manager'],
    description: 'Enable advanced analytics dashboard',
  },
  'enable-export-reports': {
    key: 'enable-export-reports',
    enabled: true,
    description: 'Enable report export functionality',
  },
  
  // Experimental Features
  'enable-ar-tours': {
    key: 'enable-ar-tours',
    enabled: false,
    rolloutPercentage: 10,
    userGroups: ['beta'],
    description: 'Enable AR/VR tour previews',
  },
  'enable-voice-assistant': {
    key: 'enable-voice-assistant',
    enabled: false,
    description: 'Enable voice assistant integration',
  },
  'enable-blockchain-loyalty': {
    key: 'enable-blockchain-loyalty',
    enabled: false,
    userGroups: ['premium'],
    description: 'Enable blockchain-based loyalty program',
  },
  
  // UI/UX Enhancements
  'enable-dark-mode': {
    key: 'enable-dark-mode',
    enabled: true,
    description: 'Enable dark mode theme',
  },
  'enable-new-dashboard': {
    key: 'enable-new-dashboard',
    enabled: false,
    rolloutPercentage: 30,
    description: 'Enable new dashboard design',
  },
  
  // Mobile Features
  'enable-pwa': {
    key: 'enable-pwa',
    enabled: true,
    description: 'Enable Progressive Web App features',
  },
  'enable-push-notifications': {
    key: 'enable-push-notifications',
    enabled: false,
    rolloutPercentage: 40,
    description: 'Enable push notifications',
  },
  
  // Admin Features
  'enable-feature-flags-ui': {
    key: 'enable-feature-flags-ui',
    enabled: true,
    userGroups: ['admin'],
    description: 'Enable feature flags management UI',
  },
  'enable-system-monitoring': {
    key: 'enable-system-monitoring',
    enabled: true,
    userGroups: ['admin'],
    description: 'Enable system monitoring dashboard',
  },
};

class FeatureFlagsService {
  private flags: FeatureFlagsConfig = DEFAULT_FLAGS;
  private userId: string | null = null;
  private userGroups: string[] = [];
  
  /**
   * Initialize feature flags from API or localStorage
   */
  async initialize() {
    try {
      // Try to load from API first
      const response = await fetch('/api/v1/feature-flags');
      if (response.ok) {
        const apiFlags = await response.json();
        this.flags = { ...this.flags, ...apiFlags };
      }
    } catch (error) {
      console.warn('Failed to load feature flags from API, using defaults');
    }
    
    // Load from localStorage for overrides
    const storedFlags = localStorage.getItem('feature_flags');
    if (storedFlags) {
      try {
        const parsedFlags = JSON.parse(storedFlags);
        this.flags = { ...this.flags, ...parsedFlags };
      } catch (error) {
        console.error('Failed to parse stored feature flags');
      }
    }
  }
  
  /**
   * Set user context for personalized flags
   */
  setUser(userId: string, groups: string[] = []) {
    this.userId = userId;
    this.userGroups = groups;
  }
  
  /**
   * Check if a feature is enabled
   */
  isEnabled(flagKey: string): boolean {
    const flag = this.flags[flagKey];
    
    if (!flag) {
      console.warn(`Feature flag "${flagKey}" not found`);
      return false;
    }
    
    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }
    
    // Check date restrictions
    if (flag.startDate && new Date() < new Date(flag.startDate)) {
      return false;
    }
    if (flag.endDate && new Date() > new Date(flag.endDate)) {
      return false;
    }
    
    // Check user groups
    if (flag.userGroups && flag.userGroups.length > 0) {
      const hasAccess = flag.userGroups.some(group =>
        this.userGroups.includes(group)
      );
      if (!hasAccess) {
        return false;
      }
    }
    
    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      const userHash = this.getUserHash();
      const isInRollout = (userHash % 100) < flag.rolloutPercentage;
      if (!isInRollout) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get all enabled feature flags
   */
  getEnabledFlags(): string[] {
    return Object.keys(this.flags).filter(key => this.isEnabled(key));
  }
  
  /**
   * Get all feature flags with their status
   */
  getAllFlags(): FeatureFlagsConfig {
    return this.flags;
  }
  
  /**
   * Manually enable/disable a flag (for testing)
   */
  setFlag(flagKey: string, enabled: boolean) {
    if (this.flags[flagKey]) {
      this.flags[flagKey].enabled = enabled;
      this.saveToLocalStorage();
    }
  }
  
  /**
   * Update flag configuration
   */
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>) {
    if (this.flags[flagKey]) {
      this.flags[flagKey] = { ...this.flags[flagKey], ...updates };
      this.saveToLocalStorage();
    }
  }
  
  /**
   * Create a new feature flag
   */
  createFlag(flag: FeatureFlag) {
    this.flags[flag.key] = flag;
    this.saveToLocalStorage();
  }
  
  /**
   * Delete a feature flag
   */
  deleteFlag(flagKey: string) {
    delete this.flags[flagKey];
    this.saveToLocalStorage();
  }
  
  /**
   * Reset to default flags
   */
  reset() {
    this.flags = { ...DEFAULT_FLAGS };
    localStorage.removeItem('feature_flags');
  }
  
  /**
   * Export flags configuration
   */
  export(): string {
    return JSON.stringify(this.flags, null, 2);
  }
  
  /**
   * Import flags configuration
   */
  import(json: string) {
    try {
      const imported = JSON.parse(json);
      this.flags = { ...this.flags, ...imported };
      this.saveToLocalStorage();
    } catch (error) {
      console.error('Failed to import feature flags:', error);
      throw new Error('Invalid JSON format');
    }
  }
  
  /**
   * Save flags to localStorage
   */
  private saveToLocalStorage() {
    localStorage.setItem('feature_flags', JSON.stringify(this.flags));
  }
  
  /**
   * Generate a hash from user ID for rollout percentage
   */
  private getUserHash(): number {
    if (!this.userId) {
      // Use random hash if no user ID
      return Math.floor(Math.random() * 100);
    }
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < this.userId.length; i++) {
      const char = this.userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash);
  }
  
  /**
   * Track feature flag usage (for analytics)
   */
  trackUsage(flagKey: string) {
    if (window.gtag) {
      window.gtag('event', 'feature_flag_used', {
        event_category: 'Feature Flags',
        event_label: flagKey,
        value: this.isEnabled(flagKey) ? 1 : 0,
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Feature Flag] ${flagKey}: ${this.isEnabled(flagKey)}`);
    }
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagsService();

// Initialize on module load
featureFlags.initialize();

// Export for testing
export default featureFlags;
