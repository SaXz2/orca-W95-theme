/**
 * 按钮工具函数
 * 提供通用的按钮创建和样式设置功能
 */

export interface ButtonConfig {
  id: string;
  title: string;
  width?: string;
  height?: string;
  margin?: string;
  padding?: string;
  borderRadius?: string;
  backgroundColor?: string;
  cursor?: string;
  display?: string;
  alignItems?: string;
  justifyContent?: string;
  transition?: string;
}

export interface ButtonStyleConfig {
  active: {
    backgroundColor: string;
    iconColor: string;
    title: string;
  };
  inactive: {
    backgroundColor: string;
    iconColor: string;
    title: string;
  };
}

/**
 * 创建工具栏按钮
 */
export function createToolbarButton(
  config: ButtonConfig,
  styleConfig: ButtonStyleConfig,
  isActive: boolean,
  iconSvg: string,
  onClick: () => void
): HTMLButtonElement {
  // 移除旧按钮，避免重复
  const oldButton = document.getElementById(config.id);
  if (oldButton) oldButton.remove();

  // 创建新按钮
  const button = document.createElement('button');
  button.id = config.id;
  button.title = isActive ? styleConfig.active.title : styleConfig.inactive.title;
  
  // 设置基础样式
  button.style.width = config.width || '24px';
  button.style.height = config.height || '24px';
  button.style.margin = config.margin || '5px 8px';
  button.style.padding = config.padding || '0';
  button.style.border = 'none';
  button.style.borderRadius = config.borderRadius || '3px';
  button.style.backgroundColor = isActive ? styleConfig.active.backgroundColor : styleConfig.inactive.backgroundColor;
  button.style.cursor = config.cursor || 'pointer';
  button.style.display = config.display || 'flex';
  button.style.alignItems = config.alignItems || 'center';
  button.style.justifyContent = config.justifyContent || 'center';
  button.style.transition = config.transition || 'all 0.2s ease';

  // 设置图标
  button.innerHTML = iconSvg;

  // 绑定点击事件
  button.addEventListener('click', onClick);

  return button;
}

/**
 * 更新按钮样式
 */
export function updateButtonStyle(
  button: HTMLButtonElement,
  styleConfig: ButtonStyleConfig,
  isActive: boolean
): void {
  if (!button) return;

  const svgElements = button.querySelectorAll('svg');
  if (isActive) {
    // 激活状态
    button.style.backgroundColor = styleConfig.active.backgroundColor;
    svgElements.forEach(svg => svg.setAttribute('color', styleConfig.active.iconColor));
    button.title = styleConfig.active.title;
  } else {
    // 非激活状态
    button.style.backgroundColor = styleConfig.inactive.backgroundColor;
    svgElements.forEach(svg => svg.setAttribute('color', styleConfig.inactive.iconColor));
    button.title = styleConfig.inactive.title;
  }
}

/**
 * 将按钮添加到工具栏
 */
export function addButtonToToolbar(
  button: HTMLButtonElement,
  toolbarSelector: string,
  targetPanelSelector: string
): boolean {
  const activePanel = document.querySelector(targetPanelSelector);
  if (activePanel) {
    const toolbar = activePanel.querySelector(toolbarSelector);
    if (toolbar) {
      toolbar.appendChild(button);
      return true;
    }
  }
  return false;
}

/**
 * 创建重试机制
 */
export function createRetryMechanism(
  action: () => boolean,
  retryInterval: number,
  maxRetries: number,
  onMaxRetriesReached?: () => void
): void {
  let retryCount = 0;

  const retry = () => {
    if (action()) {
      return; // 成功，停止重试
    }

    if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(retry, retryInterval);
    } else {
      onMaxRetriesReached?.();
    }
  };

  retry();
}

/**
 * 按钮注册信息接口
 */
export interface ButtonRegistration {
  id: string;
  button: HTMLButtonElement;
  priority: number; // 优先级，数字越小越靠前
  pluginName: string;
  onButtonAdded?: () => void; // 按钮添加完成后的回调
  onButtonRebind?: (newButton: HTMLButtonElement) => void; // 按钮重新绑定事件回调
}

