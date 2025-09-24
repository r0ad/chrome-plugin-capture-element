// 元素截图插件 - 后台脚本
class BackgroundService {
  constructor() {
    this.translations = {};
    this.currentLanguage = 'zh-CN';
    this.init();
  }

  async init() {
    console.log('BackgroundService 初始化中...');
    
    // 初始化语言管理器
    await this.initLanguageManager();
    
    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('收到消息:', request.action, sender.tab?.id);
      
      if (request.action === 'captureElement') {
        this.handleElementCapture(request.data, sender.tab.id)
          .then(result => {
            console.log('截图处理成功:', result);
            sendResponse(result);
          })
          .catch(error => {
            console.error('截图处理失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // 保持消息通道开放
      } else if (request.action === 'downloadImage') {
        this.handleDirectDownload(request.data)
          .then(result => {
            console.log('下载处理成功:', result);
            sendResponse(result);
          })
          .catch(error => {
            console.error('处理下载请求失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // 保持消息通道开放
      } else if (request.action === 'updateContextMenus') {
        // 处理语言切换时更新右键菜单
        const language = request.language; // 获取传递的语言参数
        this.updateContextMenus(language)
          .then(() => {
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('更新右键菜单失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // 保持消息通道开放
      }
      
      // 如果不是已知的action，返回false
      return false;
    });

    // 监听插件图标点击事件
    chrome.action.onClicked.addListener((tab) => {
      console.log('插件图标被点击，标签页ID:', tab.id);
      this.toggleCapture(tab.id);
    });
    
    // 创建右键菜单
    this.createContextMenus();
    
    // 设置初始插件标题
    this.updateActionTitle();
    
    // 监听右键菜单点击
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'startElementCapture') {
        console.log('右键菜单被点击，标签页ID:', tab.id);
        this.toggleCapture(tab.id);
      } else if (info.menuItemId === 'captureSettings') {
        console.log('截图设置被点击');
        this.openSettings();
      }
    });
    
    console.log('BackgroundService 初始化完成');
  }

  // 初始化语言管理器
  async initLanguageManager() {
    try {
      // 从存储中获取用户设置的语言
      const result = await chrome.storage.sync.get(['language']);
      this.currentLanguage = result.language || 'zh-CN';
      
      // 加载语言文件
      const response = await fetch(chrome.runtime.getURL(`lang/${this.currentLanguage}.json`));
      if (response.ok) {
        this.translations = await response.json();
        console.log('语言加载成功:', this.currentLanguage);
      } else {
        console.error('语言文件加载失败:', this.currentLanguage);
        // 使用默认中文
        this.translations = await this.loadDefaultTranslations();
        this.currentLanguage = 'zh-CN';
      }
    } catch (error) {
      console.error('初始化语言管理器失败:', error);
      // 使用默认中文
      this.translations = await this.loadDefaultTranslations();
      this.currentLanguage = 'zh-CN';
    }
  }

  // 加载默认翻译（中文）
  async loadDefaultTranslations() {
    try {
      const response = await fetch(chrome.runtime.getURL('lang/zh-CN.json'));
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('加载默认翻译失败:', error);
    }
    return {};
  }

  // 获取翻译文本
  t(key, params = {}) {
    if (!this.translations) return key;
    
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn('翻译键不存在:', key);
        return key; // 返回键名作为后备
      }
    }
    
    if (typeof value === 'string') {
      // 替换参数
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] || match;
      });
    }
    
