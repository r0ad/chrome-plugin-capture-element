// 元素截图插件 - 弹出页面脚本
class PopupController {
  constructor() {
    this.isCapturing = false;
    this.init();
  }

  init() {
    // 获取DOM元素
    this.startCaptureBtn = document.getElementById('startCapture');
    this.statusElement = document.getElementById('status');
    this.modeRadios = document.querySelectorAll('input[name="captureMode"]');
    this.defaultModeRadios = document.querySelectorAll('input[name="defaultCaptureMode"]');
    this.currentModeSpan = document.getElementById('currentMode');
    
    // 绑定事件
    this.startCaptureBtn.addEventListener('click', this.handleStartCapture.bind(this));
    this.modeRadios.forEach(radio => {
      radio.addEventListener('change', this.handleModeChange.bind(this));
    });
    this.defaultModeRadios.forEach(radio => {
      radio.addEventListener('change', this.handleDefaultModeChange.bind(this));
    });
    
    // 加载配置
    this.loadConfig();
    
    // 检查当前标签页状态
    this.checkCurrentTabStatus();
  }
  
  handleModeChange(event) {
    const selectedMode = event.target.value;
    console.log('截图模式切换为:', selectedMode);
    
    // 发送模式切换消息到content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'setCaptureMode',
          mode: selectedMode
        }).catch(() => {
          // 如果content script未加载，忽略错误
          console.log('Content script未加载，模式将在启动时设置');
        });
      }
    });
  }
  
  getSelectedMode() {
    const selectedRadio = document.querySelector('input[name="captureMode"]:checked');
    return selectedRadio ? selectedRadio.value : 'snapdom';
  }

  // 加载配置
  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get(['defaultCaptureMode']);
      const defaultMode = result.defaultCaptureMode || 'snapdom';
      
      // 设置默认模式选择
      const defaultRadio = document.querySelector(`input[name="defaultCaptureMode"][value="${defaultMode}"]`);
      if (defaultRadio) {
        defaultRadio.checked = true;
      }
      
      // 更新显示
      this.updateCurrentModeDisplay(defaultMode);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  // 处理默认模式变更
  async handleDefaultModeChange(event) {
    const selectedMode = event.target.value;
    console.log('默认截图模式切换为:', selectedMode);
    
    try {
      // 保存配置
      await chrome.storage.sync.set({ defaultCaptureMode: selectedMode });
      
      // 更新显示
      this.updateCurrentModeDisplay(selectedMode);
      
      console.log('默认模式配置已保存');
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }

  // 更新当前模式显示
  updateCurrentModeDisplay(mode) {
    const modeNames = {
      'native': '原生模式',
      'html2canvas': 'HTML2Canvas',
      'snapdom': 'SnapDOM'
    };
    
    if (this.currentModeSpan) {
      this.currentModeSpan.textContent = modeNames[mode] || mode;
    }
  }

  async checkCurrentTabStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.updateStatus('无法获取当前标签页', 'error');
        this.startCaptureBtn.disabled = true;
        return;
      }
      
      // 检查是否是特殊页面（chrome://、chrome-extension://等）
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:')) {
        this.updateStatus('此页面不支持截图功能', 'error');
        this.startCaptureBtn.disabled = true;
        return;
      }
      
      this.updateStatus('准备就绪', 'ready');
      this.startCaptureBtn.disabled = false;
    } catch (error) {
      console.error('检查标签页状态失败:', error);
      this.updateStatus('检查页面状态失败', 'error');
      this.startCaptureBtn.disabled = true;
    }
  }

  async handleStartCapture() {
    if (this.isCapturing) {
      await this.stopCapture();
    } else {
      await this.startCapture();
    }
  }

  async startCapture() {
    try {
      this.updateStatus('正在启动截图模式...', 'loading');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('无法获取当前标签页');
      }
      
      // 检查是否是特殊页面
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:')) {
        throw new Error('此页面不支持截图功能');
      }
      
      // 获取选中的截图模式
      const selectedMode = this.getSelectedMode();
      
      // 先尝试注入content script（如果未加载）
      try {
        await this.injectContentScript();
        // 等待一下让content script完全加载
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (injectError) {
        console.log('Content script可能已存在，继续尝试发送消息');
      }
      
      // 发送消息到content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'startCapture',
        mode: selectedMode
      });
      
      if (response && response.success) {
        this.isCapturing = true;
        this.updateCaptureButton();
        this.updateStatus('请在页面上选择要截图的元素', 'capturing');
        
        // 关闭popup让用户操作页面
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        throw new Error('启动截图模式失败');
      }
    } catch (error) {
      console.error('启动截图失败:', error);
      
      // 如果content script未加载，尝试注入
      if (error.message.includes('Could not establish connection') || 
          error.message.includes('Receiving end does not exist')) {
        try {
          await this.injectContentScript();
          // 重新尝试启动
          setTimeout(() => this.startCapture(), 500);
          return;
        } catch (injectError) {
          console.error('注入content script失败:', injectError);
        }
      }
      
      this.updateStatus('启动失败，请刷新页面后重试', 'error');
      this.isCapturing = false;
      this.updateCaptureButton();
    }
  }

  async stopCapture() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, { action: 'stopCapture' });
      }
      
      this.isCapturing = false;
      this.updateCaptureButton();
      this.updateStatus('已停止截图模式', 'ready');
    } catch (error) {
      console.error('停止截图失败:', error);
      this.isCapturing = false;
      this.updateCaptureButton();
      this.updateStatus('准备就绪', 'ready');
    }
  }

  async injectContentScript() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('无法获取当前标签页');
    }
    
    try {
      // 注入所有必要的JS文件
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['libs/html2canvas.min.js', 'libs/snapdom.min.js', 'content.js']
      });
      
      // 注入CSS
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      });
      
      this.updateStatus('已注入截图功能，正在启动...', 'loading');
    } catch (error) {
      console.error('注入脚本失败:', error);
      throw new Error(`注入失败: ${error.message}`);
    }
  }

  updateCaptureButton() {
    if (this.isCapturing) {
      this.startCaptureBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 6H18V18H6V6Z" fill="currentColor"/>
        </svg>
        停止截图
      `;
      this.startCaptureBtn.classList.add('capturing');
    } else {
      this.startCaptureBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
        </svg>
        开始截图
      `;
      this.startCaptureBtn.classList.remove('capturing');
    }
  }

  updateStatus(message, type = 'ready') {
    // const statusText = this.statusElement.querySelector('.status-text');
    // statusText.textContent = message;
    
    // // 移除所有状态类
    // this.statusElement.classList.remove('ready', 'loading', 'capturing', 'error', 'success');
    
    // // 添加新的状态类
    // this.statusElement.classList.add(type);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
  
  // 说明内容展开/收起功能
  const instructionsToggle = document.getElementById('instructionsToggle');
  const instructionsContainer = document.querySelector('.instructions');
  
  if (instructionsToggle && instructionsContainer) {
    instructionsToggle.addEventListener('click', function() {
      instructionsContainer.classList.toggle('expanded');
    });
  }
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureComplete') {
    const popup = document.querySelector('.popup-container');
    if (popup) {
      const controller = popup.popupController;
      if (controller) {
        if (request.success) {
          controller.updateStatus('截图已保存！', 'success');
        } else {
          controller.updateStatus('截图失败，请重试', 'error');
        }
        controller.isCapturing = false;
        controller.updateCaptureButton();
      }
    }
  }
});