/// <reference types="cypress" />

describe('Performance Testing', () => {
  describe('Page Load Performance', () => {
    const pages = [
      { name: 'Homepage', url: '/', maxLoadTime: 3000 },
      { name: 'Search Results', url: '/tours/search?destination=Bali', maxLoadTime: 4000 },
      { name: 'Tour Details', url: '/tours/bali-adventure-tour', maxLoadTime: 3500 },
      { name: 'Checkout', url: '/checkout', maxLoadTime: 3000 },
      { name: 'Dashboard', url: '/dashboard', maxLoadTime: 2500 }
    ];

    pages.forEach(page => {
      it(`should load ${page.name} within ${page.maxLoadTime}ms`, () => {
        const startTime = Date.now();
        
        cy.visit(page.url, {
          onBeforeLoad: (win) => {
            win.performance.mark('start');
          },
          onLoad: (win) => {
            win.performance.mark('end');
            win.performance.measure('pageLoad', 'start', 'end');
          }
        });
        
        cy.window().then((win) => {
          const loadTime = Date.now() - startTime;
          const perfData = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          // Check various performance metrics
          expect(loadTime, 'Total load time').to.be.lessThan(page.maxLoadTime);
          expect(perfData.domContentLoadedEventEnd, 'DOM Content Loaded').to.be.lessThan(1500);
          expect(perfData.loadEventEnd, 'Load Event').to.be.lessThan(page.maxLoadTime);
          
          // Log performance data
          cy.task('log', `${page.name} Performance Metrics:`);
          cy.task('log', `  - Total Load Time: ${loadTime}ms`);
          cy.task('log', `  - DOM Content Loaded: ${perfData.domContentLoadedEventEnd}ms`);
          cy.task('log', `  - First Paint: ${perfData.responseEnd}ms`);
        });
      });
    });
  });

  describe('Core Web Vitals', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('should meet Largest Contentful Paint (LCP) threshold', () => {
      cy.window().then((win) => {
        return new Promise((resolve) => {
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            expect(lastEntry.startTime, 'LCP').to.be.lessThan(2500); // Good LCP < 2.5s
            resolve(true);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Trigger some interaction to ensure LCP is recorded
          cy.wait(3000);
        });
      });
    });

    it('should meet First Input Delay (FID) threshold', () => {
      cy.window().then((win) => {
        return new Promise((resolve) => {
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
              expect(entry.processingStart - entry.startTime, 'FID').to.be.lessThan(100); // Good FID < 100ms
            });
            resolve(true);
          }).observe({ entryTypes: ['first-input'] });
          
          // Simulate user interaction
          cy.get('[data-cy=search-destination]').click();
        });
      });
    });

    it('should meet Cumulative Layout Shift (CLS) threshold', () => {
      let cumulativeScore = 0;
      
      cy.window().then((win) => {
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              cumulativeScore += (entry as any).value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Scroll and interact with the page
        cy.scrollTo('bottom', { duration: 2000 });
        cy.wait(1000);
        cy.scrollTo('top', { duration: 2000 });
        
        cy.wait(1000).then(() => {
          expect(cumulativeScore, 'CLS').to.be.lessThan(0.1); // Good CLS < 0.1
        });
      });
    });
  });

  describe('API Performance', () => {
    it('should handle API responses within acceptable time', () => {
      const apiEndpoints = [
        { endpoint: '/api/tours/search', maxTime: 500 },
        { endpoint: '/api/tours/1', maxTime: 200 },
        { endpoint: '/api/user/profile', maxTime: 150 },
        { endpoint: '/api/bookings', maxTime: 300 }
      ];

      apiEndpoints.forEach(api => {
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}${api.endpoint}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        }).then((response) => {
          expect(response.duration, `${api.endpoint} response time`).to.be.lessThan(api.maxTime);
          expect(response.status).to.eq(200);
        });
      });
    });

    it('should handle concurrent API requests efficiently', () => {
      const requests = [];
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          cy.request({
            method: 'GET',
            url: `${Cypress.env('apiUrl')}/api/tours/search?page=${i}`,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`
            }
          })
        );
      }
      
      cy.wrap(Promise.all(requests)).then((responses) => {
        const totalTime = Date.now() - startTime;
        
        // All requests should complete within reasonable time
        expect(totalTime).to.be.lessThan(2000);
        
        // All should be successful
        responses.forEach(response => {
          expect(response.status).to.eq(200);
        });
      });
    });
  });

  describe('Resource Loading', () => {
    it('should optimize image loading', () => {
      cy.visit('/');
      
      // Check for lazy loading attributes
      cy.get('img[loading="lazy"]').should('have.length.greaterThan', 0);
      
      // Check for responsive images
      cy.get('img[srcset]').should('have.length.greaterThan', 0);
      
      // Check image formats
      cy.get('img').each(($img) => {
        const src = $img.attr('src');
        expect(src).to.match(/\.(webp|avif|jpg|jpeg|png)$/i);
        
        // Check for reasonable file sizes (via natural dimensions as proxy)
        expect($img[0].naturalWidth).to.be.lessThan(2000);
      });
    });

    it('should optimize bundle sizes', () => {
      cy.request('/').then((response) => {
        // Check for compression
        expect(response.headers['content-encoding']).to.include('gzip');
        
        // Parse HTML to check script sizes
        const doc = new DOMParser().parseFromString(response.body, 'text/html');
        const scripts = doc.querySelectorAll('script[src]');
        
        scripts.forEach(script => {
          const src = script.getAttribute('src');
          if (src && src.includes('.js')) {
            cy.request(src).then((scriptResponse) => {
              // Main bundle should be under 500KB
              if (src.includes('main')) {
                expect(scriptResponse.body.length).to.be.lessThan(500000);
              }
              // Vendor bundle should be under 800KB
              if (src.includes('vendor')) {
                expect(scriptResponse.body.length).to.be.lessThan(800000);
              }
            });
          }
        });
      });
    });

    it('should implement code splitting', () => {
      cy.visit('/');
      
      // Check initial bundles
      cy.window().then((win) => {
        const initialScripts = win.document.querySelectorAll('script').length;
        
        // Navigate to a new route
        cy.visit('/tours/search');
        
        // Check for dynamically loaded chunks
        cy.window().then((newWin) => {
          const newScripts = newWin.document.querySelectorAll('script').length;
          expect(newScripts).to.be.greaterThan(initialScripts);
        });
      });
    });
  });

  describe('Memory Management', () => {
    it('should not have memory leaks on navigation', () => {
      cy.window().then((win) => {
        const initialMemory = (win.performance as any).memory?.usedJSHeapSize;
        
        // Navigate through multiple pages
        const pages = ['/', '/tours/search', '/dashboard', '/profile'];
        
        pages.forEach(page => {
          cy.visit(page);
          cy.wait(500);
        });
        
        // Return to homepage
        cy.visit('/');
        
        // Force garbage collection if available
        if ((win as any).gc) {
          (win as any).gc();
        }
        
        cy.wait(1000).then(() => {
          const finalMemory = (win.performance as any).memory?.usedJSHeapSize;
          
          // Memory should not grow significantly (allow 20% increase)
          if (initialMemory && finalMemory) {
            expect(finalMemory).to.be.lessThan(initialMemory * 1.2);
          }
        });
      });
    });

    it('should clean up event listeners', () => {
      cy.visit('/');
      
      cy.window().then((win) => {
        // Get initial listener count (mock implementation)
        const getListenerCount = () => {
          let count = 0;
          const events = ['click', 'scroll', 'resize', 'keydown'];
          events.forEach(event => {
            const listeners = win.getEventListeners ? win.getEventListeners(win)[event] : [];
            count += listeners ? listeners.length : 0;
          });
          return count;
        };
        
        const initialListeners = getListenerCount();
        
        // Navigate away and back
        cy.visit('/tours/search');
        cy.visit('/');
        
        const finalListeners = getListenerCount();
        
        // Listener count should be similar
        expect(Math.abs(finalListeners - initialListeners)).to.be.lessThan(5);
      });
    });
  });

  describe('Cache Performance', () => {
    it('should utilize browser caching', () => {
      // First visit
      cy.visit('/');
      
      // Get resource timing
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const cachedResources = resources.filter(r => r.transferSize === 0 && r.decodedBodySize > 0);
        
        // Second visit
        cy.visit('/tours/search');
        cy.visit('/');
        
        cy.window().then((win2) => {
          const resources2 = win2.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
          const cachedResources2 = resources2.filter(r => r.transferSize === 0 && r.decodedBodySize > 0);
          
          // More resources should be cached on second visit
          expect(cachedResources2.length).to.be.greaterThan(cachedResources.length);
        });
      });
    });

    it('should implement service worker caching', () => {
      cy.window().then((win) => {
        // Check if service worker is registered
        cy.wrap(win.navigator.serviceWorker.ready).should('exist');
        
        // Verify cache storage
        win.caches.keys().then(cacheNames => {
          expect(cacheNames.length).to.be.greaterThan(0);
          
          // Check cache contents
          cacheNames.forEach(cacheName => {
            win.caches.open(cacheName).then(cache => {
              cache.keys().then(requests => {
                expect(requests.length).to.be.greaterThan(0);
              });
            });
          });
        });
      });
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize database queries', () => {
      // Login to get access token
      cy.login(Cypress.env('testUser').email, Cypress.env('testUser').password);
      
      // Test N+1 query prevention
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/api/tours/search?include=reviews,guide,destinations`,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      }).then((response) => {
        // Check response headers for query count
        const queryCount = response.headers['x-db-query-count'];
        expect(parseInt(queryCount)).to.be.lessThan(10); // Should use eager loading
      });
    });

    it('should use database connection pooling effectively', () => {
      const requests = [];
      
      // Make multiple concurrent requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          cy.request({
            method: 'GET',
            url: `${Cypress.env('apiUrl')}/api/health/db`,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`
            }
          })
        );
      }
      
      cy.wrap(Promise.all(requests)).then((responses) => {
        // All should succeed without connection exhaustion
        responses.forEach(response => {
          expect(response.status).to.eq(200);
          expect(response.body.connectionPoolSize).to.be.lessThan(50);
        });
      });
    });
  });

  describe('Search Performance', () => {
    it('should implement search debouncing', () => {
      cy.visit('/tours/search');
      
      let requestCount = 0;
      cy.intercept('GET', '**/api/tours/search*', (req) => {
        requestCount++;
        req.reply({
          statusCode: 200,
          body: { results: [] }
        });
      }).as('searchRequest');
      
      // Type quickly
      cy.get('[data-cy=search-input]').type('Bali adventure tours');
      
      // Wait for debounce
      cy.wait(1000);
      
      // Should only make one request despite multiple keystrokes
      expect(requestCount).to.equal(1);
    });

    it('should implement search result caching', () => {
      cy.visit('/tours/search');
      
      // First search
      cy.get('[data-cy=search-input]').type('Bali');
      cy.get('[data-cy=search-submit]').click();
      cy.wait('@searchRequest');
      
      // Clear and search same term again
      cy.get('[data-cy=search-input]').clear().type('Bali');
      cy.get('[data-cy=search-submit]').click();
      
      // Should use cached results (no new request)
      cy.get('@searchRequest.all').should('have.length', 1);
    });
  });
});