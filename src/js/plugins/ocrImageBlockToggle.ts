/**
 * 隐藏OCR图片块模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过DOM操作控制OCR图片块显示
 * - 支持三种状态：关闭、隐藏OCR图片块、仅显示OCR图片块
 * - 性能优化：使用共享观察者和节流逻辑
 */

import type { 
  OcrImageBlockToggleAPI, 
  OcrImageBlockTogglePlugin, 
  OcrImageBlockToggleState 
} from '../../types';
import { OCR_IMAGE_BLOCK_TOGGLE_CONFIG } from '../../constants';
import { observerManager } from '../utils/observerManager';

export class OcrImageBlockTogglePluginImpl implements OcrImageBlockTogglePlugin {
  private state: OcrImageBlockToggleState = {
    currentState: 0,
    retryCount: 0,
    mainObserver: null,
    isInitialized: false
  };

  private config = OCR_IMAGE_BLOCK_TOGGLE_CONFIG;
  private updateTimer: number | null = null;
  private observerId: string = 'ocrImageBlockToggle';
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    // 这个插件不需要按钮管理器，因为它添加按钮到搜索模态框而不是工具栏
  }

  public initialize(): void {
    if (this.state.isInitialized) return;

    this.initState();
    this.createButton();
    
    // 根据保存的状态立即应用样式（避免闪烁）
    this.applyDisplayStyle();
    
    // 使用共享观察者而不是创建新的观察者
    observerManager.register(
      this.observerId,
      this.onMutations.bind(this),
      12 // 优先级
    );

    this.state.isInitialized = true;
    console.log('✅ W95 隐藏OCR图片块模块已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;

    // 移除按钮
    const button = document.getElementById(this.config.buttonId);
    if (button) {
      button.remove();
    }

    // 注销共享观察者回调
    observerManager.unregister(this.observerId);

    // 清除更新定时器
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    // 移除样式元素
    this.removeDisplayStyle();

    this.state.isInitialized = false;
    console.log('✅ W95 隐藏OCR图片块模块已销毁');
  }
  
  /**
   * 处理 DOM 变化
   * 由共享观察者调用
   */
  public onMutations(mutations: MutationRecord[]): void {
    // 检查是否有相关变化
    const hasRelevantChanges = mutations.some(mutation => {
      // 检查是否是搜索模态框相关变化
      if (mutation.target instanceof Element) {
        if (mutation.target.matches(this.config.containerSelector) || 
            mutation.target.closest(this.config.containerSelector)) {
          return true;
        }
        
        // 检查是否是块项目相关变化
        if (mutation.target.matches(this.config.targetBlockSelector) || 
            mutation.target.closest(this.config.targetBlockSelector)) {
          return true;
        }
      }
      return false;
    });
    
    if (hasRelevantChanges) {
      // 检查按钮是否需要创建
      const button = document.getElementById(this.config.buttonId);
      let container = document.querySelector(this.config.containerSelector);
      let footer = null;
      
      if (container) {
        footer = container.querySelector(this.config.footerSelector);
        if (footer && (!button || !footer.contains(button))) {
          this.createButton();
        }
      }
      
      // 如果状态不是关闭，更新块显示
      if (this.state.currentState !== 0) {
        this.throttledUpdateBlocksDisplay();
      }
    }
  }

  public getAPI(): OcrImageBlockToggleAPI {
    return {
      toggle: () => this.toggleTripleState(),
      setState: (state: number) => this.setState(state),
      getState: () => this.state.currentState,
      updateBlocksDisplay: () => this.updateBlocksDisplay(),
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
      if (this.state.currentState < 0 || this.state.currentState > 2) {
        this.state.currentState = 0;
      }
    } catch (e) {
      console.error('状态初始化失败:', e);
      this.state.currentState = 0;
    }
  }

  /**
   * 检查是否为OCR图片块
   * 新的实现方式：检查是否包含特定的图片图标元素，并且位于特定的搜索模态框内
   */
  private isOcrImageBlock(block: Element): boolean {
    // 检查块是否为搜索模态框中的块项目
    if (!block.classList.contains('orca-menu-item') || !block.classList.contains('orca-search-modal-block-item')) {
      return false;
    }
    
    // 检查是否位于特定的搜索模态框内
    const searchModal = block.closest('.orca-menu.orca-search-modal');
    if (!searchModal) {
      return false;
    }
    
    // 检查是否包含图片图标元素（使用更通用的选择器）
    const photoIconEl = block.querySelector('.ti-photo');
    return !!photoIconEl;
  }

  /**
   * 使用节流逻辑更新块显示
   */
  private throttledUpdateBlocksDisplay(): void {
    if (this.updateTimer !== null) {
      return; // 如果已经有一个更新计划，不再重复安排
    }
    
    this.updateTimer = window.setTimeout(() => {
      this.updateBlocksDisplay();
      this.updateTimer = null;
    }, 150); // 150ms 的节流延迟
  }

  /**
   * 应用显示样式（使用CSS方式）
   */
  private applyDisplayStyle(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'w95-ocr-image-block-toggle-style';
      document.head.appendChild(this.styleElement);
    }

    let styleContent = '';
    
    switch(this.state.currentState) {
      case 1: // 隐藏 OCR 图片块
        styleContent = `
          .orca-menu-item.orca-search-modal-block-item:has(.ti-photo) {
            display: none !important;
          }
        `;
        break;
      case 2: // 仅显示 OCR 图片块
        styleContent = `
          .orca-menu-item.orca-search-modal-block-item:not(:has(.ti-photo)) {
            display: none !important;
          }
        `;
        break;
      case 0: // 全部显示
        // 不添加任何样式，让所有块正常显示
        break;
    }
    
    this.styleElement.textContent = styleContent;
  }

  /**
   * 移除显示样式
   */
  private removeDisplayStyle(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  /**
   * 更新块的显示状态（保持向后兼容）
   */
  public updateBlocksDisplay(): void {
    // 使用CSS样式方式
    this.applyDisplayStyle();
  }


  /**
   * 切换三重状态
   */
  private toggleTripleState(): void {
    this.state.currentState = (this.state.currentState + 1) % 3;
    this.updateButtonStyle();
    this.updateBlocksDisplay();
    this.saveState();
  }

  /**
   * 设置特定状态
   */
  private setState(state: number): void {
    if (state >= 0 && state <= 2) {
      this.state.currentState = state;
      this.updateButtonStyle();
      this.updateBlocksDisplay();
      this.saveState();
    }
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
   * 创建按钮
   * 优化版本，使用辅助方法和防抖逻辑
   */
  private createButton(): void {
    const oldButton = document.getElementById(this.config.buttonId);
    if (oldButton) oldButton.remove();

    // 使用辅助方法查找容器和页脚
    const { container, footer } = this.findContainerAndFooter();
    
    if (!container || !footer) {
      if (this.state.retryCount < this.config.maxRetries) {
        this.state.retryCount++;
        // 使用指数退避策略，减少重试频率
        const retryDelay = this.config.retryInterval * Math.pow(1.5, this.state.retryCount - 1);
        setTimeout(() => this.createButton(), retryDelay);
      }
      return;
    }

    const button = document.createElement('button');
    button.id = this.config.buttonId;
    button.title = this.config.stateTitleMap[this.state.currentState as keyof typeof this.config.stateTitleMap];
    button.style.cssText = `
      font-family: var(--orca-fontfamily-fallback, -apple-system, BlinkMacSystemFont);
      font-weight: var(--orca-fontweight-md, 400);
      line-height: var(--orca-lineheight-md, 1.6);
      font-size: 13px;
      color: var(--orca-color-text-2, #666);
      box-sizing: border-box;
      outline: none;
      margin: 0;
      margin-right: 16px;
      cursor: pointer;
      padding: 0;
      border: none;
      border-radius: var(--orca-radius-sm, 4px);
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: auto;
      width: auto;
    `;

    button.innerHTML = `${this.getButtonSvg()}<span>${this.config.stateTextMap[this.state.currentState as keyof typeof this.config.stateTextMap]}</span>`;

    // 添加点击事件（使用防抖逻辑）
    let clickTimeout: number | null = null;
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (clickTimeout !== null) {
        clearTimeout(clickTimeout);
      }
      
      clickTimeout = window.setTimeout(() => {
        this.toggleTripleState();
        clickTimeout = null;
      }, 100);
    });

    footer.appendChild(button);
    this.state.retryCount = 0;
    
    this.updateBlocksDisplay();
    this.updateButtonStyle();
  }

  /**
   * 获取按钮SVG图标
   */
  private getButtonSvg(): string {
    switch(this.state.currentState) {
      case 1:
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      case 2:
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 7V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      default:
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }
  }

  /**
   * 更新按钮样式
   */
  private updateButtonStyle(): void {
    const button = document.getElementById(this.config.buttonId);
    if (!button) return;

    button.title = this.config.stateTitleMap[this.state.currentState as keyof typeof this.config.stateTitleMap];
    button.innerHTML = `${this.getButtonSvg()}<span>${this.config.stateTextMap[this.state.currentState as keyof typeof this.config.stateTextMap]}</span>`;

    switch(this.state.currentState) {
      case 1:
        button.style.backgroundColor = 'var(--orca-color-warning-1, rgba(214, 156, 20, 0.15))';
        button.style.color = 'var(--orca-color-warning-5, rgb(214, 156, 20))';
        break;
      case 2:
        button.style.backgroundColor = 'var(--orca-color-primary-1, rgba(24, 124, 201, 0.15))';
        button.style.color = 'var(--orca-color-primary-5, #187cc9)';
        break;
      default:
        button.style.backgroundColor = 'transparent';
        button.style.color = 'var(--orca-color-text-2, #666)';
        break;
    }
  }

  /**
   * 查找容器和页脚元素
   * 优化版本，减少重复代码
   */
  private findContainerAndFooter(): { container: Element | null, footer: Element | null } {
    let container = document.querySelector(this.config.containerSelector);
    let footer = null;
    
    if (container) {
      footer = container.querySelector(this.config.footerSelector);
      if (footer) {
        return { container, footer };
      }
    }
    
    // 备用选择器
    const alternativeSelectors = [
      '.orca-menu',
      '.search-modal',
      '.modal',
      '[class*="search"]',
      '[class*="modal"]'
    ];
    
    for (const selector of alternativeSelectors) {
      container = document.querySelector(selector);
      if (container) {
        footer = container.querySelector(this.config.footerSelector) || 
                container.querySelector('.footer') ||
                container.querySelector('[class*="footer"]');
        if (footer) break;
      }
    }
    
    return { container, footer };
  }
}
