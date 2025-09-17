/**
 * 卡片封面比例切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过CSS控制卡片封面比例
 * - 支持三种状态：11:16竖版、16:9横版、禁用比例控制
 */

import type { 
  CardCoverAspectRatioAPI, 
  CardCoverAspectRatioPlugin, 
  CardCoverAspectRatioState 
} from '../../types';
import { CARD_COVER_ASPECT_RATIO_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';

export class CardCoverAspectRatioTogglePluginImpl implements CardCoverAspectRatioPlugin {
  private state: CardCoverAspectRatioState = {
    currentState: 0,
    retryCount: 0,
    observer: null,
    isInitialized: false
  };

  private config = CARD_COVER_ASPECT_RATIO_CONFIG;
  private buttonEl: HTMLButtonElement | null = null;
  private buttonManager: ToolbarButtonManager | null = null;

  constructor(buttonManager?: ToolbarButtonManager) {
    this.buttonManager = buttonManager || null;
  }

  public initialize(): void {
    if (this.state.isInitialized) return;

    this.initState();
    this.createButton();
    
    // 根据保存的状态应用功能
    this.applyAspectRatioStyle();
    
    this.setupObserver();

    this.state.isInitialized = true;
    console.log('✅ W95 卡片封面比例切换模块已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;

    // 移除按钮
    if (this.buttonEl) {
      this.buttonEl.remove();
      this.buttonEl = null;
    }

    // 断开观察者
    if (this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
    }

    // 移除样式
    this.removeAspectRatioStyle();

    this.state.isInitialized = false;
    console.log('✅ W95 卡片封面比例切换模块已销毁');
  }

  public getAPI(): CardCoverAspectRatioAPI {
    return {
      toggle: () => this.toggleState(),
      setState: (state: number) => this.setState(state),
      getState: () => this.state.currentState,
      getCurrentRatio: () => this.getCurrentRatio(),
      destroy: () => this.destroy()
    };
  }

  /**
   * 初始化状态
   */
  private initState(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      this.state.currentState = stored ? parseInt(stored, 10) : 0;
      // 确保状态在有效范围内
      if (this.state.currentState < 0 || this.state.currentState >= this.config.states.length) {
        this.state.currentState = 0;
      }
    } catch (e) {
      console.error('状态初始化失败:', e);
      this.state.currentState = 0;
    }
  }

  /**
   * 切换状态
   */
  private toggleState(): void {
    // 循环切换状态：0 → 1 → 2 → 0...
    this.state.currentState = (this.state.currentState + 1) % this.config.states.length;
    this.updateButtonStyle();
    this.applyAspectRatioStyle();
    this.saveState();
  }

  /**
   * 设置特定状态
   */
  private setState(state: number): void {
    if (state >= 0 && state < this.config.states.length) {
      this.state.currentState = state;
      this.updateButtonStyle();
      this.applyAspectRatioStyle();
      this.saveState();
    }
  }

  /**
   * 获取当前比例
   */
  private getCurrentRatio(): string {
    const currentState = this.config.states[this.state.currentState];
    return currentState.ratio;
  }

  /**
   * 保存状态到本地存储
   */
  private saveState(): void {
    try {
      localStorage.setItem(this.config.storageKey, this.state.currentState.toString());
    } catch (e) {
      console.error('状态保存失败:', e);
    }
  }

  /**
   * 应用比例样式
   */
  private applyAspectRatioStyle(): void {
    let style = document.getElementById(this.config.styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = this.config.styleId;
      document.head.appendChild(style);
    }
    
    // 仅在非禁用状态下应用比例
    const ratio = this.state.currentState < 2 ? this.config.states[this.state.currentState].ratio : 'auto';
    style.textContent = `
      .orca-query-card-cover {
        aspect-ratio: ${ratio} !important;
      }
    `;
  }

  /**
   * 移除比例样式
   */
  private removeAspectRatioStyle(): void {
    const style = document.getElementById(this.config.styleId);
    if (style) {
      style.remove();
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
    button.title = this.config.states[this.state.currentState].title;
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

    button.addEventListener('click', () => this.toggleState());

    // 使用按钮管理器注册按钮
    if (this.buttonManager) {
      this.buttonManager.registerButton(
        this.config.buttonId,
        button,
        9, // 优先级：卡片封面比例切换按钮
        'cardCoverAspectRatioToggle',
        () => {
          // 按钮添加到DOM后更新样式
          this.updateButtonStyle();
        }
      );
    } else {
      // 回退到原来的方式
      const activePanel = document.querySelector(this.config.targetPanelSelector);
      if (activePanel) {
        const toolbar = activePanel.querySelector(this.config.toolbarSelector);
        if (toolbar) {
          toolbar.appendChild(button);
          this.buttonEl = button;
          this.state.retryCount = 0;
          
          // 恢复保存的状态
          this.applyAspectRatioStyle();
          this.updateButtonStyle();
          return;
        }
      }

      // 重试逻辑
      if (this.state.retryCount < this.config.maxRetries) {
        this.state.retryCount++;
        setTimeout(() => this.createButton(), this.config.retryInterval);
      } else {
        console.warn('无法添加卡片封面比例切换按钮：超过最大重试次数');
      }
    }
  }

  /**
   * 更新按钮图标
   */
  private updateButtonIcon(button: HTMLButtonElement): void {
    const current = this.config.states[this.state.currentState];
    
    // 根据当前状态设置不同图标
    switch(current.icon) {
      case 'portrait': // 11:16 竖版
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3H20V21H4V3ZM19 19H5V5H19V19Z" fill="#666"/>
            <path d="M8 7H16V11H8V7Z" fill="#666"/>
          </svg>
        `;
        break;
      case 'landscape': // 16:9 横版
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3H20V21H4V3ZM19 19H5V5H19V19Z" fill="#666"/>
            <path d="M7 8H17V10H7V8Z" fill="#666"/>
          </svg>
        `;
        break;
      case 'disabled': // 禁用状态
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3H20V21H4V3ZM19 19H5V5H19V19Z" fill="#999"/>
            <path d="M15 8L9 16" stroke="#999" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
        break;
    }
  }

  /**
   * 更新按钮样式
   */
  private updateButtonStyle(): void {
    const button = document.getElementById(this.config.buttonId);
    if (!button) return;

    const paths = button.querySelectorAll('svg path');
    const current = this.config.states[this.state.currentState];
    
    // 更新按钮标题
    button.title = current.title;
    
    // 更新按钮样式
    if (current.icon === 'disabled') {
      // 禁用状态样式
      button.style.backgroundColor = 'transparent';
      button.style.opacity = '0.6';
      paths.forEach(path => {
        path.setAttribute('fill', '#999');
      });
    } else {
      // 激活状态样式
      button.style.backgroundColor = 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))';
      button.style.opacity = '1';
      paths.forEach(path => {
        path.setAttribute('fill', 'var(--orca-color-primary, #165DFF)');
      });
    }
    
    // 更新图标
    this.updateButtonIcon(button as HTMLButtonElement);
  }

  /**
   * 设置观察者
   */
  private setupObserver(): void {
    this.state.observer = new MutationObserver((mutations) => {
      const button = document.getElementById(this.config.buttonId);
      const activePanel = document.querySelector(this.config.targetPanelSelector);
      
      // 检查是否需要重新创建按钮
      if (activePanel) {
        const toolbar = activePanel.querySelector(this.config.toolbarSelector);
        if (toolbar && (!button || !toolbar.contains(button))) {
          this.createButton();
        }
      } else if (button) {
        // 如果没有激活面板但按钮存在，移除按钮
        button.remove();
      }
    });

    // 监视整个文档的变化
    this.state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }
}
