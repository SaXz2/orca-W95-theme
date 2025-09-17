/**
 * 隐藏OCR图片块模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过DOM操作控制OCR图片块显示
 * - 支持三种状态：关闭、隐藏OCR图片块、仅显示OCR图片块
 */

import type { 
  OcrImageBlockToggleAPI, 
  OcrImageBlockTogglePlugin, 
  OcrImageBlockToggleState 
} from '../../types';
import { OCR_IMAGE_BLOCK_TOGGLE_CONFIG } from '../../constants';

export class OcrImageBlockTogglePluginImpl implements OcrImageBlockTogglePlugin {
  private state: OcrImageBlockToggleState = {
    currentState: 0,
    retryCount: 0,
    mainObserver: null,
    originalDisplayMap: new Map(),
    isInitialized: false
  };

  private config = OCR_IMAGE_BLOCK_TOGGLE_CONFIG;

  constructor() {
    // 这个插件不需要按钮管理器，因为它添加按钮到搜索模态框而不是工具栏
  }

  public initialize(): void {
    if (this.state.isInitialized) return;

    this.initState();
    this.createButton();
    this.setupMainObserver();

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

    // 断开观察者
    if (this.state.mainObserver) {
      this.state.mainObserver.disconnect();
      this.state.mainObserver = null;
    }

    // 恢复所有块的原始显示状态
    this.restoreAllBlocksDisplay();

    this.state.isInitialized = false;
    console.log('✅ W95 隐藏OCR图片块模块已销毁');
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
   */
  private isOcrImageBlock(block: Element): boolean {
    const photoEl = block.querySelector(this.config.photoClassSelector);
    if (!photoEl) return false;
    const pseudoContent = window.getComputedStyle(photoEl, ':before').content;
    return pseudoContent === '"\\e84a"';
  }

  /**
   * 更新块的显示状态
   */
  public updateBlocksDisplay(): void {
    document.querySelectorAll(this.config.targetBlockSelector).forEach(block => {
      if (!this.state.originalDisplayMap.has(block)) {
        const currentDisplay = (block as HTMLElement).style.display || window.getComputedStyle(block).display;
        this.state.originalDisplayMap.set(block, currentDisplay);
      }
    });

    document.querySelectorAll(this.config.targetBlockSelector).forEach(block => {
      const isOcrBlock = this.isOcrImageBlock(block);
      switch(this.state.currentState) {
        case 1:
          (block as HTMLElement).style.display = isOcrBlock ? 'none' : this.state.originalDisplayMap.get(block) || '';
          break;
        case 2:
          (block as HTMLElement).style.display = isOcrBlock ? this.state.originalDisplayMap.get(block) || '' : 'none';
          break;
        case 0:
          (block as HTMLElement).style.display = this.state.originalDisplayMap.get(block) || '';
          break;
      }
    });
  }

  /**
   * 恢复所有块的原始显示状态
   */
  private restoreAllBlocksDisplay(): void {
    this.state.originalDisplayMap.forEach((originalDisplay, block) => {
      (block as HTMLElement).style.display = originalDisplay;
    });
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
   */
  private createButton(): void {
    const oldButton = document.getElementById(this.config.buttonId);
    if (oldButton) oldButton.remove();

    // 尝试多种容器选择器
    let container = document.querySelector(this.config.containerSelector);
    let footer = null;
    
    if (container) {
      footer = container.querySelector(this.config.footerSelector);
    } else {
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
    }
    
    if (!container || !footer) {
      if (this.state.retryCount < this.config.maxRetries) {
        this.state.retryCount++;
        setTimeout(() => this.createButton(), this.config.retryInterval);
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

    button.addEventListener('click', () => this.toggleTripleState());

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
   * 设置主观察者
   */
  private setupMainObserver(): void {
    this.state.mainObserver = new MutationObserver((mutations) => {
      const button = document.getElementById(this.config.buttonId);
      
      // 使用相同的容器查找逻辑
      let container = document.querySelector(this.config.containerSelector);
      let footer = null;
      
      if (container) {
        footer = container.querySelector(this.config.footerSelector);
      } else {
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
      }
      
      if (container && footer && (!button || !footer.contains(button))) {
        this.createButton();
      }
      
      if (this.state.currentState !== 0) {
        this.updateBlocksDisplay();
      }
    });

    this.state.mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
}
