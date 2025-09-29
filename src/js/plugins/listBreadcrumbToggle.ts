/**
 * 列表面包屑显示切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过CSS隐藏列表面包屑
 */

import type { 
  ListBreadcrumbToggleAPI, 
  ListBreadcrumbTogglePlugin, 
  ListBreadcrumbToggleState 
} from '../../types';
import { LIST_BREADCRUMB_TOGGLE_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';

export class ListBreadcrumbTogglePluginImpl implements ListBreadcrumbTogglePlugin {
  private state: ListBreadcrumbToggleState = {
    isHidden: false,
    retryCount: 0,
    observer: null,
    isInitialized: false
  };

  private config = LIST_BREADCRUMB_TOGGLE_CONFIG;
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
    if (this.state.isHidden) {
      this.applyHideStyle();
    }
    
    // 移除旧的观察者，使用按钮管理器统一管理
    // this.setupObserver();

    this.state.isInitialized = true;
    console.log('✅ W95 列表面包屑切换模块已初始化');
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
    this.removeHideStyle();

    this.state.isInitialized = false;
    console.log('✅ W95 列表面包屑切换模块已销毁');
  }

  public getAPI(): ListBreadcrumbToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showBreadcrumbs(),
      hide: () => this.hideBreadcrumbs(),
      getState: () => this.state.isHidden,
      destroy: () => this.destroy()
    };
  }

  /**
   * 初始化状态
   */
  private initState(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      this.state.isHidden = stored === 'true';
    } catch (e) {
      console.error('状态初始化失败:', e);
      this.state.isHidden = false;
    }
  }

  /**
   * 切换状态
   */
  private toggleState(): void {
    this.state.isHidden = !this.state.isHidden;
    this.updateButtonStyle();
    this.state.isHidden ? this.applyHideStyle() : this.removeHideStyle();
    this.saveState();
  }

  /**
   * 显示面包屑
   */
  private showBreadcrumbs(): void {
    if (!this.state.isHidden) return;
    this.state.isHidden = false;
    this.updateButtonStyle();
    this.removeHideStyle();
    this.saveState();
  }

  /**
   * 隐藏面包屑
   */
  private hideBreadcrumbs(): void {
    if (this.state.isHidden) return;
    this.state.isHidden = true;
    this.updateButtonStyle();
    this.applyHideStyle();
    this.saveState();
  }

  /**
   * 保存状态到本地存储
   */
  private saveState(): void {
    try {
      localStorage.setItem(this.config.storageKey, this.state.isHidden.toString());
    } catch (e) {
      console.error('状态保存失败:', e);
    }
  }

  /**
   * 应用隐藏样式
   */
  private applyHideStyle(): void {
    let style = document.getElementById(this.config.styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = this.config.styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      .orca-breadcrumb.orca-block-breadcrumb.orca-query-list-block-breadcrumb {
        display: none !important;
      }
    `;
  }

  /**
   * 移除隐藏样式
   */
  private removeHideStyle(): void {
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
    button.title = this.state.isHidden ? '显示列表面包屑' : '隐藏列表面包屑';
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
      this.buttonEl = button; // 保存按钮引用
      this.buttonManager.registerButton(
        this.config.buttonId,
        button,
        7, // 优先级：列表面包屑切换按钮
        'listBreadcrumbToggle',
        () => {
          // 按钮添加到DOM后更新样式
          this.updateButtonStyle();
        },
        (newButton: HTMLButtonElement) => {
          // 重新绑定点击事件
          newButton.addEventListener('click', () => this.toggleState());
          console.log('🔧 列表面包屑切换插件：重新绑定点击事件');
        }
      );
    } else {
      console.warn('🔧 列表面包屑切换插件：按钮管理器不可用');
    }
  }

  /**
   * 更新按钮图标
   */
  private updateButtonIcon(): void {
    const button = document.getElementById(this.config.buttonId);
    if (!button) return;

    // 根据当前状态设置正确的图标
    if (this.state.isHidden) {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 6L8.59 7.41 13.17 12L8.59 16.59 10 18L16 12L10 6Z" fill="#666"/>
          <path d="M3 12L5 10V14L3 12Z" fill="#666"/>
          <path d="M20 10L22 12L20 14V10Z" fill="#666"/>
        </svg>
      `;
    } else {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 6L8.59 7.41 13.17 12L8.59 16.59 10 18L16 12L10 6Z" fill="#666"/>
          <path d="M3 12L5 10V14L3 12Z" fill="#666"/>
        </svg>
      `;
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

      const paths = button.querySelectorAll('svg path');
      const strokes = button.querySelectorAll('svg stroke');
      
      if (this.state.isHidden) {
        button.style.backgroundColor = 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))';
        paths.forEach(path => path.setAttribute('fill', 'var(--orca-color-primary, #165DFF)'));
        button.title = '显示列表面包屑';
      } else {
        button.style.backgroundColor = 'transparent';
        paths.forEach(path => path.setAttribute('fill', 'var(--orca-color-text-secondary, #666)'));
        if (strokes.length > 0) {
          strokes.forEach(stroke => stroke.setAttribute('stroke', 'var(--orca-color-text-secondary, #666)'));
        }
        button.title = '隐藏列表面包屑';
      }
    });
  }

  /**
   * 为指定按钮更新图标
   */
  private updateButtonIconForButton(button: HTMLElement): void {
    // 根据当前状态设置正确的图标
    if (this.state.isHidden) {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 6L8.59 7.41 13.17 12L8.59 16.59 10 18L16 12L10 6Z" fill="#666"/>
          <path d="M3 12L5 10V14L3 12Z" fill="#666"/>
          <path d="M20 10L22 12L20 14V10Z" fill="#666"/>
        </svg>
      `;
    } else {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 6L8.59 7.41 13.17 12L8.59 16.59 10 18L16 12L10 6Z" fill="#666"/>
          <path d="M3 12L5 10V14L3 12Z" fill="#666"/>
        </svg>
      `;
    }
  }

  /**
   * 设置观察者（已禁用，由 ToolbarButtonManager 统一管理）
   */
  private setupObserver(): void {
    console.log('🔧 列表面包屑切换插件：观察者已禁用，由按钮管理器统一管理');
  }
}
