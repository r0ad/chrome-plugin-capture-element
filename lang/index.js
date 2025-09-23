// 语言管理模块
class LanguageManager {
  constructor() {
    this.currentLanguage = 'zh-CN';
    this.translations = {};
    this.initialized = false;
    this.init();
  }

  async init() {
    // 从存储中获取用户设置的语言
    try {
      const result = await chrome.storage.sync.get(['language']);
      this.currentLanguage = result.language || 'zh-CN';
    } catch (error) {
      console.log('使用默认语言:', this.currentLanguage);
    }
    
    // 加载当前语言的翻译
    const success = await this.loadLanguage(this.currentLanguage);
    this.initialized = success;
    
    if (success) {
      console.log('语言管理器初始化完成');
    } else {
      console.error('语言管理器初始化失败');
    }
  }

  async loadLanguage(langCode) {
    try {
      const response = await fetch(chrome.runtime.getURL(`lang/${langCode}.json`));
      if (response.ok) {
        this.translations = await response.json();
        this.currentLanguage = langCode;
        console.log('语言加载成功:', langCode);
        return true;
      } else {
        console.error('语言文件加载失败:', langCode);
        return false;
      }
    } catch (error) {
      console.error('加载语言文件时出错:', error);
      return false;
    }
  }

  async setLanguage(langCode) {
    const success = await this.loadLanguage(langCode);
    if (success) {
      // 保存语言设置
      try {
        await chrome.storage.sync.set({ language: langCode });
        console.log('语言设置已保存:', langCode);
      } catch (error) {
        console.error('保存语言设置失败:', error);
      }
    }
    return success;
  }

  // 获取翻译文本
  t(key, params = {}) {
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
    } else if (Array.isArray(value)) {
      return value;
    }
    
    return value || key;
  }

  // 获取当前语言
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // 获取支持的语言列表
  getSupportedLanguages() {
    return [
      { code: 'zh-CN', name: '中文' },
      { code: 'en-US', name: 'English' },
      { code: 'ja-JP', name: '日本語' },
      { code: 'ko-KR', name: '한국어' },
      { code: 'es-ES', name: 'Español' },
      { code: 'fr-FR', name: 'Français' },
      { code: 'de-DE', name: 'Deutsch' },
      { code: 'ru-RU', name: 'Русский' },
      { code: 'pt-BR', name: 'Português' },
      { code: 'it-IT', name: 'Italiano' }
    ];
  }
}

// 创建全局语言管理器实例
window.languageManager = new LanguageManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LanguageManager;
}
