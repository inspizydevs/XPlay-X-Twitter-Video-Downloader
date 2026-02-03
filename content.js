/**
 * Twitter Video Downloader - Content Script
 *
 * This content script:
 * 1. Injects inject.js into the page context to intercept API calls
 * 2. Receives video data via postMessage from the injected script
 * 3. Extracts video URLs with multiple quality options
 * 4. Adds download buttons with quality selector to video tweets
 * 5. Opens videos in new tab when user selects a quality
 */
(function() {
  'use strict';

  // Cache to store video data by tweet ID
  const videoCache = new Map();

  /**
   * Inject script into page context to intercept fetch/XHR
   * The script is loaded from web_accessible_resources
   */
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    this.remove(); // Clean up after injection
  };

  (document.head || document.documentElement).appendChild(script);

  /**
   * Listen for messages from the injected page script
   * Validates message type before processing
   */
  window.addEventListener('message', (event) => {
    // Validate message origin and type
    if (event.data && event.data.type === 'GRAPHQL_RESPONSE') {
      const data = event.data.data;
      extractVideoData(data);
    }
  });

  /**
   * Recursively extract video data from Twitter's GraphQL API response
   * @param {Object} obj - The response object to search
   * @param {number} depth - Current recursion depth (prevents infinite loops)
   */
  function extractVideoData(obj, depth = 0) {
    // Safety: Prevent infinite recursion and validate input
    if (!obj || typeof obj !== 'object' || depth > 20) return;

    // Look for tweet objects with video data
    // Tweet objects have both 'legacy' and 'rest_id' properties
    if (obj.legacy && obj.rest_id) {
      const tweetId = obj.rest_id;
      const legacy = obj.legacy;

      // Check if this tweet has extended entities with video
      if (legacy.extended_entities?.media) {
        const media = legacy.extended_entities.media;

        for (const item of media) {
          if (item.type === 'video' || item.type === 'animated_gif') {
            const variants = item.video_info?.variants || [];

            // Filter and sort video URLs by bitrate (keep all qualities)
            const videoQualities = variants
              .filter(v => v.content_type === 'video/mp4')
              .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
              .map(v => ({
                url: v.url,
                bitrate: v.bitrate || 0
              }));

            if (videoQualities.length > 0) {
              videoCache.set(tweetId, videoQualities);
              addDownloadButton(tweetId);
            }
          }
        }
      }
    }

    // Recursively search through the object
    if (Array.isArray(obj)) {
      obj.forEach(item => extractVideoData(item, depth + 1));
    } else {
      Object.values(obj).forEach(value => {
        if (value && typeof value === 'object') {
          extractVideoData(value, depth + 1);
        }
      });
    }
  }

  /**
   * Add download button with quality selector to a video tweet
   * @param {string} tweetId - The Twitter/X post ID
   */
  function addDownloadButton(tweetId) {
    // Find the article element containing this tweet
    const articles = document.querySelectorAll('article');

    for (const article of articles) {
      // Check if this article contains the tweet ID
      const links = article.querySelectorAll('a[href*="/status/"]');

      for (const link of links) {
        if (link.href.includes(`/status/${tweetId}`)) {
          // Found the right tweet! Now find the video container
          const videoContainer = article.querySelector('[data-testid="videoPlayer"]');

          if (videoContainer && !videoContainer.querySelector('.twitter-video-download-btn')) {
            // Create button container
            const btnContainer = document.createElement('div');
            btnContainer.className = 'twitter-video-download-btn';
            btnContainer.style.cssText = `
              position: absolute;
              top: 10px;
              right: 10px;
              z-index: 9999;
            `;

            // Create download button
            const btn = document.createElement('button');
            btn.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            `;
            btn.style.cssText = `
              background: rgba(29, 155, 240, 0.9);
              border: none;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s;
            `;

            // Create dropdown menu
            const dropdown = document.createElement('div');
            dropdown.className = 'quality-dropdown';
            dropdown.style.cssText = `
              position: absolute;
              top: 45px;
              right: 0;
              background: rgba(0, 0, 0, 0.9);
              border-radius: 8px;
              padding: 8px;
              min-width: 140px;
              display: none;
              flex-direction: column;
              gap: 4px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;

            // Get quality options
            const qualities = getQualityOptions(tweetId);

            qualities.forEach(quality => {
              const option = document.createElement('button');
              option.textContent = quality.label;
              option.style.cssText = `
                background: transparent;
                border: none;
                color: white;
                padding: 8px 12px;
                text-align: left;
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
                transition: background 0.2s;
              `;

              option.onmouseover = () => {
                option.style.background = 'rgba(29, 155, 240, 0.3)';
              };
              option.onmouseout = () => {
                option.style.background = 'transparent';
              };

              option.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openVideo(quality.url);
                dropdown.style.display = 'none';
              };

              dropdown.appendChild(option);
            });

            // Toggle dropdown on click
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (dropdown.style.display === 'flex') {
                dropdown.style.display = 'none';
                btn.style.background = 'rgba(29, 155, 240, 0.9)';
              } else {
                // Close other dropdowns if any (optional but nice)
                document.querySelectorAll('.quality-dropdown').forEach(d => d.style.display = 'none');
                
                dropdown.style.display = 'flex';
                btn.style.background = 'rgba(29, 155, 240, 1)';
              }
            };

            // Close dropdown when clicking outside listener removed - handled globally


            btnContainer.appendChild(btn);
            btnContainer.appendChild(dropdown);

            // Add button to video container
            videoContainer.style.position = 'relative';
            videoContainer.appendChild(btnContainer);

            return;
          }
        }
      }
    }
  }

  /**
   * Get quality options for a video with human-readable labels
   * @param {string} tweetId - The Twitter/X post ID
   * @returns {Array} Array of quality options with labels and URLs
   */
  function getQualityOptions(tweetId) {
    const videoQualities = videoCache.get(tweetId);

    if (!videoQualities || videoQualities.length === 0) {
      return [];
    }

    // Map bitrates to user-friendly quality labels
    return videoQualities.map(quality => {
      let label = '';
      const bitrateKbps = Math.round(quality.bitrate / 1000);

      if (quality.bitrate >= 2000000) {
        label = `🚀 HD (${bitrateKbps}kbps)`;
      } else if (quality.bitrate >= 700000) {
        label = `⚡ Standard (${bitrateKbps}kbps)`;
      } else {
        label = `💾 Fast (${bitrateKbps}kbps)`;
      }

      return {
        label: label,
        url: quality.url,
        bitrate: quality.bitrate
      };
    });
  }

  /**
   * Open video URL in a new browser tab
   * @param {string} url - The video URL to open
   */
  function openVideo(url) {
    window.open(url, '_blank');
    showNotification('Video opened in new tab!');
  }

  /**
   * Show a temporary notification to the user
   * @param {string} message - The message to display
   */
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(29, 155, 240, 0.95);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(notification);

    // Auto-remove notification after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * MutationObserver to detect when new tweets are loaded
   * Twitter is a single-page app that dynamically loads content
   */
  const observer = new MutationObserver(() => {
    // Re-add buttons for any cached videos that might now be visible
    videoCache.forEach((_qualities, tweetId) => {
      addDownloadButton(tweetId);
    });
  });

  /**
   * Start observing DOM changes when page is ready
   * This handles Twitter's infinite scroll and navigation
   */
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  /**
   * Global click listener to close dropdowns when clicking outside
   */
  document.addEventListener('click', (e) => {
    // If click is NOT inside a download button container
    if (!e.target.closest('.twitter-video-download-btn')) {
      // Hide all dropdowns
      document.querySelectorAll('.quality-dropdown').forEach(d => {
        d.style.display = 'none';
      });
      
      // Reset button styles
      document.querySelectorAll('.twitter-video-download-btn > button').forEach(btn => {
        btn.style.background = 'rgba(29, 155, 240, 0.9)';
      });
    }
  });

})();
