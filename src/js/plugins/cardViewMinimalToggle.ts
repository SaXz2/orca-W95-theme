/**
 * 卡片视图极简显示切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过CSS隐藏卡片标题和面包屑
 * - 性能优化：使用共享观察者和防抖逻辑
 */

import type { 
  CardViewMinimalToggleAPI, 
  CardViewMinimalTogglePlugin, 
  CardViewMinimalToggleState 
} from '../../types';
import { CARD_VIEW_MINIMAL_TOGGLE_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';
import { observerManager } from '../utils/observerManager';

export class CardViewMinimalTogglePluginImpl implements CardViewMinimalTogglePlugin {
  private state: CardViewMinimalToggleState = {
    isMinimal: false,
    retryCount: 0,
    isInitialized: false
  };

  private updateTimer: number | null = null;
  private observerId: string = 'cardViewMinimalToggle';

  private config = CARD_VIEW_MINIMAL_TOGGLE_CONFIG;
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
    if (this.state.isMinimal) {
      this.applyMinimalStyle();
    }
    
    // 使用共享观察者而不是创建新的观察者
    observerManager.register(
      this.observerId,
      this.onMutations.bind(this),
      8 // 优先级
    );

    this.state.isInitialized = true;
    console.log('✅ W95 卡片视图极简切换模块已初始化');
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
    this.removeMinimalStyle();

    this.state.isInitialized = false;
    console.log('✅ W95 卡片视图极简切换模块已销毁');
  }

  public getAPI(): CardViewMinimalToggleAPI {
    return {
      toggle: () => this.toggleState(),
      enable: () => this.enableMinimal(),
      disable: () => this.disableMinimal(),
      getState: () => this.state.isMinimal,
      destroy: () => this.destroy()
    };
  }

  /**
   * 初始化状态
   */
  private initState(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      this.state.isMinimal = stored === 'true';
    } catch (e) {
      console.error('状态初始化失败:', e);
      this.state.isMinimal = false;
    }
  }

  /**
   * 切换状态
   */
  private toggleState(): void {
    this.state.isMinimal = !this.state.isMinimal;
    this.updateButtonStyle();
    this.state.isMinimal ? this.applyMinimalStyle() : this.removeMinimalStyle();
    this.saveState();
  }

  /**
   * 启用极简视图
   */
  private enableMinimal(): void {
    if (this.state.isMinimal) return;
    this.state.isMinimal = true;
    this.updateButtonStyle();
    this.applyMinimalStyle();
    this.saveState();
  }

  /**
   * 禁用极简视图
   */
  private disableMinimal(): void {
    if (!this.state.isMinimal) return;
    this.state.isMinimal = false;
    this.updateButtonStyle();
    this.removeMinimalStyle();
    this.saveState();
  }

  /**
   * 保存状态到本地存储
   */
  private saveState(): void {
    try {
      localStorage.setItem(this.config.storageKey, this.state.isMinimal.toString());
    } catch (e) {
      console.error('状态保存失败:', e);
    }
  }

  /**
   * 应用极简样式
   */
  private applyMinimalStyle(): void {
    let style = document.getElementById(this.config.styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = this.config.styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      .orca-breadcrumb.orca-block-breadcrumb.orca-query-card-breadcrumb {
        display: none !important;
      }
      .orca-query-card-title.orca-query-card-title-foldable {
        display: none !important;
      }
      .orca-query-card-title {
        display: none !important;
      }
    `;
  }

  /**
   * 移除极简样式
   */
  private removeMinimalStyle(): void {
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
    button.title = this.state.isMinimal ? '恢复完整视图' : '切换到极简视图';
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
        8, // 优先级：卡片视图极简切换按钮
        'cardViewMinimalToggle',
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
          if (this.state.isMinimal) {
            this.applyMinimalStyle();
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
        console.warn('无法添加卡片视图极简切换按钮：超过最大重试次数');
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
    if (this.state.isMinimal) {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 5v14c0 1.1 0.9 2 2 2h14c1.1 0 2-0.9 2-2V5c0-1.1-0.9-2-2-2H5c-1.1 0-2 0.9-2 2zm16 14H5V5h14v14zM7 7h5v5H7V7zm0 7h5v2H7v-2zm7-7h2v5h-2V7zm0 7h2v2h-2v-2z" fill="#666"/>
        </svg>
      `;
    } else {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 5v14c0 1.1 0.9 2 2 2h14c1.1 0 2-0.9 2-2V5c0-1.1-0.9-2-2-2H5c-1.1 0-2 0.9-2 2zm16 14H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" fill="#666"/>
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
    if (this.state.isMinimal) {
      button.style.backgroundColor = 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))';
      paths.forEach(path => path.setAttribute('fill', 'var(--orca-color-primary, #165DFF)'));
      button.title = '恢复完整视图';
    } else {
      button.style.backgroundColor = 'transparent';
      paths.forEach(path => path.setAttribute('fill', 'var(--orca-color-text-secondary, #666)'));
      button.title = '切换到极简视图';
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
