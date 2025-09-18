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
    button.style.backgroundColor = 'transparent';
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
      this.buttonManager.registerButton(
        this.config.buttonId,
        button,
        6, // 优先级：镜像容器切换按钮
        'mirrorContainerToggle',
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
          if (this.state.isHidden) {
            this.applyHideStyle();
          }
          this.updateButtonStyle();
          return;
        }
      }

      // 重试逻辑
      if (this.state.retryCount < this.config.maxRetries) {
        this.state.retryCount++;
        setTimeout(() => this.createButton(), this.config.retryInterval);
      } else {
        console.warn('无法添加镜像容器切换按钮：超过最大重试次数');
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
    const button = document.getElementById(this.config.buttonId);
    if (!button) return;

    // 先更新图标，确保图标内容正确
    this.updateButtonIcon();

    const paths = button.querySelectorAll('svg path');
    if (this.state.isHidden) {
      button.style.backgroundColor = 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))';
      paths.forEach(path => path.setAttribute('fill', 'var(--orca-color-primary, #165DFF)'));
      button.title = '显示镜像容器';
    } else {
      button.style.backgroundColor = 'transparent';
      paths.forEach(path => path.setAttribute('fill', 'var(--orca-color-text-secondary, #666)'));
      button.title = '隐藏镜像容器';
    }
  }

  /**
   * 处理 DOM 变化
   * 由共享观察者调用
   */
  public onMutations(mutations: MutationRecord[]): void {
    // 使用节流逻辑处理 DOM 变化
    if (this.updateTimer !== null) {
      return; // 如果已经有一个更新计划，不再重复安排
    }
    
    this.updateTimer = window.setTimeout(() => {
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
      
      this.updateTimer = null;
    }, 150); // 150ms 的节流延迟
  }
}
