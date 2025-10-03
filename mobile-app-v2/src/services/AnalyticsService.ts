/**
 * Analytics Service
 * Tracks user events and behavior
 */

import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

class AnalyticsServiceClass {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    await analytics().setAnalyticsCollectionEnabled(true);
    this.initialized = true;
    
    console.log('Analytics initialized');
  }

  async setUserId(userId: string) {
    await analytics().setUserId(userId);
  }

  async setUserProperties(properties: Record<string, any>) {
    await analytics().setUserProperties(properties);
  }

  async logEvent(eventName: string, params?: Record<string, any>) {
    await analytics().logEvent(eventName, {
      ...params,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });
  }

  async logScreenView(screenName: string, screenClass?: string) {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  // Predefined events
  async logLogin(method: string) {
    await this.logEvent('login', { method });
  }

  async logSignup(method: string) {
    await this.logEvent('sign_up', { method });
  }

  async logSearch(searchTerm: string) {
    await this.logEvent('search', { search_term: searchTerm });
  }

  async logSelectContent(contentType: string, itemId: string) {
    await this.logEvent('select_content', {
      content_type: contentType,
      item_id: itemId,
    });
  }

  async logViewItem(itemId: string, itemName: string, category: string) {
    await this.logEvent('view_item', {
      item_id: itemId,
      item_name: itemName,
      item_category: category,
    });
  }

  async logAddToWishlist(itemId: string, itemName: string, value: number) {
    await this.logEvent('add_to_wishlist', {
      item_id: itemId,
      item_name: itemName,
      value,
    });
  }

  async logBeginCheckout(value: number, currency: string, items: any[]) {
    await this.logEvent('begin_checkout', {
      value,
      currency,
      items,
    });
  }

  async logPurchase(transactionId: string, value: number, currency: string, items: any[]) {
    await this.logEvent('purchase', {
      transaction_id: transactionId,
      value,
      currency,
      items,
    });
  }

  async logShare(contentType: string, itemId: string, method: string) {
    await this.logEvent('share', {
      content_type: contentType,
      item_id: itemId,
      method,
    });
  }
}

export const AnalyticsService = new AnalyticsServiceClass();
