/**
 * 标题编号切换插件核心功能模块
 */

import type { 
  HeadingNumberToggleState, 
  HeadingNumberToggleAPI, 
  HeadingNumberTogglePlugin 
} from '../../types';
import { 
  HEADING_NUMBER_TOGGLE_CONFIG, 
  DEFAULT_HEADING_NUMBER_STATE 
} from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

/**
 * 标题编号切换插件类
 */
export class HeadingNumberTogglePluginImpl implements HeadingNumberTogglePlugin {
  private state: HeadingNumberToggleState;
  private config = HEADING_NUMBER_TOGGLE_CONFIG;
  private buttonManager: ToolbarButtonManager | null = null;
  private persistenceManager: PersistenceManager | null = null;

  constructor(buttonManager?: ToolbarButtonManager, pluginName?: string) {
    this.state = { ...DEFAULT_HEADING_NUMBER_STATE };
    this.buttonManager = buttonManager || null;
    this.persistenceManager = pluginName ? createPersistenceManager(pluginName) : null;
  }

  /**
   * 初始化插件
   */
  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    await this.initState();
    this.createButton();
    
    // 根据保存的状态应用功能
    if (this.state.isEnabled) {
      this.applyNumbers();
    }
    
    this.setupToolbarObserver();

    this.state.isInitialized = true;
    console.log('✅ W95 标题编号切换插件已初始化');
  }

  /**
   * 销毁插件
   */
  public destroy(): void {
    if (!this.state.isInitialized) return;

    // 移除按钮
    const button = document.getElementById(this.config.buttonId);
    if (button) {
      button.remove();
    }

    // 清除所有编号
    this.clearNumbers();

    // 断开观察者
    if (this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
    }

    // 重置状态
    this.state = { ...DEFAULT_HEADING_NUMBER_STATE };
    console.log('✅ W95 标题编号切换插件已销毁');
  }

  /**
   * 获取公共 API
   */
  public getAPI(): HeadingNumberToggleAPI {
    return {
      toggle: () => this.toggleState(),
      enable: () => this.enableNumbers(),
      disable: () => this.disableNumbers(),
      isEnabled: () => this.state.isEnabled,
      destroy: () => this.destroy()
    };
  }

  /**
   * 初始化状态
   */
  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isEnabled = await this.persistenceManager.loadState('headingNumberEnabled', false);
      } else {
        // 降级到localStorage
        const stored = localStorage.getItem(this.config.storageKey);
        this.state.isEnabled = stored === 'true';
      }
    } catch (e) {
      console.error('[HeadingNumberToggle] 状态初始化失败:', e);
      this.state.isEnabled = false;
    }
  }

  /**
   * 添加编号（核心修改：去掉末尾点号）
   */
  private applyNumbers(): void {
    this.clearNumbers();
    
    let h1 = 0, h2 = 0, h3 = 0, h4 = 0;
    document.querySelectorAll('.orca-repr-heading-content').forEach(el => {
      const level = parseInt((el as HTMLElement).dataset.level || '0');
      if (!level || level < 1 || level > 4) return;

      switch(level) {
        case 1: h1++; h2 = h3 = h4 = 0; break;
        case 2: h2++; h3 = h4 = 0; break;
        case 3: h3++; h4 = 0; break;
        case 4: h4++; break;
      }
      
      // 生成编号（移除末尾的点号）
      let number = `${h1}`;
      if (level >= 2) number += `.${h2}`;
      if (level >= 3) number += `.${h3}`;
      if (level >= 4) number += `.${h4}`;
      number += ' '; // 只保留空格，去掉点号
      
      const numberSpan = document.createElement('span');
      numberSpan.className = this.config.numberClass;
      numberSpan.style.fontWeight = '600';
      numberSpan.style.opacity = '0.85';
      numberSpan.style.marginRight = '0.5em';
      numberSpan.textContent = number;
      
      el.insertBefore(numberSpan, el.firstChild);
    });
  }

  /**
   * 清除编号
   */
  private clearNumbers(): void {
    document.querySelectorAll(`.${this.config.numberClass}`).forEach(span => span.remove());
  }

  /**
   * 切换状态
   */
  private async toggleState(): Promise<void> {
    this.state.isEnabled = !this.state.isEnabled;
    this.updateButtonStyle();
    this.state.isEnabled ? this.applyNumbers() : this.clearNumbers();
    await this.persistState();
  }

  /**
   * 启用编号
   */
  private async enableNumbers(): Promise<void> {
    if (!this.state.isEnabled) {
      this.state.isEnabled = true;
      this.updateButtonStyle();
      this.applyNumbers();
      await this.persistState();
    }
  }

  /**
   * 禁用编号
   */
  private async disableNumbers(): Promise<void> {
    if (this.state.isEnabled) {
      this.state.isEnabled = false;
      this.updateButtonStyle();
      this.clearNumbers();
      await this.persistState();
    }
  }

  /**
   * 持久化状态
   */
  private async persistState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('headingNumberEnabled', this.state.isEnabled);
      } else {
        // 降级到localStorage
        localStorage.setItem(this.config.storageKey, this.state.isEnabled.toString());
      }
    } catch (e) {
      console.error('[HeadingNumberToggle] 状态保存失败:', e);
    }
  }

  /**
   * 创建按钮
   */
  private createButton(): void {
    // 移除旧按钮
    const oldButton = document.getElementById(this.config.buttonId);
    if (oldButton) oldButton.remove();

    // 创建新按钮
    const button = document.createElement('button');
    button.id = this.config.buttonId;
    button.title = '标题编号（点击切换启用/关闭）';
    button.style.width = '24px';
    button.style.height = '24px';
    button.style.margin = '5px 8px';
    button.style.padding = '0';
    button.style.border = 'none';
    button.style.borderRadius = '3px';
    button.style.backgroundColor = 'transparent';
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.transition = 'all 0.2s ease';

    button.addEventListener('click', async () => await this.toggleState());

    // 使用按钮管理器注册按钮
    if (this.buttonManager) {
      this.buttonManager.registerButton(
        this.config.buttonId,
        button,
        2, // 优先级：标题编号按钮
        'headingNumberToggle',
        () => {
          // 按钮添加到DOM后更新样式
          this.updateButtonStyle();
        }
      );
    } else {
      // 回退到原来的方式
      const toolbar = document.querySelector(this.config.toolbarSelector);
      if (toolbar) {
        toolbar.appendChild(button);
        this.state.retryCount = 0;
        
        // 恢复保存的状态
        if (this.state.isEnabled) {
          this.updateButtonStyle();
          this.applyNumbers();
        }
        return;
      }

      // 重试逻辑
      if (this.state.retryCount < this.config.maxRetries) {
        this.state.retryCount++;
        setTimeout(() => this.createButton(), this.config.retryInterval);
      } else {
        console.warn('无法添加标题编号按钮：超过最大重试次数');
      }
    }
  }

  /**
   * 更新按钮图标
   */
  private updateButtonIcon(): void {
    const button = document.getElementById(this.config.buttonId);
    if (!button) return;

    // 根据当前状态设置正确的图标
    if (this.state.isEnabled) {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L19 7L17.74 13.74L24 15L17.74 16.26L19 23L13.09 21.74L12 28L10.91 21.74L5 23L6.26 16.26L0 15L6.26 13.74L5 7L10.91 8.26L12 2Z" fill="#666"/>
          <path d="M12 9V15" stroke="#666" stroke-width="2" stroke-linecap="round"/>
          <path d="M9 12H15" stroke="#666" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
    } else {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6H21V8H3V6ZM3 11H21V13H3V11ZM3 16H21V18H3V16Z" fill="#666"/>
        </svg>
      `;
    }
  }

  /**
   * 更新按钮样式
   */
  private updateButtonStyle(): void {
    const button = document.getElementById(this.config.buttonId);
    if (!button) return;

    // 先更新图标，确保图标内容正确
    this.updateButtonIcon();

    const paths = button.querySelectorAll('svg path');
    if (this.state.isEnabled) {
      button.style.backgroundColor = 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))';
      paths.forEach(path => path.setAttribute('fill', 'var(--orca-color-primary, #165DFF)'));
    } else {
      button.style.backgroundColor = 'transparent';
      paths.forEach(path => path.setAttribute('fill', 'var(--orca-color-text-secondary, #666)'));
    }
  }

  /**
   * 监听工具栏变化
   */
  private setupToolbarObserver(): void {
    this.state.observer = new MutationObserver((mutations) => {
      const button = document.getElementById(this.config.buttonId);
      const toolbar = document.querySelector(this.config.toolbarSelector);
      
      if (toolbar && (!button || !toolbar.contains(button))) {
        this.createButton();
      }
    });

    this.state.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}
