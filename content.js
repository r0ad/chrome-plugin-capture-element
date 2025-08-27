// 元素截图插件 - 内容脚本
class ElementCapture {
  constructor() {
    this.isSelecting = false;
    this.highlightBox = null;
    this.currentElement = null;
    this.hoverTimeout = null;
    this.elementStack = [];
    this.currentStackIndex = 0;
    this.captureMode = 'native'; // 默认使用原生截图模式，可选 'native' 或 'html2canvas'
    
    // 绑定事件处理函数以确保正确的this上下文和函数引用
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    
    this.init();
  }

  init() {
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.mode) {
        this.captureMode = request.mode;
      }
      
      if (request.action === 'startCapture') {
        this.startElementSelection();
        sendResponse({ success: true });
      } else if (request.action === 'stopCapture') {
        this.stopElementSelection();
        sendResponse({ success: true });
      } else if (request.action === 'setCaptureMode') {
        this.captureMode = request.mode || 'native';
        sendResponse({ success: true, mode: this.captureMode });
      }
    });
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
    this.showToast('🎯 悬停选择元素，滚轮切换层级，点击截图，ESC取消');
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
    
    // 添加脉冲动画样式
    if (!document.querySelector('#element-capture-styles')) {
      const style = document.createElement('style');
      style.id = 'element-capture-styles';
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 0 20px rgba(255, 68, 68, 0.8), inset 0 0 20px rgba(255, 68, 68, 0.2); }
          50% { box-shadow: 0 0 30px rgba(255, 68, 68, 1), inset 0 0 30px rgba(255, 68, 68, 0.3); }
          100% { box-shadow: 0 0 20px rgba(255, 68, 68, 0.8), inset 0 0 20px rgba(255, 68, 68, 0.2); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(this.highlightBox);
  }

  removeHighlightBox() {
    if (this.highlightBox) {
      this.highlightBox.remove();
      this.highlightBox = null;
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
    
    // 设置短暂延迟以避免频繁更新
    this.hoverTimeout = setTimeout(() => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!element || element === this.highlightBox) return;
      
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
    
    info.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">📍 ${elementDesc}</div>
      <div style="font-size: 12px; opacity: 0.8;">层级: ${currentLevel}/${totalLevels} | 滚轮切换</div>
      <div style="font-size: 11px; opacity: 0.6; margin-top: 2px;">${Math.round(element.getBoundingClientRect().width)}×${Math.round(element.getBoundingClientRect().height)}px</div>
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
      this.showToast('已取消元素选择');
    }
  }

  async captureElement(element) {
    try {
      this.showToast(`📸 正在截图元素... (${this.captureMode === 'native' ? '原生模式' : 'HTML2Canvas模式'})`);
      
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
      } else {
        await this.captureWithHtml2Canvas(element, elementInfo);
      }
      
      this.stopElementSelection();
    } catch (error) {
      console.error('截图失败:', error);
      this.showToast(`❌ 截图失败: ${error.message}`);
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
        this.showToast('⚠️ 元素过大，可能截图不完整');
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
          this.showToast(`❌ 连接失败: ${chrome.runtime.lastError.message}`);
          return;
        }
        
        if (response && response.success) {
          this.showToast(`✅ 截图已保存: ${response.filename}`);
        } else {
          console.error('原生截图失败:', response);
          this.showToast(`🔄 原生模式失败，自动切换到兼容模式...`);
          // 自动切换到html2canvas模式重试
          setTimeout(() => {
            this.captureWithHtml2Canvas(element, elementInfo);
          }, 1000);
        }
      });
    } catch (error) {
      console.error('发送消息异常:', error);
      this.showToast(`❌ 发送消息失败: ${error.message}`);
    }
  }
  
  // 使用html2canvas截图
  async captureWithHtml2Canvas(element, elementInfo) {
    try {
      // 检查html2canvas是否可用
      if (typeof html2canvas === 'undefined') {
        this.showToast('❌ HTML2Canvas库未加载');
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
                  this.showToast(`❌ 连接失败: ${chrome.runtime.lastError.message}`);
                  return;
                }
                
                if (response && response.success) {
                  this.showToast(`✅ 截图已保存: ${response.filename}`);
                } else {
                  console.error('下载响应错误:', response);
                  this.showToast(`❌ 下载失败: ${response?.error || '未知错误'}`);
                }
              });
            } catch (error) {
              console.error('发送下载消息异常:', error);
              this.showToast(`❌ 发送消息失败: ${error.message}`);
            }
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('处理截图失败:', error);
          this.showToast('❌ 处理截图失败');
        }
      }, 'image/png', 1.0);
      
    } catch (error) {
      console.error('HTML2Canvas截图失败:', error);
      this.showToast(`❌ HTML2Canvas截图失败: ${error.message}`);
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