    return value || key;
  }

  // 创建右键菜单
  createContextMenus() {
    // 清除现有的右键菜单
    chrome.contextMenus.removeAll(() => {
      // 创建父菜单（插件名称）
      chrome.contextMenus.create({
        id: 'elementCaptureMain',
        title: this.t('app.name'),
        contexts: ['page']
      });
      
      // 创建子菜单项
      chrome.contextMenus.create({
        id: 'startElementCapture',
        parentId: 'elementCaptureMain',
        title: this.t('contextMenu.startElementCapture'),
        contexts: ['page']
      });
      
      chrome.contextMenus.create({
        id: 'captureSettings',
        parentId: 'elementCaptureMain',
        title: this.t('contextMenu.captureSettings'),
        contexts: ['page']
      });
      
      console.log('右键菜单创建完成');
    });
  }

  // 更新右键菜单（语言切换时调用）
  async updateContextMenus(language = null) {
    try {
      if (language) {
        // 如果指定了语言，直接加载该语言
        this.currentLanguage = language;
        const response = await fetch(chrome.runtime.getURL(`lang/${language}.json`));
        if (response.ok) {
          this.translations = await response.json();
          console.log('语言加载成功:', language);
        } else {
          console.error('语言文件加载失败:', language);
          return;
        }
      } else {
        // 重新加载当前语言设置
        await this.initLanguageManager();
      }
      
      // 更新右键菜单 - 使用删除重建的方式确保更新生效
      const startTitle = this.t('contextMenu.startElementCapture');
      const settingsTitle = this.t('contextMenu.captureSettings');
      
      console.log('准备更新右键菜单:');
      console.log('- startElementCapture:', startTitle);
      console.log('- captureSettings:', settingsTitle);
      
      // 先删除现有菜单
      chrome.contextMenus.removeAll(() => {
        // 重新创建菜单
        const mainTitle = this.t('app.name');
        
        // 创建父菜单（插件名称）
        chrome.contextMenus.create({
          id: 'elementCaptureMain',
          title: mainTitle,
          contexts: ['page']
        });
        
        // 创建子菜单项
        chrome.contextMenus.create({
          id: 'startElementCapture',
          parentId: 'elementCaptureMain',
          title: startTitle,
          contexts: ['page']
        });
        
        chrome.contextMenus.create({
          id: 'captureSettings',
          parentId: 'elementCaptureMain',
          title: settingsTitle,
          contexts: ['page']
        });
        
        console.log('右键菜单已重新创建，当前语言:', this.currentLanguage);
        
        // 更新插件标题
        this.updateActionTitle();
      });
    } catch (error) {
      console.error('更新右键菜单失败:', error);
    }
  }

  // 更新插件标题
  updateActionTitle() {
    try {
      const title = this.t('app.name');
      chrome.action.setTitle({ title: title });
      console.log('插件标题已更新:', title);
    } catch (error) {
      console.error('更新插件标题失败:', error);
    }
  }

  async handleElementCapture(captureData, tabId) {
    try {
      // 使用chrome.tabs.captureVisibleTab截取整个页面
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 100
      });

      // 裁剪指定区域
      const croppedDataUrl = await this.cropImage(dataUrl, captureData);

      // 保存图片到下载文件夹
      const filename = await this.downloadImage(croppedDataUrl, captureData);

      return { success: true, filename };
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  }

  async cropImage(dataUrl, captureData) {
    try {
      console.log('裁剪数据:', captureData);
      
      // 将dataURL转换为blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // 使用createImageBitmap替代Image构造函数
      const imageBitmap = await createImageBitmap(blob);
      
      console.log('原始图片尺寸:', imageBitmap.width, 'x', imageBitmap.height);
      
      // 计算实际的像素比例
      const scale = captureData.devicePixelRatio || 1;
      
      // 计算裁剪区域，确保不超出截图边界
      const sourceX = Math.max(0, Math.round(captureData.viewportX * scale));
      const sourceY = Math.max(0, Math.round(captureData.viewportY * scale));
      const sourceWidth = Math.max(1, Math.round(captureData.width * scale));
      const sourceHeight = Math.max(1, Math.round(captureData.height * scale));
      
      // 确保裁剪区域不超出图片边界
      const finalSourceX = Math.max(0, Math.min(sourceX, imageBitmap.width));
      const finalSourceY = Math.max(0, Math.min(sourceY, imageBitmap.height));
      const finalWidth = Math.max(1, Math.min(sourceWidth, imageBitmap.width - finalSourceX));
      const finalHeight = Math.max(1, Math.min(sourceHeight, imageBitmap.height - finalSourceY));
      
      console.log('裁剪参数详情:', { sourceX, sourceY, sourceWidth, sourceHeight, finalSourceX, finalSourceY, finalWidth, finalHeight, scale, captureData, imageBitmap: { width: imageBitmap.width, height: imageBitmap.height } });
      
      // 确保裁剪区域有效
      if (finalWidth <= 0 || finalHeight <= 0) {
        throw new Error(`无效的裁剪区域: ${finalWidth}x${finalHeight}`);
      }
      
      // 创建裁剪后的图像
      const croppedBitmap = await createImageBitmap(
        imageBitmap,
        finalSourceX,
        finalSourceY,
        finalWidth,
        finalHeight
      );
      
      // 创建高分辨率canvas，确保参数为正整数
      const outputWidth = Math.max(1, Math.round(finalWidth));
      const outputHeight = Math.max(1, Math.round(finalHeight));
      const canvas = new OffscreenCanvas(outputWidth, outputHeight);
      const ctx = canvas.getContext('2d');
      
      // 设置高质量渲染
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 绘制裁剪后的图像，保持原始分辨率
      ctx.drawImage(croppedBitmap, 0, 0, outputWidth, outputHeight);

      // 转换为高质量PNG
      const croppedBlob = await canvas.convertToBlob({ 
        type: 'image/png',
        quality: 1.0
      });
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
      });
    } catch (error) {
      console.error('图片裁剪失败:', error);
      throw error;
    }
  }

  async downloadImage(dataUrl, captureData) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const elementInfo = captureData.elementInfo || {};
      const elementName = elementInfo.tagName || 'element';
      const elementId = elementInfo.id ? `-${elementInfo.id}` : '';
      const elementClass = this.safeClassName(elementInfo.className);
      const classPart = elementClass ? `-${elementClass}` : '';
      
      const filename = `${elementName.toLowerCase()}${elementId}${classPart}-${timestamp}.png`;
      
      // 使用chrome.downloads API下载图片
      await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false // 直接保存到默认下载文件夹
      });
      
      return filename;
    } catch (error) {
      console.error('下载失败:', error);
      throw error;
    }
  }

  // 安全处理字符串，防止类型错误
  safeString(value, defaultValue = '') {
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value.toString === 'function') {
      return value.toString();
    }
    return defaultValue;
  }

  // 安全处理className，返回第一个类名
  safeClassName(className) {
    const safeClass = this.safeString(className);
    if (safeClass && safeClass.includes(' ')) {
      return safeClass.split(' ')[0];
    }
    return safeClass;
  }

  // 获取元素描述
  getElementDescription(elementInfo) {
    if (!elementInfo) return 'unknown';
    
    const tagName = this.safeString(elementInfo.tagName, 'element');
    const id = this.safeString(elementInfo.id, '');
    const className = this.safeClassName(elementInfo.className);
    
    const idPart = id ? `-${id}` : '';
    const classPart = className ? `-${className}` : '';
    
    return `${tagName.toLowerCase()}${idPart}${classPart}`;
  }



  // 处理html2canvas生成的图片直接下载
  async handleDirectDownload(data) {
    try {
      const { dataUrl, elementInfo } = data;
      
      if (!dataUrl) {
        throw new Error('无效的图片数据');
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const elementDesc = this.getElementDescription(elementInfo);
      const filename = `element-capture-${elementDesc}-${timestamp}.png`;
      
      return new Promise((resolve) => {
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: false
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('下载失败:', chrome.runtime.lastError);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log('下载成功, ID:', downloadId);
            resolve({ success: true, filename: filename, downloadId: downloadId });
          }
        });
      });
    } catch (error) {
      console.error('直接下载失败:', error);
      throw error;
    }
  }

  generateFilename() {
    const now = new Date();
    const timestamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    
    return `element_screenshot_${timestamp}.png`;
  }

  // 打开设置页面
  async openSettings() {
    try {
      // 创建新标签页打开设置页面
      await chrome.tabs.create({
        url: chrome.runtime.getURL('popup.html'),
        active: true
      });
    } catch (error) {
      console.error('无法打开设置页面:', error);
    }
  }

  async toggleCapture(tabId) {
    console.log('开始启动截图功能，标签页ID:', tabId);
    
    try {
      // 检查标签页是否存在
      const tab = await chrome.tabs.get(tabId);
      console.log('目标标签页:', tab.url);
      
      // 检查是否是特殊页面
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:')) {
        console.log('特殊页面，无法截图:', tab.url);
        return;
      }
      
      // 获取默认截图模式配置
      const result = await chrome.storage.sync.get(['defaultCaptureMode']);
      const defaultMode = result.defaultCaptureMode || 'snapdom';
      console.log('使用默认模式:', defaultMode);
      
      // 向content script发送开始截图的消息，包含默认模式
      await chrome.tabs.sendMessage(tabId, { 
        action: 'startCapture',
        mode: defaultMode
      });
      console.log('消息发送成功');
      
    } catch (error) {
      console.error('无法启动截图功能:', error);
      
      // 如果content script未加载，尝试注入
      try {
        console.log('尝试注入content script...');
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['libs/html2canvas.min.js', 'libs/snapdom.min.js', 'content.js']
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['content.css']
        });
        
        console.log('Content script注入成功，等待加载...');
        
        // 重新尝试发送消息
        setTimeout(async () => {
          try {
            const result = await chrome.storage.sync.get(['defaultCaptureMode']);
            const defaultMode = result.defaultCaptureMode || 'snapdom';
            console.log('重新发送消息，模式:', defaultMode);
            await chrome.tabs.sendMessage(tabId, { 
              action: 'startCapture',
              mode: defaultMode
            });
            console.log('重新发送消息成功');
          } catch (e) {
            console.error('注入后仍无法启动截图功能:', e);
          }
        }, 500); // 增加等待时间
      } catch (injectError) {
        console.error('无法注入content script:', injectError);
      }
    }
  }
}

// 初始化后台服务
const backgroundService = new BackgroundService();

// 处理插件安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('元素截图插件已安装');
  } else if (details.reason === 'update') {
    console.log('元素截图插件已更新');
  }
});