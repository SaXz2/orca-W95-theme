/**
 * 仅块引用背景色高亮切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，仅修改背景色
 */

import type { 
  QueryBlockHighlightToggleAPI, 
  QueryBlockHighlightTogglePlugin, 
  QueryBlockHighlightToggleState 
} from '../../types';
import { QUERY_BLOCK_HIGHLIGHT_TOGGLE_CONFIG } from '../../constants';
import { createToolbarButton, updateButtonStyle, type ButtonConfig, type ButtonStyleConfig, type ToolbarButtonManager } from '../utils/buttonUtils';
import { createBlockObserver, disconnectObserver } from '../utils/observerUtils';

export class QueryBlockHighlightTogglePluginImpl implements QueryBlockHighlightTogglePlugin {
  private state: QueryBlockHighlightToggleState = {
    isHighlighted: false,
    retryCount: 0,
    mainObserver: null,
    blockObserver: null,
    highlightedBlocks: new Set(),
    isInitialized: false
  };

  private config = QUERY_BLOCK_HIGHLIGHT_TOGGLE_CONFIG;
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
    if (this.state.isHighlighted) {
      this.highlightMatchingBlocks();
    }
    
    this.setupMainObserver();

    this.state.isInitialized = true;
    console.log('✅ W95 仅块引用背景色高亮切换模块已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;

    // 移除按钮
    if (this.buttonEl) {
      this.buttonEl.remove();
      this.buttonEl = null;
    }

    // 断开观察者
    disconnectObserver(this.state.mainObserver);
    this.state.mainObserver = null;
    disconnectObserver(this.state.blockObserver);
    this.state.blockObserver = null;

    // 清理高亮状态
    this.state.highlightedBlocks.forEach(block => {
      (block as HTMLElement).style.removeProperty('background-color');
    });
    this.state.highlightedBlocks.clear();

    this.state.isInitialized = false;
    console.log('✅ W95 仅块引用背景色高亮切换模块已销毁');
  }

  public getAPI(): QueryBlockHighlightToggleAPI {
    return {
      toggle: () => this.toggleHighlightState(),
      enable: () => this.enableHighlight(),
      disable: () => this.disableHighlight(),
      getState: () => this.state.isHighlighted,
      destroy: () => this.destroy()
    };
  }

