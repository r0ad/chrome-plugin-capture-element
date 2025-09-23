# Chrome 元素截图插件

---

[中文版 README](README.md) | [English README](README-EN.md)

---

一个功能强大的 Chrome 浏览器扩展，支持多种截图模式，提供精确的元素选择和多语言界面。

## 🌟 核心功能

### 📸 多种截图模式

- **SnapDOM模式**：高性能，支持SVG渲染，推荐使用
- **HTML2Canvas模式**：兼容性好，支持复杂样式
- **原生模式**：使用Chrome API，速度快

### 🎯 智能元素选择

- **悬停高亮**：鼠标悬停时实时高亮显示页面元素
- **层级切换**：滚轮切换元素层级，精确定位目标
- **一键截图**：点击选中元素即可快速截图
- **自动保存**：截图自动保存到浏览器默认下载文件夹

### 🌍 多语言支持

- 🇨🇳 [中文](lang/zh-CN.json) - 完整的中文用户界面
- 🇺🇸 [English](lang/en-US.json) - English interface support
- 🇩🇪 [Deutsch](lang/de-DE.json) - Deutsche Benutzeroberfläche
- 🇪🇸 [Español](lang/es-ES.json) - Interfaz en español
- 🇫🇷 [Français](lang/fr-FR.json) - Interface française
- 🇮🇹 [Italiano](lang/it-IT.json) - Interfaccia italiana
- 🇯🇵 [日本語](lang/ja-JP.json) - 日本語インターフェース
- 🇰🇷 [한국어](lang/ko-KR.json) - 한국어 인터페이스
- 🇵🇹 [Português](lang/pt-BR.json) - Interface em português
- 🇷🇺 [Русский](lang/ru-RU.json) - Русский интерфейс

### 🖱️ 多种操作方式

- **插件图标**：点击工具栏图标直接开始截图
- **弹出窗口**：通过设置界面选择模式和配置
- **右键菜单**：页面右键菜单快速访问功能

## 🚀 快速开始

### 安装方法

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择插件文件夹
4. 安装完成，工具栏显示插件图标

### 使用方法

- **方法一**：点击工具栏图标 → 悬停选择元素 → 点击截图
- **方法二**：点击图标打开设置 → 选择模式 → 开始截图
- **方法三**：右键菜单 → 「元素截图工具」→ 开始截图

## ⚙️ 功能详解

### 截图模式对比

| 模式 | 性能 | 兼容性 | SVG支持 | 推荐场景 |
|------|------|--------|---------|----------|
| **SnapDOM** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | 高性能需求，SVG元素 |
| **HTML2Canvas** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | 复杂样式，兼容性要求高 |
| **原生模式** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ | 简单快速截图 |

### 操作提示

- **🎯 绿色高亮**：鼠标悬停预览
- **🔴 红色高亮**：已选中元素
- **🖱️ 滚轮**：切换元素层级
- **⌨️ ESC键**：取消选择模式
- **📊 状态显示**：页面右上角显示操作状态

## 🛠️ 技术架构

### 核心技术

- **Manifest V3**：使用最新的 Chrome 扩展 API
- **多语言系统**：自定义语言管理器，支持动态切换
- **多种截图引擎**：Chrome Native API、HTML2Canvas、SnapDOM
- **智能元素选择**：DOM 遍历和层级管理
- **Canvas 图像处理**：精确裁剪和优化

### 权限说明

- `activeTab` - 访问当前活动标签页
- `downloads` - 下载文件权限
- `scripting` - 脚本注入权限
- `storage` - 存储用户设置
- `contextMenus` - 右键菜单权限

## 📝 使用技巧

### 最佳实践

1. **推荐使用SnapDOM模式**：性能最佳，支持SVG
2. **复杂页面使用HTML2Canvas**：兼容性更好
3. **简单快速使用原生模式**：速度最快
4. **使用滚轮切换层级**：精确定位目标元素
5. **按ESC取消选择**：随时退出选择模式

### 常见场景

- **网页设计**：快速截图设计元素
- **文档制作**：保存网页内容
- **测试报告**：截图页面状态
- **学习笔记**：保存重要信息

## 🔧 开发说明

### 环境要求

- Chrome 浏览器 88+
- 支持 Manifest V3 的浏览器版本
- 现代 JavaScript 环境

### 自定义配置

- **`popup.css`**：修改设置界面样式
- **`content.css`**：修改选择框样式
- **`lang/*.json`**：修改多语言文本
- **`background.js`**：修改文件命名规则

## 📊 更新日志

### v1.0.0 (2025-09-23)

- ✨ 初始版本发布
- 🎯 支持精确元素选择
- 📸 多种截图模式
- 🌍 多语言界面支持
- 🖱️ 右键菜单集成
- 💾 自动文件保存
- 🎨 现代化用户界面

## ❓ 常见问题

**Q: 为什么某些页面无法使用？**  
A: 出于安全考虑，Chrome 不允许在 `chrome://`、`chrome-extension://` 等特殊页面使用扩展。

**Q: 哪种截图模式最好？**  
A: 推荐使用SnapDOM模式，它性能最佳且支持SVG。如果遇到兼容性问题，可以切换到HTML2Canvas模式。

**Q: 截图质量如何保证？**  
A: 插件会自动检测设备像素比，确保在高分辨率屏幕上也能获得清晰的截图。

**Q: 截图文件保存在哪里？**  
A: 截图会保存到浏览器的默认下载文件夹，文件名格式为 `element_screenshot_YYYYMMDD_HHMMSS.png`。

**Q: 如何切换语言？**  
A: 在设置界面右上角选择语言，或通过右键菜单访问设置。

**Q: 如何取消选择模式？**  
A: 按 ESC 键即可退出选择模式。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

### 代码规范

- 使用 ES6+ 语法
- 遵循 Google JavaScript 风格指南
- 添加必要的注释
- 支持多语言

## 🔗 相关链接

- [Chrome 扩展开发文档](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/migrating/)
- [HTML2Canvas 文档](https://html2canvas.hertzen.com/)
- [SnapDOM 文档](https://github.com/zumerlab/snapdom)

---

**享受便捷的元素截图体验！** 🎉  
> 如果您觉得这个插件有用，请给个 ⭐ Star 支持一下！
