/**
 * Twitter Video Downloader - Background Service Worker
 * Minimal service worker - main logic handled in content script
 */

// Service worker remains active to maintain extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed successfully
});
