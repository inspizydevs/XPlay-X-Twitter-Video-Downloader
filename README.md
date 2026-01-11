# X (Twitter) Video Downloader

A lightweight Chrome extension that adds download buttons to Twitter/X videos with multiple quality options.

## ✨ Features

- 🎥 **Multiple Quality Options** - Choose between HD, Standard, and Fast quality
- 🚀 **One-Click Download** - Hover over button to see quality options
- ⚡ **Automatic Detection** - Works on all video tweets automatically
- 🎨 **Clean UI** - Beautiful, non-intrusive download button
- 🌓 **Theme Support** - Works with both light and dark modes
- 🔒 **Privacy First** - No data collection, all processing local

## 📦 Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension is now installed and ready to use!

## 🎯 Usage

1. Visit [twitter.com](https://twitter.com) or [x.com](https://x.com)
2. Scroll through your timeline and find a video tweet
3. Look for the blue download button on the video
4. Hover over the button to see quality options:
   - 🚀 **HD** - Highest quality (2000+ kbps)
   - ⚡ **Standard** - Medium quality (700-2000 kbps)
   - 💾 **Fast** - Lower quality, smaller file (<700 kbps)
5. Click your preferred quality to open the video in a new tab
6. Right-click the video and select "Save video as..." to download

## 🛠️ Technical Details

### How It Works

The extension uses a safe, read-only approach to extract video URLs:

1. **Injection** - Injects a script into the page context at `document_start`
2. **Interception** - Overrides `window.fetch` and `XMLHttpRequest` to intercept Twitter's GraphQL API responses
3. **Extraction** - Extracts video URLs with bitrate information from the API responses
4. **UI Addition** - Adds download buttons with quality selectors to video tweets
5. **No Modification** - All API responses are returned unchanged; Twitter functions normally

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Page Context (twitter.com)                             │
│                                                          │
│  ┌──────────────┐         ┌─────────────────┐          │
│  │  inject.js   │ ──────> │ window.fetch()  │          │
│  │  (override)  │         │ XMLHttpRequest  │          │
│  └──────┬───────┘         └─────────────────┘          │
│         │                                                │
│         │ postMessage (GRAPHQL_RESPONSE)                │
│         │                                                │
│  ┌──────▼──────────────────────────────────┐           │
│  │  content.js (Content Script)            │           │
│  │  - Receives video data                  │           │
│  │  - Extracts URLs & bitrates             │           │
│  │  - Adds download buttons                │           │
│  └─────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
twitter-video-downloader/
├── manifest.json       # Extension configuration
├── inject.js          # Page context script (fetch/XHR override)
├── content.js         # Content script (main logic)
├── background.js      # Service worker
├── popup.html         # Extension popup UI
├── styles.css         # Button and notification styles
├── icons/            # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md         # This file
```

### Permissions Explained

- **`activeTab`** - Access the currently active tab when you click the extension
- **`storage`** - Store user preferences (future feature)
- **`host_permissions`** - Run on twitter.com and x.com domains only

## 🔒 Privacy & Security

### What This Extension Does:
✅ Reads Twitter's GraphQL API responses (read-only)
✅ Extracts video URLs that are already public
✅ Runs only on Twitter/X domains
✅ All processing happens locally in your browser

### What This Extension Does NOT Do:
❌ Does not send any data to external servers
❌ Does not collect or track your browsing activity
❌ Does not modify Twitter's functionality
❌ Does not access your Twitter credentials
❌ Does not intercept private/DM content

### Security Considerations

The extension uses `window.fetch` override in page context to intercept API responses. This is a common technique but requires trust:

- **Code is Open Source** - You can review all code in this repository
- **No Obfuscation** - All code is readable and commented
- **No External Requests** - Extension never contacts external servers
- **Minimal Permissions** - Only requests necessary permissions

## 🐛 Troubleshooting

### Download button not appearing?
- Refresh the page (Twitter is a single-page app)
- Make sure the extension is enabled in `chrome://extensions/`
- Check if the video is a native Twitter video (not YouTube embed)

### Videos not opening?
- Check if your browser is blocking pop-ups
- Try disabling other Twitter-related extensions temporarily
- Clear browser cache and reload Twitter

### Extension not working after Twitter update?
- Twitter frequently updates their website structure
- Check for extension updates or report an issue on GitHub

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Clone the repository
2. Make your changes
3. Load the extension in Chrome (Developer Mode)
4. Test on twitter.com/x.com
5. Submit a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built for the Twitter/X community
- Inspired by the need for simple video downloading
- Thanks to all contributors and users

## ⚠️ Disclaimer

This extension is for personal use only. Please respect content creators' rights and Twitter's Terms of Service. Always credit the original creator when sharing downloaded content.

---

**Made with ❤️ for Twitter users**

If you find this extension helpful, please give it a ⭐ on GitHub!