  /**
   * 初始化状态
   */
  private initState(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      this.state.isHighlighted = stored === 'true';
    } catch (e) {
      console.error('状态初始化失败:', e);
      this.state.isHighlighted = false;
    }
  }

  /**
   * 核心判断逻辑：仅对符合条件的区块操作
   */
  private highlightMatchingBlocks(): void {
    const newlyHighlighted = new Set<Element>();
    
    document.querySelectorAll('.orca-query-list-block').forEach(block => {
      // 判定1：排除折叠状态的区块
      const reprMain = block.querySelector('.orca-repr-main');
      const isCollapsed = reprMain && reprMain.classList.contains('orca-repr-main-collapsed');
      if (isCollapsed) {
        // 仅当该区块是由本功能高亮的，才取消高亮
        if (this.state.highlightedBlocks.has(block)) {
          (block as HTMLElement).style.removeProperty('background-color');
        }
        return;
      }
      
      // 判定2：排除有有效子内容的区块
      const childrenContainer = block.querySelector('.orca-repr-children');
      if (childrenContainer) {
        const hasVisibleChildren = Array.from(childrenContainer.childNodes).some(node => 
          node.nodeType === 1 || // 元素节点
          (node.nodeType === 3 && node.textContent?.trim() !== '') // 非空白文本节点
        );
        if (hasVisibleChildren) {
          // 仅当该区块是由本功能高亮的，才取消高亮
          if (this.state.highlightedBlocks.has(block)) {
            (block as HTMLElement).style.removeProperty('background-color');
          }
          return;
        }
      }
      
      // 判定3：识别仅块引用的结构特征
      const container = block.querySelector('.orca-repr-main-content.orca-repr-text-content');
      if (!container) {
        // 仅当该区块是由本功能高亮的，才取消高亮
        if (this.state.highlightedBlocks.has(block)) {
          (block as HTMLElement).style.removeProperty('background-color');
        }
        return;
      }
      
      const children = container.children;
      if (children.length !== 3) {
        // 仅当该区块是由本功能高亮的，才取消高亮
        if (this.state.highlightedBlocks.has(block)) {
          (block as HTMLElement).style.removeProperty('background-color');
        }
        return;
      }
      
      // 严格匹配块引用结构
      if (children[0].classList.contains('orca-none-selectable') &&
          children[1].classList.contains('orca-inline') && 
          (children[1] as HTMLElement).dataset.type === 'r' &&
          children[2].classList.contains('orca-none-selectable')) {
        
        // 符合条件的仅块引用区块
        if (this.state.isHighlighted) {
          // 开启高亮时添加背景色
          (block as HTMLElement).style.backgroundColor = this.config.highlightColor;
          newlyHighlighted.add(block);
        } else {
          // 关闭高亮时，仅移除本功能添加的背景色
          if (this.state.highlightedBlocks.has(block)) {
            (block as HTMLElement).style.removeProperty('background-color');
          }
        }
      } else {
        // 不符合条件的区块，仅移除本功能添加的背景色
        if (this.state.highlightedBlocks.has(block)) {
          (block as HTMLElement).style.removeProperty('background-color');
        }
      }
    });
    
    // 更新已高亮区块记录
    this.state.highlightedBlocks = newlyHighlighted;
  }

  /**
   * 切换高亮状态
   */
  private toggleHighlightState(): void {
    this.state.isHighlighted = !this.state.isHighlighted;
    this.updateButtonStyle();
    this.highlightMatchingBlocks();
    this.saveState();
  }

  /**
   * 启用高亮
   */
  private enableHighlight(): void {
    if (this.state.isHighlighted) return;
    this.state.isHighlighted = true;
    this.updateButtonStyle();
    this.highlightMatchingBlocks();
    this.saveState();
  }

  /**
   * 禁用高亮
   */
  private disableHighlight(): void {
    if (!this.state.isHighlighted) return;
    this.state.isHighlighted = false;
    this.updateButtonStyle();
    this.highlightMatchingBlocks();
    this.saveState();
  }

  /**
   * 保存状态到本地存储
   */
  private saveState(): void {
    try {
      localStorage.setItem(this.config.storageKey, this.state.isHighlighted.toString());
    } catch (e) {
      console.error('状态保存失败:', e);
    }
  }

  /**
   * 创建背景色设置按钮
   */
  private createButton(): void {
    const buttonConfig: ButtonConfig = {
      id: this.config.buttonId,
      title: this.state.isHighlighted ? '取消仅块引用区块背景色' : '设置仅块引用区块背景色'
    };

    const styleConfig: ButtonStyleConfig = {
      active: {
        backgroundColor: 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))',
        iconColor: 'var(--orca-color-primary, #165DFF)',
        title: '取消仅块引用区块背景色'
      },
      inactive: {
        backgroundColor: 'transparent',
        iconColor: 'var(--orca-color-text-secondary, #666)',
        title: '设置仅块引用区块背景色'
      }
    };

    // 按钮图标：高亮状态显示"填充方块"，未高亮显示"空心方块"
    const iconSvg = this.state.isHighlighted ? `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity="0.8"/>
      </svg>
    ` : `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;

    // 创建按钮
    this.buttonEl = createToolbarButton(
      buttonConfig,
      styleConfig,
      this.state.isHighlighted,
      iconSvg,
      () => this.toggleHighlightState()
    );

    // 使用按钮管理器注册按钮
    if (this.buttonManager) {
      this.buttonManager.registerButton(
        this.config.buttonId,
        this.buttonEl,
        5, // 优先级：仅块引用背景色高亮按钮
        'queryBlockHighlightToggle',
        () => {
          // 按钮添加到DOM后更新样式
          this.updateButtonStyle();
        },
        (newButton: HTMLButtonElement) => {
          // 重新绑定点击事件
          newButton.addEventListener('click', () => this.toggleHighlightState());
          console.log('🔧 查询块高亮切换插件：重新绑定点击事件');
        }
      );
    } else {
      console.warn('🔧 查询块高亮切换插件：按钮管理器不可用');
    }
  }

  /**
   * 更新按钮图标
   */
  private updateButtonIcon(): void {
    if (!this.buttonEl) return;

    // 根据当前状态设置正确的图标
    const iconSvg = this.state.isHighlighted ? `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#666" opacity="0.8"/>
      </svg>
    ` : `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#666" stroke-width="2"/>
      </svg>
    `;

    this.buttonEl.innerHTML = iconSvg;
  }

  /**
   * 更新按钮样式：根据状态切换颜色和背景
   */
  private updateButtonStyle(): void {
    // 更新所有同名按钮
    const buttons = document.querySelectorAll(`#${this.config.buttonId}`);
    buttons.forEach(button => {
      if (!(button instanceof HTMLElement)) return;

      // 先更新图标，确保图标内容正确
      this.updateButtonIconForButton(button);

      // 使用 setTimeout 确保 DOM 更新后再应用样式
      setTimeout(() => {
        const rects = button.querySelectorAll('svg rect');
        
        if (this.state.isHighlighted) {
          button.style.backgroundColor = 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))';
          rects.forEach(rect => {
            rect.setAttribute('fill', 'var(--orca-color-primary, #165DFF)');
            rect.setAttribute('opacity', '0.8');
          });
          button.title = '取消仅块引用区块背景色';
        } else {
          button.style.backgroundColor = 'transparent';
          rects.forEach(rect => {
            rect.setAttribute('stroke', 'var(--orca-color-text-secondary, #666)');
            rect.removeAttribute('fill');
            rect.removeAttribute('opacity');
          });
          button.title = '设置仅块引用区块背景色';
        }
      }, 0);
    });
  }

  /**
   * 为指定按钮更新图标
   */
  private updateButtonIconForButton(button: HTMLElement): void {
    // 根据当前状态设置正确的图标
    if (this.state.isHighlighted) {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity="0.8"/>
        </svg>
      `;
    } else {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
    }
  }

  /**
   * 设置区块观察者：监听折叠状态和子内容变化，实时更新背景色
   */
  private setupBlockObserver(activePanel: Element): void {
    // 断开之前的观察者，避免内存泄漏
    disconnectObserver(this.state.blockObserver);

    // 创建新的区块观察者
    this.state.blockObserver = createBlockObserver(
      activePanel,
      () => {
        // 高亮状态下才更新背景色
        if (this.state.isHighlighted) {
          this.highlightMatchingBlocks();
        }
      }
    );
  }

  /**
   * 设置主观察者（已禁用，由 ToolbarButtonManager 统一管理）
   */
  private setupMainObserver(): void {
    console.log('🔧 查询块高亮切换插件：主观察者已禁用，由按钮管理器统一管理');
  }
}
