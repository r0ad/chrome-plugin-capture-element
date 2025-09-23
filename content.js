// 元素截图插件 - 内容脚本

// 防止重复初始化
if (window.elementCaptureInstance) {
  console.log('ElementCapture already initialized, skipping...');
} else {
  window.elementCaptureInstance = true;

class ElementCapture {
  constructor() {
    this.isSelecting = false;
    this.highlightBox = null;
    this.currentElement = null;
    this.hoverTimeout = null;
    this.elementStack = [];
    this.currentStackIndex = 0;
    this.captureMode = 'snapdom'; // 默认使用SnapDOM截图模式，可选 'native'、'html2canvas' 或 'snapdom'
    this.languageManager = null;
    
    // 绑定事件处理函数以确保正确的this上下文和函数引用
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    
    this.init();
  }

  async init() {
    console.log('ElementCapture 初始化中...');
    
    // 初始化语言管理器
    await this.initLanguageManager();
    
    // 检查依赖库是否加载
    console.log('html2canvas 可用:', typeof html2canvas !== 'undefined');
    console.log('snapdom 可用:', typeof snapdom !== 'undefined');
    
    // 检查snapdom的具体方法
    if (typeof snapdom !== 'undefined') {
      console.log('snapdom 方法:', Object.keys(snapdom));
      console.log('snapdom.toPng 可用:', typeof snapdom.toPng === 'function');
      console.log('snapdom.toBlob 可用:', typeof snapdom.toBlob === 'function');
    }
    
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('收到消息:', request);
      
      if (request.mode) {
        this.captureMode = request.mode;
        console.log('设置截图模式为:', this.captureMode);
      }
      
      if (request.action === 'startCapture') {
        console.log('开始元素选择');
        this.startElementSelection();
        sendResponse({ success: true });
      } else if (request.action === 'stopCapture') {
        console.log('停止元素选择');
        this.stopElementSelection();
        sendResponse({ success: true });
      } else if (request.action === 'setCaptureMode') {
        this.captureMode = request.mode || 'native';
        console.log('设置截图模式为:', this.captureMode);
        sendResponse({ success: true, mode: this.captureMode });
      }
    });
    
    console.log('ElementCapture 初始化完成');
  }

  // 初始化语言管理器
  async initLanguageManager() {
    try {
      // 从存储中获取用户设置的语言
      const result = await chrome.storage.sync.get(['language']);
      const language = result.language || 'zh-CN';
      
      // 加载语言文件
      const response = await fetch(chrome.runtime.getURL(`lang/${language}.json`));
      if (response.ok) {
        this.translations = await response.json();
        this.currentLanguage = language;
        console.log('语言加载成功:', language);
      } else {
        console.error('语言文件加载失败:', language);
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

  startElementSelection() {
    if (this.isSelecting) return;
    
    this.isSelecting = true;
    this.createHighlightBox();
    
    // 添加事件监听器
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('click', this.boundHandleClick);
    document.addEventListener('keydown', this.boundHandleKeyDown);
    document.addEventListener('wheel', this.boundHandleWheel, { passive: false });
    
    // 显示提示信息
    this.showToast(this.t('messages.selectElement'));
  }

  stopElementSelection() {
    if (!this.isSelecting) return;
    
    this.isSelecting = false;
    this.removeHighlightBox();
    
    // 移除事件监听器
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('click', this.boundHandleClick);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('wheel', this.boundHandleWheel, { passive: false });
    
    // 清理状态
    this.currentElement = null;
    this.elementStack = [];
    this.currentStackIndex = 0;
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    
    // 确保悬浮高亮也被清理
    if (this.hoverHighlightBox) {
      this.hoverHighlightBox.style.display = 'none';
    }
  }



  createHighlightBox() {
    this.highlightBox = document.createElement('div');
    this.highlightBox.className = 'element-capture-highlight';
    this.highlightBox.style.cssText = `
      position: absolute;
      border: 3px solid #ff4444;
      background: rgba(255, 68, 68, 0.15);
      z-index: 1000000;
      pointer-events: none;
      display: none;
      box-shadow: 0 0 20px rgba(255, 68, 68, 0.8), inset 0 0 20px rgba(255, 68, 68, 0.2);
      border-radius: 4px;
      transition: all 0.15s ease-out;
      animation: pulse 1.5s infinite;
    `;
    
    // 创建悬浮高亮层
    this.hoverHighlightBox = document.createElement('div');
    this.hoverHighlightBox.className = 'element-capture-hover-highlight';
    this.hoverHighlightBox.style.cssText = `
      position: absolute;
      border: 2px solid #00ff88;
      background: rgba(0, 255, 136, 0.08);
      z-index: 999999;
      pointer-events: none;
      display: none;
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 20px rgba(0, 255, 136, 0.05);
      border-radius: 4px;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      animation: hoverPulse 2.5s infinite;
      opacity: 0.8;
      transform: scale(1);
    `;
    
    // 添加动画样式
    if (!document.querySelector('#element-capture-styles')) {
      const style = document.createElement('style');
      style.id = 'element-capture-styles';
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 0 20px rgba(255, 68, 68, 0.8), inset 0 0 20px rgba(255, 68, 68, 0.2); }
          50% { box-shadow: 0 0 30px rgba(255, 68, 68, 1), inset 0 0 30px rgba(255, 68, 68, 0.3); }
          100% { box-shadow: 0 0 20px rgba(255, 68, 68, 0.8), inset 0 0 20px rgba(255, 68, 68, 0.2); }
        }
        @keyframes hoverPulse {
          0% { 
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 20px rgba(0, 255, 136, 0.05);
            opacity: 0.8;
          }
          50% { 
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.6), inset 0 0 30px rgba(0, 255, 136, 0.1);
            opacity: 1;
          }
          100% { 
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 20px rgba(0, 255, 136, 0.05);
            opacity: 0.8;
          }
        }
        .element-capture-hover-highlight {
          opacity: 0.8;
        }
        .element-capture-hover-highlight:hover {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(this.highlightBox);
    document.body.appendChild(this.hoverHighlightBox);
  }

  removeHighlightBox() {
    if (this.highlightBox) {
      this.highlightBox.remove();
      this.highlightBox = null;
    }
    
    if (this.hoverHighlightBox) {
      this.hoverHighlightBox.remove();
      this.hoverHighlightBox = null;
    }
    
    // 清理元素信息框
    const existingInfo = document.querySelector('.element-capture-info');
    if (existingInfo) {
      existingInfo.remove();
    }
    
    // 清理样式
    const styles = document.querySelector('#element-capture-styles');
    if (styles) {
      styles.remove();
    }
  }

  handleMouseMove(event) {
    if (!this.isSelecting) return;
    
    // 清除之前的超时
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    
    // 立即显示悬浮高亮效果
    this.showHoverHighlight(event.clientX, event.clientY);
    
    // 设置短暂延迟以避免频繁更新
    this.hoverTimeout = setTimeout(() => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!element || element === this.highlightBox || element === this.hoverHighlightBox) return;
      
      // 构建元素层级堆栈
      this.buildElementStack(element, event.clientX, event.clientY);
      
      // 选择当前层级的元素
      if (this.elementStack.length > 0) {
        this.currentElement = this.elementStack[this.currentStackIndex];
        this.highlightElement(this.currentElement);
        
        // 显示层级信息
        this.showElementInfo(this.currentElement, this.currentStackIndex + 1, this.elementStack.length);
      }
    }, 50); // 50ms延迟，平衡响应性和性能
  }
  
  // 显示悬浮高亮效果
  showHoverHighlight(x, y) {
    if (!this.hoverHighlightBox) return;
    
    const element = document.elementFromPoint(x, y);
    if (!element || element === this.highlightBox || element === this.hoverHighlightBox) {
      this.hoverHighlightBox.style.display = 'none';
      return;
    }
    
    // 过滤掉不需要高亮的元素
    if (this.shouldSkipElement(element)) {
      this.hoverHighlightBox.style.display = 'none';
      return;
    }
    
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // 检查元素是否足够大（避免高亮过小的元素）
    if (rect.width >= 10 && rect.height >= 10) {
      this.hoverHighlightBox.style.display = 'block';
      this.hoverHighlightBox.style.left = (rect.left + scrollX) + 'px';
      this.hoverHighlightBox.style.top = (rect.top + scrollY) + 'px';
      this.hoverHighlightBox.style.width = rect.width + 'px';
      this.hoverHighlightBox.style.height = rect.height + 'px';
    } else {
      this.hoverHighlightBox.style.display = 'none';
    }
  }
  
  // 判断是否应该跳过某个元素
  shouldSkipElement(element) {
    // 跳过插件自己的元素
    if (element.classList.contains('element-capture-highlight') || 
        element.classList.contains('element-capture-hover-highlight') ||
        element.classList.contains('element-capture-info') ||
        element.classList.contains('element-capture-toast')) {
      return true;
    }
    
    // 跳过不可见的元素
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return true;
    }
    
    // 跳过过小的元素
    const rect = element.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) {
      return true;
    }
    
    return false;
  }
  
  // 构建元素层级堆栈
  buildElementStack(element, x, y) {
    this.elementStack = [];
    let current = element;
    
    // 向上遍历DOM树，构建元素堆栈
    while (current && current !== document.body && current !== document.documentElement) {
      // 过滤掉太小的元素（小于20x20像素）
      const rect = current.getBoundingClientRect();
      if (rect.width >= 20 && rect.height >= 20) {
        // 检查元素是否包含鼠标位置
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          this.elementStack.push(current);
        }
      }
      current = current.parentElement;
    }
    
    // 如果堆栈为空，至少添加原始元素
    if (this.elementStack.length === 0 && element) {
      this.elementStack.push(element);
    }
    
    // 重置堆栈索引为最小元素（最精确的选择）
    this.currentStackIndex = 0;
  }

  // 处理滚轮事件，用于切换元素层级
  handleWheel(event) {
    if (!this.isSelecting || this.elementStack.length <= 1) return;
    
    event.preventDefault();
    
    if (event.deltaY > 0) {
      // 向下滚动，选择更大的父元素
      this.currentStackIndex = Math.min(this.currentStackIndex + 1, this.elementStack.length - 1);
    } else {
      // 向上滚动，选择更小的子元素
      this.currentStackIndex = Math.max(this.currentStackIndex - 1, 0);
    }
    
    this.currentElement = this.elementStack[this.currentStackIndex];
    this.highlightElement(this.currentElement);
    this.showElementInfo(this.currentElement, this.currentStackIndex + 1, this.elementStack.length);
  }
  
  highlightElement(element) {
    if (!this.highlightBox) return;
    
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    this.highlightBox.style.display = 'block';
    this.highlightBox.style.left = (rect.left + scrollX) + 'px';
    this.highlightBox.style.top = (rect.top + scrollY) + 'px';
    this.highlightBox.style.width = rect.width + 'px';
    this.highlightBox.style.height = rect.height + 'px';
    
    // 隐藏悬浮高亮，避免重叠
    if (this.hoverHighlightBox) {
      this.hoverHighlightBox.style.display = 'none';
    }
  }
  
  // 显示元素信息
  showElementInfo(element, currentLevel, totalLevels) {
    // 移除现有的信息框
    const existingInfo = document.querySelector('.element-capture-info');
    if (existingInfo) {
      existingInfo.remove();
    }
    
    const info = document.createElement('div');
    info.className = 'element-capture-info';
    
    // 获取元素描述
    const tagName = element.tagName.toLowerCase();
    const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const id = element.id ? `#${element.id}` : '';
    const elementDesc = `${tagName}${id}${className}`;
    
    const rect = element.getBoundingClientRect();
    info.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${this.t('messages.elementInfo', { elementDesc })}</div>
      <div style="font-size: 12px; opacity: 0.8;">${this.t('messages.levelInfo', { current: currentLevel, total: totalLevels })}</div>
      <div style="font-size: 11px; opacity: 0.6; margin-top: 2px;">${this.t('messages.sizeInfo', { width: Math.round(rect.width), height: Math.round(rect.height) })}</div>
      <div style="font-size: 10px; opacity: 0.5; margin-top: 3px; color: #00ff88;">${this.t('messages.hoverTip')}</div>
    `;
    
    info.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 1000002;
      font-size: 13px;
      font-family: 'Segoe UI', Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 68, 68, 0.5);
      max-width: 250px;
      word-break: break-all;
    `;
    
    document.body.appendChild(info);
    
    // 2秒后自动移除
    setTimeout(() => {
      if (info.parentNode) {
        info.remove();
      }
    }, 2000);
  }

  handleClick(event) {
    if (!this.isSelecting || !this.currentElement) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    this.captureElement(this.currentElement);
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.stopElementSelection();
      this.showToast(this.t('messages.cancelled'));
    }
  }

  async captureElement(element) {
    try {
      const modeNames = {
        'native': this.t('modes.native'),
        'html2canvas': this.t('modes.html2canvas'),
        'snapdom': this.t('modes.snapdom')
      };
      this.showToast(this.t('messages.capturingWithMode', { mode: modeNames[this.captureMode] || '未知模式' }));
      
      // 获取元素信息
      const elementInfo = {
        tagName: element.tagName,
        className: element.className,
        id: element.id
      };
      
      // 确保元素完全可见
      await this.ensureElementVisible(element);
      
      if (this.captureMode === 'native') {
        await this.captureWithNativeAPI(element, elementInfo);
      } else if (this.captureMode === 'snapdom') {
        await this.captureWithSnapDOM(element, elementInfo);
      } else {
        await this.captureWithHtml2Canvas(element, elementInfo);
      }
      
      this.stopElementSelection();
    } catch (error) {
      console.error('截图失败:', error);
      this.showToast(this.t('messages.error', { error: error.message }));
      this.stopElementSelection();
    }
  }
  
  // 确保元素完全可见
  async ensureElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // 检查元素是否在视口中
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewportHeight &&
      rect.right <= viewportWidth
    );
    
    if (!isVisible) {
      // 滚动到元素位置，并添加一些边距
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
      
      // 等待滚动完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 如果元素仍然不完全可见，尝试调整页面缩放
      const newRect = element.getBoundingClientRect();
      if (newRect.width > viewportWidth || newRect.height > viewportHeight) {
        this.showToast(this.t('messages.elementTooLarge'));
      }
    }
  }
  
  // 使用Chrome原生API截图
  async captureWithNativeAPI(element, elementInfo) {
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // 使用与HTML2Canvas相同的尺寸计算方式，但为原生API添加边界以捕获立体效果
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;
    const edgeMargin = 2; // 为立体渲染、阴影等效果添加边界
    
    // 计算元素在视口中的位置，添加边界以捕获特殊效果
    const captureData = {
      x: rect.left + scrollX - edgeMargin,
      y: rect.top + scrollY - edgeMargin,
      width: elementWidth + (edgeMargin * 2),
      height: elementHeight + (edgeMargin * 2),
      viewportX: rect.left - edgeMargin,
      viewportY: rect.top - edgeMargin,
      devicePixelRatio: window.devicePixelRatio || 1, // 使用原始分辨率
      elementInfo: elementInfo,
      includeGlow: true // 包含立体效果和阴影
    };
    
    // 添加详细的调试信息
    console.log('原生截图参数计算:', {
      element: element.tagName,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      scroll: { x: scrollX, y: scrollY },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      elementSize: { offsetWidth: elementWidth, offsetHeight: elementHeight },
      captureData: captureData
    });
    
    // 发送到background script进行截图和裁剪
    try {
      chrome.runtime.sendMessage({
        action: 'captureElement',
        data: captureData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('消息发送失败:', chrome.runtime.lastError);
          this.showToast(this.t('messages.connectionFailed', { error: chrome.runtime.lastError.message }));
          return;
        }
        
        if (response && response.success) {
          this.showToast(this.t('messages.success', { filename: response.filename }));
        } else {
          console.error('原生截图失败:', response);
          this.showToast(this.t('messages.fallbackToCompatible'));
          // 自动切换到html2canvas模式重试
          setTimeout(() => {
            this.captureWithHtml2Canvas(element, elementInfo);
          }, 1000);
        }
      });
    } catch (error) {
      console.error('发送消息异常:', error);
      this.showToast(this.t('messages.sendMessageFailed', { error: error.message }));
    }
  }
  
  // 使用snapDOM截图
  async captureWithSnapDOM(element, elementInfo) {
    try {
      // 检查snapdom是否可用
      if (typeof snapdom === 'undefined') {
        this.showToast(this.t('messages.snapdomFailed'));
        return;
      }
      
      this.showToast(this.t('messages.capturing'));
      
      console.log('开始SnapDOM截图，元素:', element);
      console.log('SnapDOM可用方法:', Object.keys(snapdom));
      
      // 使用SnapDOM API，根据源码分析使用正确的参数
      const result = await snapdom(element, {
        scale: Math.max(window.devicePixelRatio || 1, 2),
        backgroundColor: '#ffffff',
        quality: 1.0,
        fast: false, // 关闭快速模式以确保更好的渲染质量
        embedFonts: true, // 嵌入字体以确保文本渲染一致
        dpr: window.devicePixelRatio || 1, // 使用设备像素比
        cache: 'disabled' // 禁用缓存确保每次都是最新渲染
      });
      
      console.log('SnapDOM结果对象:', result);
      console.log('结果对象方法:', Object.keys(result));
      
      // 使用toPng()方法获取HTMLImageElement
      const imgElement = await result.toPng();
      
      console.log('获取到的图片元素:', imgElement);
      console.log('图片尺寸:', imgElement.width, 'x', imgElement.height);
      console.log('自然尺寸:', imgElement.naturalWidth, 'x', imgElement.naturalHeight);
      
      // 将图片元素转换为DataURL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 设置canvas尺寸
      const width = imgElement.naturalWidth || imgElement.width;
      const height = imgElement.naturalHeight || imgElement.height;
      
      if (width <= 0 || height <= 0) {
        throw new Error(`无效的图片尺寸: ${width}x${height}`);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 绘制图片到canvas
      ctx.drawImage(imgElement, 0, 0, width, height);
      
      // 转换为DataURL
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      console.log('生成的DataURL长度:', dataUrl.length);
      
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('生成的DataURL无效');
      }
      
      // 发送到background script进行下载
      chrome.runtime.sendMessage({
        action: 'downloadImage',
        data: {
          dataUrl: dataUrl,
          elementInfo: elementInfo
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('下载消息发送失败:', chrome.runtime.lastError);
          this.showToast(this.t('messages.connectionFailed', { error: chrome.runtime.lastError.message }));
          return;
        }
        
        if (response && response.success) {
          this.showToast(this.t('messages.success', { filename: response.filename }));
        } else {
          console.error('下载响应错误:', response);
          this.showToast(this.t('messages.downloadFailed', { error: response?.error || '未知错误' }));
        }
      });
      
    } catch (error) {
      console.error('SnapDOM截图失败:', error);
      this.showToast(this.t('messages.error', { error: error.message }));
      
      // 如果SnapDOM失败，自动回退到HTML2Canvas
      console.log('SnapDOM失败，自动切换到HTML2Canvas模式');
      this.showToast(this.t('messages.fallbackToHtml2Canvas'));
      
      try {
        await this.captureWithHtml2Canvas(element, elementInfo);
      } catch (fallbackError) {
        console.error('HTML2Canvas回退也失败:', fallbackError);
        this.showToast(this.t('messages.error', { error: fallbackError.message }));
      }
    }
  }

  // 使用html2canvas截图
  async captureWithHtml2Canvas(element, elementInfo) {
    try {
      // 检查html2canvas是否可用
      if (typeof html2canvas === 'undefined') {
        this.showToast(this.t('messages.html2canvasFailed'));
        return;
      }
      
      // 使用html2canvas截取元素，提高分辨率
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: Math.max(window.devicePixelRatio || 1, 2), // 平衡分辨率和兼容性
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 8000, // 增加超时时间
        width: element.offsetWidth,
        height: element.offsetHeight,
        onclone: (clonedDoc, element) => {
          // 最小化处理
          const clonedElement = clonedDoc.querySelector(`[data-capture-target="true"]`);
          if (clonedElement) {
            clonedElement.removeAttribute('data-capture-target');
          }
        }
      });
      
      // 转换为blob并下载
      canvas.toBlob(async (blob) => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result;
            
            try {
              chrome.runtime.sendMessage({
                action: 'downloadImage',
                data: {
                  dataUrl: dataUrl,
                  elementInfo: elementInfo
                }
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('下载消息发送失败:', chrome.runtime.lastError);
                  this.showToast(this.t('messages.connectionFailed', { error: chrome.runtime.lastError.message }));
                  return;
                }
                
                if (response && response.success) {
                  this.showToast(this.t('messages.success', { filename: response.filename }));
                } else {
                  console.error('下载响应错误:', response);
                  this.showToast(this.t('messages.downloadFailed', { error: response?.error || '未知错误' }));
                }
              });
            } catch (error) {
              console.error('发送下载消息异常:', error);
              this.showToast(this.t('messages.sendMessageFailed', { error: error.message }));
            }
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('处理截图失败:', error);
          this.showToast(this.t('messages.processingFailed'));
        }
      }, 'image/png', 1.0);
      
    } catch (error) {
      console.error('HTML2Canvas截图失败:', error);
      this.showToast(this.t('messages.error', { error: error.message }));
    }
  }

  showToast(message) {
    // 移除现有的toast
    const existingToast = document.querySelector('.element-capture-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'element-capture-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1000001;
      font-size: 14px;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
      if (style.parentNode) {
        style.remove();
      }
    }, 3000);
  }
}

// 初始化元素捕获功能
const elementCapture = new ElementCapture();

} // 结束防止重复初始化的检查