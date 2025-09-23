// 元素截图插件 - 弹出页面脚本
class PopupController {
  constructor() {
    this.isCapturing = false;
    this.languageManager = null;
    this.init();
  }

  async init() {
    // 等待语言管理器初始化
    await this.initLanguageManager();
    
    // 获取DOM元素
    this.startCaptureBtn = document.getElementById('startCapture');
    this.statusElement = document.getElementById('status');
    this.modeRadios = document.querySelectorAll('input[name="captureMode"]');
    this.defaultModeRadios = document.querySelectorAll('input[name="defaultCaptureMode"]');
    this.currentModeSpan = document.getElementById('currentMode');
    this.languageSelect = document.getElementById('languageSelect');
    
    // 绑定事件
    this.startCaptureBtn.addEventListener('click', this.handleStartCapture.bind(this));
    this.modeRadios.forEach(radio => {
      radio.addEventListener('change', this.handleModeChange.bind(this));
    });
    this.defaultModeRadios.forEach(radio => {
      radio.addEventListener('change', this.handleDefaultModeChange.bind(this));
    });
    
    // 语言切换事件
    if (this.languageSelect) {
      this.languageSelect.addEventListener('change', this.handleLanguageChange.bind(this));
    }
    
    // 为模式卡片添加点击事件
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
        }
      });
    });
    
    // 加载配置
    await this.loadConfig();
    
    // 应用翻译
    this.applyTranslations();
    
    // 检查当前标签页状态
    this.checkCurrentTabStatus();
  }

  // 初始化语言管理器
  async initLanguageManager() {
    // 等待语言管理器加载
    let attempts = 0;
    while (!window.languageManager && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.languageManager) {
      this.languageManager = window.languageManager;
      
      // 等待语言管理器完全初始化
      while (!this.languageManager.initialized && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      if (this.languageManager.initialized) {
        console.log('语言管理器初始化成功');
      } else {
        console.error('语言管理器初始化超时');
      }
    } else {
      console.error('语言管理器初始化失败');
    }
  }

  // 处理语言切换
  async handleLanguageChange(event) {
    const selectedLanguage = event.target.value;
    console.log('语言切换为:', selectedLanguage);
    
    if (this.languageManager) {
      const success = await this.languageManager.setLanguage(selectedLanguage);
      if (success) {
        this.applyTranslations();
        
        // 通知background script更新右键菜单
        try {
          await chrome.runtime.sendMessage({
            action: 'updateContextMenus',
            language: selectedLanguage
          });
          console.log('右键菜单更新成功');
        } catch (error) {
          console.error('更新右键菜单失败:', error);
        }
        
        console.log('语言切换成功');
      } else {
        console.error('语言切换失败');
        // 恢复原来的选择
        event.target.value = this.languageManager.getCurrentLanguage();
      }
    }
  }

  // 应用翻译
  applyTranslations() {
    if (!this.languageManager) return;
    
    // 翻译所有带有data-i18n属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const text = this.languageManager.t(key);
      if (text && text !== key) {
        element.textContent = text;
      }
    });
    
    // 特殊处理列表项
    const instructionSteps = document.getElementById('instructionSteps');
    if (instructionSteps) {
      const steps = this.languageManager.t('instructions.steps');
      if (Array.isArray(steps)) {
        instructionSteps.innerHTML = steps.map(step => `<li>${step}</li>`).join('');
      }
    }
    
    // 特殊处理模式说明
    const modeDetails = document.getElementById('modeDetails');
    if (modeDetails) {
      const details = this.languageManager.t('instructions.modeDetails');
      if (Array.isArray(details)) {
        modeDetails.innerHTML = details.map(detail => `• ${detail}<br>`).join('');
      }
    }
    
    // 更新语言选择器
    if (this.languageSelect) {
      this.languageSelect.value = this.languageManager.getCurrentLanguage();
    }
    
    // 更新当前模式显示
    this.updateCurrentModeDisplay();
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
    if (!this.languageManager) return;
    
    const modeNames = {
      'native': this.languageManager.t('modes.native'),
      'html2canvas': this.languageManager.t('modes.html2canvas'),
      'snapdom': this.languageManager.t('modes.snapdom')
    };
    
    if (this.currentModeSpan) {
      this.currentModeSpan.textContent = modeNames[mode] || mode;
    }
    
    // 更新模式卡片的选中状态
    document.querySelectorAll('.mode-card').forEach(card => {
      card.classList.remove('selected');
      if (card.dataset.mode === mode) {
        card.classList.add('selected');
      }
    });
  }

  async checkCurrentTabStatus() {
    // 设置页面模式，隐藏开始截图按钮
    if (this.startCaptureBtn) {
      this.startCaptureBtn.style.display = 'none';
    }
    console.log('设置页面模式，隐藏开始截图按钮');
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
    if (!this.languageManager) return;
    
    const startText = this.languageManager.t('ui.startCapture');
    const stopText = this.languageManager.t('ui.stopCapture');
    
    if (this.isCapturing) {
      this.startCaptureBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 6H18V18H6V6Z" fill="currentColor"/>
        </svg>
        <span>${stopText}</span>
      `;
      this.startCaptureBtn.classList.add('capturing');
    } else {
      this.startCaptureBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
        </svg>
        <span>${startText}</span>
      `;
      this.startCaptureBtn.classList.remove('capturing');
    }
  }

  updateStatus(message, type = 'ready') {
    // 设置页面模式，不需要状态显示
    console.log('状态更新:', message, type);
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