/**
 * 统一工具栏按钮管理器
 * 负责管理所有插件的按钮添加顺序，避免竞态条件
 */
export class ToolbarButtonManager {
  private registeredButtons: Map<string, ButtonRegistration> = new Map();
  private isInitialized = false;
  private retryCount = 0;
  private retryTimer: number | null = null;
  private debounceTimer: number | null = null;
  private addButtonsTimer: number | null = null;
  private panelObserver: MutationObserver | null = null;
  private lastActivePanelId: string | null = null;
  private processedToolbars: Set<string> = new Set(); // 跟踪已处理的工具栏
  private isAddingButtons = false; // 防止添加按钮时触发观察者
  private lastRefreshTime = 0; // 最后刷新时间

  constructor(
    private retryInterval: number = 300,
    private maxRetries: number = 30,
    private toolbarSelector: string = '.orca-block-editor-sidetools',
    private targetPanelSelector: string = '.orca-hideable:not(.orca-hideable-hidden)',
    private debounceDelay: number = 100
  ) {}

  /**
   * 注册按钮
   */
  registerButton(
    id: string, 
    button: HTMLButtonElement, 
    priority: number, 
    pluginName: string,
    onButtonAdded?: () => void,
    onButtonRebind?: (newButton: HTMLButtonElement) => void
  ): void {
    console.log(`📝 注册按钮: ${id} (插件: ${pluginName}, 优先级: ${priority})`);
    
    this.registeredButtons.set(id, {
      id,
      button,
      priority,
      pluginName,
      onButtonAdded,
      onButtonRebind
    });

    // 如果已经初始化，使用防抖逻辑尝试添加按钮
    if (this.isInitialized) {
      this.debouncedTryAddAllButtons();
      
      // 按钮添加完成后触发回调（延迟执行，确保按钮已添加）
      if (onButtonAdded) {
        setTimeout(onButtonAdded, this.debounceDelay + 50);
      }
    }
  }

  /**
   * 注销按钮
   */
  unregisterButton(id: string): void {
    const registration = this.registeredButtons.get(id);
    if (registration) {
      registration.button.remove();
      this.registeredButtons.delete(id);
    }
  }

  /**
   * 获取当前激活的面板元素
   * 优先使用 orca.state.activePanel，回退到 CSS 选择器
   */
  private getActivePanel(): Element | null {
    console.log('🔍 开始查找激活面板...');
    
    // 优先使用 orca.state.activePanel API
    if (window.orca?.state?.activePanel) {
      const activePanelId = window.orca.state.activePanel;
      console.log(`🔍 使用 orca.state.activePanel: ${activePanelId}`);
      
      const panel = document.querySelector(`[data-panel-id="${activePanelId}"]`);
      if (panel) {
        console.log('🔍 通过面板ID找到面板:', panel);
        return panel;
      } else {
        console.log('🔍 通过面板ID未找到面板');
      }
    } else {
      console.log('🔍 orca.state.activePanel 不可用');
    }
    
    // 回退到 CSS 选择器 - 优先查找 .orca-panel.active
    const activePanels = document.querySelectorAll('.orca-panel.active');
    console.log(`🔍 找到 ${activePanels.length} 个激活面板`);
    
    for (let i = 0; i < activePanels.length; i++) {
      const panel = activePanels[i];
      // 直接在面板中查找激活的内容容器
      const activeContent = panel.querySelector('.orca-hideable:not(.orca-hideable-hidden)');
      if (activeContent) {
        const toolbar = activeContent.querySelector(this.toolbarSelector);
        if (toolbar) {
          console.log(`🔍 找到激活面板 (激活面板${i}):`, panel);
          return panel;
        }
      }
    }
    
    // 如果没找到激活面板，查找所有 .orca-panel
    const allPanels = document.querySelectorAll('.orca-panel');
    console.log(`🔍 找到 ${allPanels.length} 个面板`);
    
    for (let i = 0; i < allPanels.length; i++) {
      const panel = allPanels[i];
      // 直接在面板中查找激活的内容容器
      const activeContent = panel.querySelector('.orca-hideable:not(.orca-hideable-hidden)');
      if (activeContent) {
        const toolbar = activeContent.querySelector(this.toolbarSelector);
        if (toolbar) {
          console.log(`🔍 找到激活面板 (面板${i}):`, panel);
          return panel;
        }
      }
    }
    
    console.log('🔍 未找到任何激活的面板');
    return null;
  }

