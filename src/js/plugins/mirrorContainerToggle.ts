/**
 * 镜像容器显示切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过CSS隐藏镜像容器
 * - 性能优化：使用共享观察者和防抖逻辑
 */

import type { 
  MirrorContainerToggleAPI, 
  MirrorContainerTogglePlugin, 
  MirrorContainerToggleState 
} from '../../types';
import { MIRROR_CONTAINER_TOGGLE_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';
import { observerManager } from '../utils/observerManager';
import { applyButtonStyle } from '../utils/buttonUtils';

export class MirrorContainerTogglePluginImpl implements MirrorContainerTogglePlugin {
  private state: MirrorContainerToggleState = {
    isHidden: false,
    retryCount: 0,
    isInitialized: false
  };

  private updateTimer: number | null = null;
  private observerId: string = 'mirrorContainerToggle';

  private config = MIRROR_CONTAINER_TOGGLE_CONFIG;
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
    
    // 使用共享观察者而不是创建新的观察者
    observerManager.register(
      this.observerId,
      this.onMutations.bind(this),
      10 // 优先级
    );

    this.state.isInitialized = true;
    console.log('✅ W95 镜像容器切换模块已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;

    // 移除按钮
    if (this.buttonEl) {
      this.buttonEl.remove();
      this.buttonEl = null;
    }

    // 注销共享观察者回调
    observerManager.unregister(this.observerId);

    // 清除更新定时器
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    // 移除样式
    this.removeHideStyle();

    this.state.isInitialized = false;
    console.log('✅ W95 镜像容器切换模块已销毁');
  }

  public getAPI(): MirrorContainerToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showContainers(),
      hide: () => this.hideContainers(),
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
   * 显示镜像容器
   */
  private showContainers(): void {
    if (!this.state.isHidden) return;
    this.state.isHidden = false;
    this.updateButtonStyle();
    this.removeHideStyle();
    this.saveState();
  }

  /**
   * 隐藏镜像容器
   */
  private hideContainers(): void {
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
      .orca-query-list-block:has(> .orca-block.orca-container[data-type="mirror"]) {
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
   * 优化版本，添加防抖逻辑
   */
  private createButton(): void {
    // 移除旧按钮
    const oldButton = document.getElementById(this.config.buttonId);
    if (oldButton) oldButton.remove();

    // 创建新按钮
    const button = document.createElement('button');
    button.id = this.config.buttonId;
    button.title = this.state.isHidden ? '显示镜像容器' : '隐藏镜像容器';
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
        6, // 优先级：镜像容器切换按钮
        'mirrorContainerToggle',
        () => {
          // 按钮添加到DOM后更新样式
          this.updateButtonStyle();
        },
        (newButton: HTMLButtonElement) => {
          // 重新绑定点击事件（使用防抖逻辑）
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
          console.log('🔧 镜像容器切换插件：重新绑定点击事件');
        }
      );
    } else {
      console.warn('🔧 镜像容器切换插件：按钮管理器不可用');
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
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM16.24 7.76C14.97 6.49 13.51 5.03 12.24 3.76L10.76 5.24C12.03 6.51 13.49 7.97 14.76 9.24L16.24 7.76Z" fill="#666"/>
        </svg>
      `;
    } else {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM16.24 7.76L14.76 9.24C13.49 7.97 12.03 6.51 10.76 5.24L12.24 3.76C13.51 5.03 14.97 6.49 16.24 7.76Z" fill="#666"/>
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
      if (this.state.isHidden) {
        applyButtonStyle(button, 'active');
        button.title = '显示镜像容器';
      } else {
        applyButtonStyle(button, 'inactive');
        button.title = '隐藏镜像容器';
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
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM16.24 7.76C14.97 6.49 13.51 5.03 12.24 3.76L10.76 5.24C12.03 6.51 13.49 7.97 14.76 9.24L16.24 7.76Z" fill="#666"/>
        </svg>
      `;
    } else {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM16.24 7.76L14.76 9.24C13.49 7.97 12.03 6.51 10.76 5.24L12.24 3.76C13.51 5.03 14.97 6.49 16.24 7.76Z" fill="#666"/>
        </svg>
      `;
    }
  }

  /**
   * 处理 DOM 变化（已禁用，由 ToolbarButtonManager 统一管理）
   * 由共享观察者调用
   */
  public onMutations(mutations: MutationRecord[]): void {
    console.log('🔧 镜像容器切换插件：DOM变化处理已禁用，由按钮管理器统一管理');
  }
}
