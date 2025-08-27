# Chrome 元素截图插件

一个强大的 Chrome 浏览器扩展，可以快速截图选中的页面元素并保存到本地。

## 🚀 功能特性

- **精确元素选择**：鼠标悬停高亮显示页面元素
- **一键截图**：点击选中元素即可快速截图
- **自动保存**：截图自动保存到浏览器默认下载文件夹
- **高质量输出**：支持高分辨率屏幕，保证截图清晰度
- **用户友好**：简洁直观的操作界面
- **兼容性强**：支持所有网页元素截图

## 📦 安装方法

### 开发者模式安装

1. 打开 Chrome 浏览器
2. 在地址栏输入 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本插件的文件夹
6. 插件安装完成，工具栏会显示插件图标

### 文件结构

```
chrome-plugin-capture-element/
├── manifest.json          # 插件配置文件
├── background.js          # 后台脚本
├── content.js            # 内容脚本
├── content.css           # 内容脚本样式
├── popup.html            # 弹出页面
├── popup.js              # 弹出页面脚本
├── popup.css             # 弹出页面样式
├── convert-icons.html    # 图标转换工具
├── icons/                # 图标文件夹
│   ├── icon16.svg
│   ├── icon48.svg
│   └── icon128.svg
└── README.md             # 说明文档
```

## 🎯 使用方法

### 方法一：通过弹出窗口

1. 点击浏览器工具栏中的插件图标
2. 在弹出窗口中点击「开始截图」按钮
3. 页面会进入选择模式，鼠标悬停在元素上会高亮显示
4. 点击要截图的元素
5. 截图会自动保存到下载文件夹

### 方法二：直接点击图标

1. 直接点击浏览器工具栏中的插件图标
2. 页面自动进入选择模式
3. 选择并点击要截图的元素
4. 截图自动保存

### 操作提示

- **ESC 键**：取消当前选择模式
- **红色高亮框**：表示当前选中的元素
- **状态提示**：页面右上角会显示操作状态

## 🔧 技术实现

### 核心技术

- **Manifest V3**：使用最新的 Chrome 扩展 API
- **Canvas API**：用于图像裁剪和处理
- **Chrome Extensions API**：
  - `chrome.tabs.captureVisibleTab`：截取页面
  - `chrome.downloads`：保存文件
  - `chrome.scripting`：注入脚本

### 工作流程

1. **元素选择**：content script 监听鼠标事件，实时高亮元素
2. **坐标计算**：获取选中元素的精确位置和尺寸
3. **页面截图**：background script 调用 API 截取整个页面
4. **图像裁剪**：使用 Canvas API 裁剪出目标元素区域
5. **文件保存**：通过 downloads API 保存到本地

## 🛠️ 开发说明

### 环境要求

- Chrome 浏览器 88+
- 支持 Manifest V3 的浏览器版本

### 权限说明

```json
{
  "permissions": [
    "activeTab",      // 访问当前活动标签页
    "downloads",      // 下载文件权限
    "scripting"       // 脚本注入权限
  ],
  "host_permissions": [
    "<all_urls>"      // 访问所有网站
  ]
}
```

### 自定义配置

可以修改以下文件来自定义插件：

- **popup.css**：修改弹出窗口样式
- **content.css**：修改页面选择框样式
- **background.js**：修改文件命名规则

## 🎨 界面预览

### 弹出窗口
- 现代化渐变设计
- 清晰的操作指引
- 实时状态反馈

### 选择模式
- 红色高亮选择框
- 平滑的动画效果
- 直观的操作提示

## 📝 更新日志

### v1.0.0 (2024-01-27)
- ✨ 初始版本发布
- 🎯 支持精确元素选择
- 📸 高质量截图功能
- 💾 自动文件保存
- 🎨 美观的用户界面

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

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🔗 相关链接

- [Chrome 扩展开发文档](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/migrating/)

## ❓ 常见问题

### Q: 为什么某些页面无法使用？
A: 出于安全考虑，Chrome 不允许在 `chrome://`、`chrome-extension://` 等特殊页面使用扩展。

### Q: 截图质量如何保证？
A: 插件会自动检测设备像素比，确保在高分辨率屏幕上也能获得清晰的截图。

### Q: 截图文件保存在哪里？
A: 截图会保存到浏览器的默认下载文件夹，文件名格式为 `element_screenshot_YYYYMMDD_HHMMSS.png`。

### Q: 如何取消选择模式？
A: 按 ESC 键即可退出选择模式。

---

**享受便捷的元素截图体验！** 🎉