/**
 * 悬浮工具栏显示切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过CSS隐藏悬浮工具栏
 * - 性能优化：使用共享观察者和防抖逻辑
 */

import type { 
  PopupToolbarToggleAPI, 
  PopupToolbarTogglePlugin, 
  PopupToolbarToggleState 
} from '../../types';
import { POPUP_TOOLBAR_TOGGLE_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';
import { observerManager } from '../utils/observerManager';
import { applyButtonStyle } from '../utils/buttonUtils';

export class PopupToolbarTogglePluginImpl implements PopupToolbarTogglePlugin {
  private state: PopupToolbarToggleState = {
    isHidden: false,
    retryCount: 0,
    isInitialized: false
  };

  private updateTimer: number | null = null;
  private observerId: string = 'popupToolbarToggle';

  private config = POPUP_TOOLBAR_TOGGLE_CONFIG;
  private buttonEl: HTMLButtonElement | null = null;
  private buttonManager: ToolbarButtonManager | null = null;

  constructor(buttonManager?: ToolbarButtonManager) {
    this.buttonManager = buttonManager || null;
  }

  public initialize(): void {
    if (this.state.isInitialized) return;

    console.log('🔧 悬浮工具栏切换插件：开始初始化');
    
    // 加载保存的状态
    this.loadState();
    
    // 创建按钮
    this.createButton();
    
    // 应用初始状态
    this.applyState();
    
    this.state.isInitialized = true;
    console.log('🔧 悬浮工具栏切换插件：初始化完成');
  }

  public destroy(): void {
    console.log('🔧 悬浮工具栏切换插件：开始销毁');
    
    // 移除样式
    this.removeHideStyle();
    
    // 移除按钮
    if (this.buttonEl) {
      this.buttonEl.remove();
      this.buttonEl = null;
    }
    
    // 清除定时器
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    
    // 注销观察者
    observerManager.unregister(this.observerId);
    
    this.state.isInitialized = false;
    console.log('🔧 悬浮工具栏切换插件：销毁完成');
  }

  public getAPI(): PopupToolbarToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showToolbar(),
      hide: () => this.hideToolbar(),
      getState: () => this.state.isHidden,
      destroy: () => this.destroy()
    };
  }

  /**
   * 加载保存的状态
   */
  private loadState(): void {
    try {
      const savedState = localStorage.getItem(this.config.storageKey);
      if (savedState !== null) {
        this.state.isHidden = JSON.parse(savedState);
        console.log(`🔧 悬浮工具栏切换插件：加载状态 - 隐藏: ${this.state.isHidden}`);
      }
    } catch (error) {
      console.warn('🔧 悬浮工具栏切换插件：加载状态失败', error);
    }
  }

  /**
   * 保存状态
   */
  private async saveState(): Promise<void> {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.state.isHidden));
      console.log(`🔧 悬浮工具栏切换插件：保存状态 - 隐藏: ${this.state.isHidden}`);
    } catch (error) {
      console.warn('🔧 悬浮工具栏切换插件：保存状态失败', error);
    }
  }

  /**
   * 切换状态
   */
  private toggleState(): void {
    this.state.isHidden = !this.state.isHidden;
    this.applyState();
    this.updateButtonStyle();
    this.saveState();
    console.log(`🔧 悬浮工具栏切换插件：切换状态 - 隐藏: ${this.state.isHidden}`);
  }

  /**
   * 显示工具栏
   */
  private showToolbar(): void {
    if (this.state.isHidden) {
      this.state.isHidden = false;
      this.applyState();
      this.updateButtonStyle();
      this.saveState();
    }
  }

  /**
   * 隐藏工具栏
   */
  private hideToolbar(): void {
    if (!this.state.isHidden) {
      this.state.isHidden = true;
      this.applyState();
      this.updateButtonStyle();
      this.saveState();
    }
  }

  /**
   * 应用状态
   */
  private applyState(): void {
    if (this.state.isHidden) {
      this.addHideStyle();
    } else {
      this.removeHideStyle();
    }
  }

  /**
   * 添加隐藏样式
   */
  private addHideStyle(): void {
    // 移除旧样式
    this.removeHideStyle();
    
    // 创建新样式
    const style = document.createElement('style');
    style.id = this.config.styleId;
    style.textContent = `
      .orca-popup.orca-editor-toolbar {
        display: none !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🔧 悬浮工具栏切换插件：添加隐藏样式');
  }

  /**
   * 移除隐藏样式
   */
  private removeHideStyle(): void {
    const style = document.getElementById(this.config.styleId);
    if (style) {
      style.remove();
      console.log('🔧 悬浮工具栏切换插件：移除隐藏样式');
    }
  }

  /**
   * 创建按钮
   * 优化版本，添加防抖逻辑
   */
  private createButton(): void {
    // 移除旧按钮
    const oldButton = document.getElementById(this.config.buttonId);
    if (oldButton) oldButton.remove();

    // 创建新按钮
    const button = document.createElement('button');
    button.id = this.config.buttonId;
    button.title = this.state.isHidden ? '显示悬浮工具栏' : '隐藏悬浮工具栏';
    button.style.width = '24px';
    button.style.height = '24px';
    button.style.margin = '5px 8px';
    button.style.padding = '0';
    button.style.border = 'none';
    button.style.borderRadius = '3px';
    applyButtonStyle(button, 'inactive');
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.transition = 'all 0.2s ease';

    // 添加点击事件（使用防抖逻辑）
    let clickTimeout: number | null = null;
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (clickTimeout !== null) {
        clearTimeout(clickTimeout);
      }
      
      clickTimeout = window.setTimeout(() => {
        this.toggleState();
        clickTimeout = null;
      }, 100);
    });

    // 使用按钮管理器注册按钮
    if (this.buttonManager) {
      this.buttonEl = button; // 保存按钮引用
      this.buttonManager.registerButton(
        this.config.buttonId,
        button,
        15, // 优先级：悬浮工具栏切换按钮（最低优先级）
        'popupToolbarToggle',
        () => {
          // 按钮添加到DOM后更新样式
          this.updateButtonStyle();
        },
        (newButton: HTMLButtonElement) => {
          // 重新绑定点击事件
          let clickTimeout: number | null = null;
          newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (clickTimeout !== null) {
              clearTimeout(clickTimeout);
            }
            
            clickTimeout = window.setTimeout(() => {
              this.toggleState();
              clickTimeout = null;
            }, 100);
          });
          console.log('🔧 悬浮工具栏切换插件：重新绑定点击事件');
        }
      );
    } else {
      console.warn('🔧 悬浮工具栏切换插件：按钮管理器不可用');
    }
  }

  /**
   * 更新按钮样式
   */
  private updateButtonStyle(): void {
    // 更新所有同名按钮
    const buttons = document.querySelectorAll(`#${this.config.buttonId}`);
    buttons.forEach(button => {
      if (!(button instanceof HTMLElement)) return;

      // 先更新图标，确保图标内容正确
      this.updateButtonIconForButton(button);

      if (this.state.isHidden) {
        // 隐藏状态 - 使用激活颜色
        applyButtonStyle(button, 'active');
        button.title = '显示悬浮工具栏';
      } else {
        // 显示状态 - 使用正常颜色
        applyButtonStyle(button, 'inactive');
        button.title = '隐藏悬浮工具栏';
      }
    });
  }

  /**
   * 为指定按钮更新图标
   */
  private updateButtonIconForButton(button: HTMLElement): void {
    // 根据当前状态设置正确的图标
    const iconSvg = this.state.isHidden 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    
    button.innerHTML = iconSvg;
  }
}