  /**
   * 获取当前激活的面板内容容器
   * 查找 .orca-hideable:not(.orca-hideable-hidden) 容器
   */
  private getActivePanelContent(): Element | null {
    console.log('🔍 开始查找激活的面板内容容器...');
    
    // 优先使用 orca.state.activePanel API
    if (window.orca?.state?.activePanel) {
      const activePanelId = window.orca.state.activePanel;
      console.log(`🔍 使用 orca.state.activePanel: ${activePanelId}`);
      
      const panel = document.querySelector(`[data-panel-id="${activePanelId}"]`);
      if (panel) {
        console.log('🔍 找到面板元素:', panel);
        // 在面板内查找激活的内容容器
        const activeContent = panel.querySelector('.orca-hideable:not(.orca-hideable-hidden)');
        if (activeContent) {
          console.log('🔍 在面板内找到激活内容容器:', activeContent);
          return activeContent;
        } else {
          console.log('🔍 面板内未找到激活内容容器');
        }
      } else {
        console.log('🔍 未找到面板元素');
      }
    } else {
      console.log('🔍 orca.state.activePanel 不可用');
    }
    
    // 回退到查找所有 .orca-panel 下的激活内容容器 - 优先查找 .orca-panel.active
    const activePanels = document.querySelectorAll('.orca-panel.active');
    console.log(`🔍 找到 ${activePanels.length} 个激活面板`);
    
    for (let i = 0; i < activePanels.length; i++) {
      const panel = activePanels[i];
      // 直接在面板中查找激活的内容容器
      const activeContent = panel.querySelector('.orca-hideable:not(.orca-hideable-hidden)');
      if (activeContent) {
        const toolbar = activeContent.querySelector(this.toolbarSelector);
        if (toolbar) {
          console.log(`🔍 找到激活内容容器 (激活面板${i}):`, activeContent);
          return activeContent;
        }
      }
    }
    
    // 如果没找到激活面板，查找所有 .orca-panel 下的激活内容容器
    const allPanels = document.querySelectorAll('.orca-panel');
    console.log(`🔍 找到 ${allPanels.length} 个面板`);
    
    for (let i = 0; i < allPanels.length; i++) {
      const panel = allPanels[i];
      // 直接在面板中查找激活的内容容器
      const activeContent = panel.querySelector('.orca-hideable:not(.orca-hideable-hidden)');
      if (activeContent) {
        const toolbar = activeContent.querySelector(this.toolbarSelector);
        if (toolbar) {
          console.log(`🔍 找到激活内容容器 (面板${i}):`, activeContent);
          return activeContent;
        }
      }
    }
    
    console.log('🔍 未找到任何激活的内容容器');
    return null;
  }

  /**
   * 初始化按钮管理器
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('🚀 按钮管理器已经初始化');
      return;
    }

    console.log('🚀 开始初始化按钮管理器...');
    this.isInitialized = true;
    
    // 设置面板切换监听
    this.setupPanelObserver();
    
    // 如果有已注册的按钮，立即尝试添加
    if (this.registeredButtons.size > 0) {
      console.log(`🚀 发现 ${this.registeredButtons.size} 个已注册按钮，立即尝试添加`);
      this.debouncedTryAddAllButtons();
    } else {
      console.log('🚀 没有已注册的按钮');
    }
  }

  /**
   * 销毁按钮管理器
   */
  destroy(): void {
    this.isInitialized = false;
    
    // 清除所有定时器
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.addButtonsTimer !== null) {
      clearTimeout(this.addButtonsTimer);
      this.addButtonsTimer = null;
    }

