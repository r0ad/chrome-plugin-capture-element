// 元素截图插件 - 后台脚本
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    console.log('BackgroundService 初始化中...');
    
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
    chrome.contextMenus.create({
      id: 'startElementCapture',
      title: '开始元素截图',
      contexts: ['page']
    });
    
    // 监听右键菜单点击
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'startElementCapture') {
        console.log('右键菜单被点击，标签页ID:', tab.id);
        this.toggleCapture(tab.id);
      }
    });
    
    console.log('BackgroundService 初始化完成');
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
      const elementClass = elementInfo.className ? `-${elementInfo.className.split(' ')[0]}` : '';
      
      const filename = `${elementName.toLowerCase()}${elementId}${elementClass}-${timestamp}.png`;
      
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

  // 获取元素描述
  getElementDescription(elementInfo) {
    if (!elementInfo) return 'unknown';
    
    const tagName = elementInfo.tagName || 'element';
    const id = elementInfo.id ? `-${elementInfo.id}` : '';
    const className = elementInfo.className ? `-${elementInfo.className.split(' ')[0]}` : '';
    
    return `${tagName.toLowerCase()}${id}${className}`;
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