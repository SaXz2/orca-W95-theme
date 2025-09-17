/**
 * 仅块引用隐藏切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过CSS隐藏仅块引用内容
 */

import type { QueryBlockRefToggleAPI, QueryBlockRefTogglePlugin, QueryBlockRefToggleState } from '../../types';
import { QUERY_BLOCK_REF_TOGGLE_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';

export class QueryBlockRefTogglePluginImpl implements QueryBlockRefTogglePlugin {
  private state: QueryBlockRefToggleState = {
    isHidden: false,
    retryCount: 0,
    observer: null,
    isInitialized: false
  };

  private config = QUERY_BLOCK_REF_TOGGLE_CONFIG;
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
      this.hideMatchingBlocks();
    }
    
    this.setupObserver();

    this.state.isInitialized = true;
    console.log('✅ W95 仅块引用隐藏切换模块已初始化');
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

    // 显示所有隐藏的块
    this.showHiddenBlocks();

    this.state.isInitialized = false;
    console.log('✅ W95 仅块引用隐藏切换模块已销毁');
  }

  public getAPI(): QueryBlockRefToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showBlocks(),
      hide: () => this.hideBlocks(),
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
    this.state.isHidden ? this.hideMatchingBlocks() : this.showHiddenBlocks();
    this.saveState();
  }

  /**
   * 显示块
   */
  private showBlocks(): void {
    if (!this.state.isHidden) return;
    this.state.isHidden = false;
    this.updateButtonStyle();
    this.showHiddenBlocks();
    this.saveState();
  }

  /**
   * 隐藏块
   */
  private hideBlocks(): void {
    if (this.state.isHidden) return;
    this.state.isHidden = true;
    this.updateButtonStyle();
    this.hideMatchingBlocks();
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
   * 隐藏匹配的块
   */
  private hideMatchingBlocks(): void {
    document.querySelectorAll('.orca-query-list-block').forEach(block => {
      const reprMain = block.querySelector('.orca-repr-main');
      const isCollapsed = reprMain && reprMain.classList.contains('orca-repr-main-collapsed');
      
      if (isCollapsed) return;
      
      const childrenContainer = block.querySelector('.orca-repr-children');
      if (childrenContainer) {
        const hasVisibleChildren = Array.from(childrenContainer.childNodes).some(node => 
          node.nodeType === 1 || (node.nodeType === 3 && node.textContent?.trim() !== '')
        );
        if (hasVisibleChildren) return;
      }
      
      const container = block.querySelector('.orca-repr-main-content.orca-repr-text-content');
      if (!container) return;
      
      const children = container.children;
      if (children.length !== 3) return;
      
      if (children[0].classList.contains('orca-none-selectable') &&
          children[1].classList.contains('orca-inline') && 
          (children[1] as HTMLElement).dataset.type === 'r' &&
          children[2].classList.contains('orca-none-selectable')) {
        (block as HTMLElement).style.display = 'none';
      }
    });
  }

  /**
   * 显示所有隐藏的块
   */
  private showHiddenBlocks(): void {
    document.querySelectorAll('.orca-query-list-block').forEach(block => {
      (block as HTMLElement).style.display = '';
    });
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
    button.title = this.state.isHidden ? '显示所有块引用内容' : '隐藏仅块引用内容';
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
        4, // 优先级：块引用隐藏切换按钮
        'queryBlockRefToggle',
        () => this.updateButtonStyle() // 按钮添加完成后更新样式
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
          if (this.state.isHidden) this.hideMatchingBlocks();
          // 按钮添加到DOM后更新样式
          this.updateButtonStyle();
          return;
        }
      }

      if (this.state.retryCount < this.config.maxRetries) {
        this.state.retryCount++;
        setTimeout(() => this.createButton(), this.config.retryInterval);
      } else {
        console.warn('无法添加"块引用内容切换"按钮：超过最大重试次数');
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
    button.innerHTML = this.state.isHidden ? this.getHiddenIcon() : this.getShownIcon();
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
      paths.forEach(path => path.setAttribute('stroke', 'var(--orca-color-primary, #165DFF)'));
      button.title = '显示所有块引用内容';
    } else {
      button.style.backgroundColor = 'transparent';
      paths.forEach(path => path.setAttribute('stroke', 'var(--orca-color-text-secondary, #666)'));
      button.title = '隐藏仅块引用内容';
    }
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

  private getHiddenIcon(): string {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#666" stroke-width="2"/>
        <path d="M8 8l8 8" stroke="#666" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 16l8-8" stroke="#666" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  private getShownIcon(): string {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#666" stroke-width="2"/>
      </svg>
    `;
  }
}