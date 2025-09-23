# Chrome Element Screenshot Plugin

---

[中文版 README](README.md) | [English README](README-EN.md)

---

A powerful Chrome browser extension that supports multiple screenshot modes, provides precise element selection, and offers multilingual interface.

## 🌟 Core Features

### 📸 Multiple Screenshot Modes

- **SnapDOM Mode**: High performance, supports SVG rendering, recommended
- **HTML2Canvas Mode**: Good compatibility, supports complex styles
- **Native Mode**: Uses Chrome API, fast speed

### 🎯 Smart Element Selection

- **Hover Highlight**: Real-time highlighting of page elements on mouse hover
- **Layer Switching**: Mouse wheel to switch element layers, precise targeting
- **One-Click Screenshot**: Click selected element to quickly capture screenshot
- **Auto Save**: Screenshots automatically saved to browser's default download folder

### 🌍 Multilingual Support

- 🇨🇳 [中文](lang/zh-CN.json) - Complete Chinese user interface
- 🇺🇸 [English](lang/en-US.json) - English interface support
- 🇩🇪 [Deutsch](lang/de-DE.json) - Deutsche Benutzeroberfläche
- 🇪🇸 [Español](lang/es-ES.json) - Interfaz en español
- 🇫🇷 [Français](lang/fr-FR.json) - Interface française
- 🇮🇹 [Italiano](lang/it-IT.json) - Interfaccia italiana
- 🇯🇵 [日本語](lang/ja-JP.json) - 日本語インターフェース
- 🇰🇷 [한국어](lang/ko-KR.json) - 한국어 인터페이스
- 🇵🇹 [Português](lang/pt-BR.json) - Interface em português
- 🇷🇺 [Русский](lang/ru-RU.json) - Русский интерфейс

### 🖱️ Multiple Operation Methods

- **Plugin Icon**: Click toolbar icon to start screenshot directly
- **Popup Window**: Select mode and configuration through settings interface
- **Right-click Menu**: Quick access to functions through page right-click menu

## 🚀 Quick Start

### Installation Method

1. Open Chrome browser, visit `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked extension", select plugin folder
4. Installation complete, plugin icon appears in toolbar

### Usage Methods

- **Method 1**: Click toolbar icon → Hover to select element → Click to screenshot
- **Method 2**: Click icon to open settings → Select mode → Start screenshot
- **Method 3**: Right-click menu → "Element Screenshot Tool" → Start screenshot

## ⚙️ Feature Details

### Screenshot Mode Comparison

| Mode | Performance | Compatibility | SVG Support | Recommended Scenario |
|------|-------------|---------------|-------------|---------------------|
| **SnapDOM** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | High performance needs, SVG elements |
| **HTML2Canvas** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | Complex styles, high compatibility requirements |
| **Native Mode** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ | Simple and fast screenshots |

### Operation Tips

- **🎯 Green Highlight**: Mouse hover preview
- **🔴 Red Highlight**: Selected element
- **🖱️ Mouse Wheel**: Switch element layers
- **⌨️ ESC Key**: Cancel selection mode
- **📊 Status Display**: Operation status shown in top-right corner of page

## 🛠️ Technical Architecture

### Core Technologies

- **Manifest V3**: Uses latest Chrome extension API
- **Multilingual System**: Custom language manager with dynamic switching
- **Multiple Screenshot Engines**: Chrome Native API, HTML2Canvas, SnapDOM
- **Smart Element Selection**: DOM traversal and layer management
- **Canvas Image Processing**: Precise cropping and optimization

### Permission Description

- `activeTab` - Access current active tab
- `downloads` - File download permission
- `scripting` - Script injection permission
- `storage` - Store user settings
- `contextMenus` - Right-click menu permission

## 📝 Usage Tips

### Best Practices

1. **Recommended SnapDOM mode**: Best performance, supports SVG
2. **Use HTML2Canvas for complex pages**: Better compatibility
3. **Use native mode for simple and fast**: Fastest speed
4. **Use mouse wheel to switch layers**: Precise target element positioning
5. **Press ESC to cancel selection**: Exit selection mode anytime

### Common Scenarios

- **Web Design**: Quickly screenshot design elements
- **Document Creation**: Save web content
- **Test Reports**: Screenshot page states
- **Study Notes**: Save important information

## 🔧 Development Guide

### Environment Requirements

- Chrome browser 88+
- Browser version supporting Manifest V3
- Modern JavaScript environment

### Custom Configuration

- **`popup.css`**: Modify settings interface styles
- **`content.css`**: Modify selection box styles
- **`lang/*.json`**: Modify multilingual text
- **`background.js`**: Modify file naming rules

## 📊 Update Log

### v1.0.0 (2025-09-23)

- ✨ Initial version release
- 🎯 Support precise element selection
- 📸 Multiple screenshot modes
- 🌍 Multilingual interface support
- 🖱️ Right-click menu integration
- 💾 Automatic file saving
- 🎨 Modern user interface

## ❓ FAQ

**Q: Why can't it be used on certain pages?**  
A: For security reasons, Chrome doesn't allow extensions to be used on special pages like `chrome://`, `chrome-extension://`, etc.

**Q: Which screenshot mode is best?**  
A: SnapDOM mode is recommended as it has the best performance and supports SVG. If compatibility issues occur, switch to HTML2Canvas mode.

**Q: How is screenshot quality guaranteed?**  
A: The plugin automatically detects device pixel ratio to ensure clear screenshots on high-resolution screens.

**Q: Where are screenshot files saved?**  
A: Screenshots are saved to the browser's default download folder with filename format `element_screenshot_YYYYMMDD_HHMMSS.png`.

**Q: How to switch language?**  
A: Select language in the top-right corner of settings interface, or access settings through right-click menu.

**Q: How to cancel selection mode?**  
A: Press ESC key to exit selection mode.

## 🤝 Contributing Guide

Welcome to submit Issues and Pull Requests!

### Development Process

1. Fork this repository
2. Create feature branch
3. Submit changes
4. Create Pull Request

### Code Standards

- Use ES6+ syntax
- Follow Google JavaScript style guide
- Add necessary comments
- Support multiple languages

## 🔗 Related Links

- [Chrome Extension Development Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)
- [HTML2Canvas Documentation](https://html2canvas.hertzen.com/)
- [SnapDOM Documentation](https://github.com/zumerlab/snapdom)

---

**Enjoy the convenient element screenshot experience!** 🎉  
> If you find this plugin useful, please give it a ⭐ Star!