    // 断开面板观察者
    if (this.panelObserver) {
      this.panelObserver.disconnect();
      this.panelObserver = null;
    }

    // 移除所有按钮
    this.registeredButtons.forEach(registration => {
      registration.button.remove();
    });
    this.registeredButtons.clear();
  }

  /**
   * 使用防抖逻辑尝试添加所有按钮
   */
  private debouncedTryAddAllButtons(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    
    // 减少防抖延迟到 100ms
    this.debounceTimer = window.setTimeout(() => {
      this.tryAddAllButtons();
      this.debounceTimer = null;
    }, 100);
  }

  /**
   * 尝试添加所有按钮到工具栏
   */
  private tryAddAllButtons(): void {
    // 使用防抖逻辑，避免频繁 DOM 操作
    if (this.addButtonsTimer !== null) {
      clearTimeout(this.addButtonsTimer);
    }
    
    this.addButtonsTimer = window.setTimeout(() => {
      // 设置标志，防止观察者触发
      this.isAddingButtons = true;
      
      // 查找所有 .orca-panel 和 .orca-panel.active 下的 .orca-hideable
      const allPanels = document.querySelectorAll('.orca-panel, .orca-panel.active');
      
      let addedToAnyToolbar = false;
      
      // 遍历所有面板
      for (let i = 0; i < allPanels.length; i++) {
        const panel = allPanels[i];
        const hideableElements = panel.querySelectorAll('.orca-hideable');
        
        // 遍历每个 .orca-hideable 元素
        for (let j = 0; j < hideableElements.length; j++) {
          const hideableElement = hideableElements[j];
          const toolbar = hideableElement.querySelector(this.toolbarSelector);
          
          if (toolbar) {
            // 生成工具栏唯一标识
            const toolbarId = `panel${i}-hideable${j}`;
            
            // 检查是否已经处理过这个工具栏
            if (this.processedToolbars.has(toolbarId)) {
              continue;
            }
            
            // 按优先级排序按钮
            const sortedButtons = Array.from(this.registeredButtons.values())
              .sort((a, b) => a.priority - b.priority);

            // 添加所有按钮
            const addedCallbacks: (() => void)[] = [];
            
            for (const registration of sortedButtons) {
              // 检查是否已经存在这个按钮（使用统一ID）
              const existingButton = toolbar.querySelector(`#${registration.id}`);
              if (existingButton) {
                continue;
              }
              
              // 克隆按钮，但保持相同的ID
              let buttonToAdd = registration.button.cloneNode(true) as HTMLButtonElement;
              buttonToAdd.id = registration.id; // 保持相同的ID
              
              // 重新绑定点击事件（cloneNode 不会复制事件监听器）
              // 方法1：复制 onclick 属性
              if (registration.button.onclick) {
                buttonToAdd.onclick = registration.button.onclick;
              }
              
              // 方法2：通过插件回调重新绑定事件
              if (registration.onButtonRebind) {
                try {
                  registration.onButtonRebind(buttonToAdd);
                } catch (error) {
                  console.error(`按钮事件重新绑定失败: ${registration.id}`, error);
                }
              }
              
              toolbar.appendChild(buttonToAdd);
              
              // 收集新添加按钮的回调
              if (registration.onButtonAdded) {
                addedCallbacks.push(registration.onButtonAdded);
              }
            }

            // 标记工具栏为已处理
            this.processedToolbars.add(toolbarId);
            
            addedToAnyToolbar = true;
            
            // 为新添加的按钮执行回调（延迟执行，确保 DOM 已更新）
            if (addedCallbacks.length > 0) {
              setTimeout(() => {
                addedCallbacks.forEach(callback => {
                  try {
                    callback();
                  } catch (error) {
                    console.error('按钮添加回调执行出错:', error);
                  }
                });
              }, 5); // 减少延迟到 5ms
            }
          }
        }
      }
      
      if (!addedToAnyToolbar) {
        this.scheduleRetry();
        return;
      }

      this.retryCount = 0;
      
      // 重置标志
      this.isAddingButtons = false;
      this.addButtonsTimer = null;
    }, 5); // 减少延迟到 5ms
  }

  /**
   * 安排重试
   */
  private scheduleRetry(): void {
    if (this.retryCount >= this.maxRetries) {
      console.warn('无法添加工具栏按钮：超过最大重试次数');
      return;
    }

    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
    }

    this.retryCount++;
    this.retryTimer = window.setTimeout(() => {
      this.tryAddAllButtons();
      this.retryTimer = null;
    }, this.retryInterval);
  }

  /**
   * 获取已注册的按钮数量
   */
  getButtonCount(): number {
    return this.registeredButtons.size;
  }

  /**
   * 检查按钮是否已注册
   */
  hasButton(id: string): boolean {
    return this.registeredButtons.has(id);
  }
  
  /**
   * 设置面板切换观察者
   */
  private setupPanelObserver(): void {
    this.panelObserver = new MutationObserver((mutations) => {
      // 检查面板切换
      const currentActivePanelId = window.orca?.state?.activePanel;
      if (currentActivePanelId && currentActivePanelId !== this.lastActivePanelId) {
        this.lastActivePanelId = currentActivePanelId;
        this.refreshButtons();
        return;
      }
      
      // 检查内容容器的显示/隐藏状态变化
      let hasContentVisibilityChange = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as Element;
          if (target.classList?.contains('orca-hideable')) {
            // 检查是否从隐藏变为显示，或从显示变为隐藏
            const wasHidden = mutation.oldValue?.includes('orca-hideable-hidden') || false;
            const isHidden = target.classList.contains('orca-hideable-hidden');
            
            if (wasHidden !== isHidden) {
              hasContentVisibilityChange = true;
              
              // 如果是从隐藏变为显示，说明这是新激活的面板
              if (wasHidden && !isHidden) {
                this.refreshButtons();
                return;
              }
            }
          }
        }
        
        // 检查 .orca-panel 和 .orca-hideable 的变化
        if (mutation.type === 'childList') {
          const target = mutation.target as Element;
          
          // 只关注真正重要的变化
          if (target.classList?.contains('orca-panel') || 
              target.classList?.contains('orca-hideable')) {
            
            // 检查是否是按钮相关的变化
            const addedNodes = Array.from(mutation.addedNodes);
            const removedNodes = Array.from(mutation.removedNodes);
            
            // 如果只是按钮的添加/移除，忽略
            const isButtonChange = [...addedNodes, ...removedNodes].some(node => 
              node instanceof Element && 
              (node.classList?.contains('orca-block-editor-sidetools') || 
               node.tagName === 'BUTTON' ||
               node.querySelector?.('button'))
            );
            
            if (isButtonChange) {
              return;
            }
            
            this.refreshButtons();
            return;
          }
        }
      });
      
      if (hasContentVisibilityChange) {
        this.refreshButtons();
      }
    });

    // 监听整个文档的变化，特别是 class 属性的变化
    this.panelObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-panel-id'],
      attributeOldValue: true // 重要：记录旧值以检测状态变化
    });
    
    // 添加额外的防抖保护
    let observerDebounceTimer: number | null = null;
    const originalRefreshButtons = this.refreshButtons.bind(this);
    this.refreshButtons = () => {
      if (observerDebounceTimer) {
        clearTimeout(observerDebounceTimer);
      }
      observerDebounceTimer = window.setTimeout(() => {
        originalRefreshButtons();
        observerDebounceTimer = null;
      }, 200); // 减少到 200ms 防抖
    };
  }

  /**
   * 手动触发按钮添加
   * 用于在面板切换时重新添加按钮
   */
  refreshButtons(): void {
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;
    
    // 防止频繁刷新（减少到 500ms）
    if (timeSinceLastRefresh < 500) {
      return;
    }
    
    // 如果正在添加按钮，跳过
    if (this.isAddingButtons) {
      return;
    }
    
    this.lastRefreshTime = now;
    
    if (this.isInitialized) {
      // 清除已处理的工具栏记录，允许重新处理
      this.processedToolbars.clear();
      this.debouncedTryAddAllButtons();
    }
  }
}
