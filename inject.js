/**
 * Twitter Video Downloader - Page Context Injection Script
 *
 * This script runs in the page context (not isolated content script context)
 * to intercept fetch/XHR requests before Twitter's code executes.
 *
 * Why page context?
 * - Content scripts run in an isolated environment
 * - They cannot intercept fetch() calls made by the page's own JavaScript
 * - By injecting into page context, we can override fetch before Twitter uses it
 *
 * Security Note:
 * - This script ONLY reads API responses, never modifies them
 * - Original responses are returned unchanged to Twitter
 * - No data is sent to external servers
 */
(function() {
  'use strict';

  // Store reference to original fetch function
  const originalFetch = window.fetch;

  /**
   * Override window.fetch to intercept GraphQL API responses
   * This allows us to read video data from Twitter's API calls
   */
  window.fetch = async function(...args) {
    const url = args[0];
    const urlString = typeof url === 'string' ? url : (url?.url || 'unknown');

    // Only intercept Twitter GraphQL API calls
    if (urlString.includes('/i/api/graphql/')) {
      const response = await originalFetch.apply(window, args);
      const clonedResponse = response.clone();

      try {
        const data = await clonedResponse.json();

        // Send data to content script via postMessage
        // Using window.postMessage is safe here as content script validates the message
        window.postMessage({
          type: 'GRAPHQL_RESPONSE',
          endpoint: urlString.substring(urlString.indexOf('graphql/') + 8),
          data: data
        }, '*');
      } catch (err) {
        // Silently ignore JSON parsing errors (not all responses are JSON)
      }

      // Return original response unchanged - Twitter continues to work normally
      return response;
    }

    // Pass through all non-GraphQL requests unchanged
    return originalFetch.apply(window, args);
  };

  /**
   * Override XMLHttpRequest for compatibility
   * Some parts of Twitter might still use XHR instead of fetch
   */
  const originalXHROpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && url.includes('/i/api/graphql/')) {
      this.addEventListener('load', function() {
        try {
          const data = JSON.parse(this.responseText);

          window.postMessage({
            type: 'GRAPHQL_RESPONSE',
            endpoint: url.substring(url.indexOf('graphql/') + 8),
            data: data
          }, '*');
        } catch (err) {
          // Silently ignore JSON parsing errors
        }
      });
    }

    return originalXHROpen.apply(this, [method, url, ...args]);
  };

})();
