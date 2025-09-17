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

  constructor(
    private retryInterval: number = 300,
    private maxRetries: number = 30,
    private toolbarSelector: string = '.orca-block-editor-sidetools',
    private targetPanelSelector: string = '.orca-panel.active'
  ) {}

  /**
   * 注册按钮
   */
  registerButton(
    id: string, 
    button: HTMLButtonElement, 
    priority: number, 
    pluginName: string,
    onButtonAdded?: () => void
  ): void {
    this.registeredButtons.set(id, {
      id,
      button,
      priority,
      pluginName,
      onButtonAdded
    });

    // 如果已经初始化，立即尝试添加按钮
    if (this.isInitialized) {
      this.tryAddAllButtons();
      // 按钮添加完成后触发回调
      if (onButtonAdded) {
        setTimeout(onButtonAdded, 0);
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
   * 初始化按钮管理器
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.isInitialized = true;
    // 如果有已注册的按钮，立即尝试添加
    if (this.registeredButtons.size > 0) {
      this.tryAddAllButtons();
    }
  }

  /**
   * 销毁按钮管理器
   */
  destroy(): void {
    this.isInitialized = false;
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    // 移除所有按钮
    this.registeredButtons.forEach(registration => {
      registration.button.remove();
    });
    this.registeredButtons.clear();
  }

  /**
   * 尝试添加所有按钮到工具栏
   */
  private tryAddAllButtons(): void {
    const activePanel = document.querySelector(this.targetPanelSelector);
    if (!activePanel) {
      this.scheduleRetry();
      return;
    }

    const toolbar = activePanel.querySelector(this.toolbarSelector);
    if (!toolbar) {
      this.scheduleRetry();
      return;
    }

    // 按优先级排序按钮
    const sortedButtons = Array.from(this.registeredButtons.values())
      .sort((a, b) => a.priority - b.priority);

    // 添加所有按钮
    const addedCallbacks: (() => void)[] = [];
    
    for (const registration of sortedButtons) {
      if (!toolbar.contains(registration.button)) {
        toolbar.appendChild(registration.button);
        // 收集新添加按钮的回调
        if (registration.onButtonAdded) {
          addedCallbacks.push(registration.onButtonAdded);
        }
      }
    }

    this.retryCount = 0;
    console.log('✅ 所有工具栏按钮已按顺序添加');
    
    // 为新添加的按钮执行回调
    addedCallbacks.forEach(callback => {
      setTimeout(callback, 0);
    });
  }

  /**
   * 安排重试
   */
  private scheduleRetry(): void {
    if (this.retryCount >= this.maxRetries) {
      console.warn('无法添加工具栏按钮：超过最大重试次数');
      return;
    }

    this.retryCount++;
    this.retryTimer = window.setTimeout(() => {
      this.tryAddAllButtons();
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
}
