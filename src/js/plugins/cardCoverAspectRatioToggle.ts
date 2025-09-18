/**
 * 卡片封面比例切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过CSS控制卡片封面比例
 * - 支持三种状态：11:16竖版、16:9横版、禁用比例控制
 * - 支持自定义比例设置：右键点击按钮弹出设置窗口
 */

import type { 
  CardCoverAspectRatioAPI, 
  CardCoverAspectRatioPlugin, 
  CardCoverAspectRatioState,
  AspectRatioState
} from '../../types';
import { CARD_COVER_ASPECT_RATIO_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';

export class CardCoverAspectRatioTogglePluginImpl implements CardCoverAspectRatioPlugin {
  private state: CardCoverAspectRatioState = {
    currentState: 0,
    retryCount: 0,
    observer: null,
    isInitialized: false,
    customRatios: [],
    settingsModalOpen: false
  };

  private config = CARD_COVER_ASPECT_RATIO_CONFIG;
  private buttonEl: HTMLButtonElement | null = null;
  private buttonManager: ToolbarButtonManager | null = null;

  constructor(buttonManager?: ToolbarButtonManager) {
    this.buttonManager = buttonManager || null;
  }

  public initialize(): void {
    if (this.state.isInitialized) return;

    this.initState();
    this.loadCustomRatios(); // 加载自定义比例
    this.createButton();
    
    // 根据保存的状态应用功能
    this.applyAspectRatioStyle();
    
    this.setupObserver();

    this.state.isInitialized = true;
    console.log('✅ W95 卡片封面比例切换模块已初始化');
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
    this.removeAspectRatioStyle();

    this.state.isInitialized = false;
    console.log('✅ W95 卡片封面比例切换模块已销毁');
  }

  public getAPI(): CardCoverAspectRatioAPI {
    return {
      toggle: () => this.toggleState(),
      setState: (state: number) => this.setState(state),
      getState: () => this.state.currentState,
      getCurrentRatio: () => this.getCurrentRatio(),
      openSettings: () => this.openSettingsModal(),
      destroy: () => this.destroy()
    };
  }

  /**
   * 打开设置窗口
   */
  private openSettingsModal(): void {
    if (this.state.settingsModalOpen) return;
    
    // 创建设置窗口
    const modal = this.createSettingsModal();
    document.body.appendChild(modal);
    
    this.state.settingsModalOpen = true;
    
    // 加载保存的自定义比例
    this.loadCustomRatios();
    this.renderCustomRatiosList();
  }
  
  /**
   * 创建设置窗口
   */
  private createSettingsModal(): HTMLElement {
    // 创建模态窗口容器
    const modal = document.createElement('div');
    modal.id = 'w95-card-cover-ratio-settings-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    // 创建模态窗口内容
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background-color: var(--orca-color-bg-1, #fff);
      border-radius: 8px;
      padding: 16px;
      width: 320px;
      max-width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    // 创建标题
    const title = document.createElement('h3');
    title.textContent = '卡片封面比例设置';
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 18px;
      color: var(--orca-color-text-0, #333);
    `;
    
    // 创建说明文本
    const description = document.createElement('p');
    description.textContent = '添加自定义宽高比，格式为"宽 / 高"（例如：16 / 9）';
    description.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 14px;
      color: var(--orca-color-text-2, #666);
    `;
    
    // 创建输入区域 - 优化版布局
    const inputGroup = document.createElement('div');
    inputGroup.style.cssText = `
      display: grid;
      grid-template-columns: minmax(80px, 1fr) minmax(80px, 1fr) auto;
      gap: 8px;
      margin-bottom: 16px;
      align-items: center;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    `;
    
    // 宽度输入框
    const widthInput = document.createElement('input');
    widthInput.type = 'number';
    widthInput.min = '1';
    widthInput.placeholder = '宽';
    widthInput.id = 'w95-ratio-width-input';
    widthInput.style.cssText = `
      padding: 8px;
      border: 1px solid var(--orca-color-border-1, #ddd);
      border-radius: 4px;
      font-size: 14px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    `;
    
    // 高度输入框
    const heightInput = document.createElement('input');
    heightInput.type = 'number';
    heightInput.min = '1';
    heightInput.placeholder = '高';
    heightInput.id = 'w95-ratio-height-input';
    heightInput.style.cssText = `
      padding: 8px;
      border: 1px solid var(--orca-color-border-1, #ddd);
      border-radius: 4px;
      font-size: 14px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    `;
    
    // 添加按钮
    const addButton = document.createElement('button');
    addButton.textContent = '添加';
    addButton.style.cssText = `
      padding: 8px 16px;
      background-color: var(--orca-color-primary, #165DFF);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
    `;
    
    // 添加自定义比例的点击事件
    addButton.addEventListener('click', () => {
      const width = widthInput.value.trim();
      const height = heightInput.value.trim();
      
      if (width && height && parseInt(width) > 0 && parseInt(height) > 0) {
        this.addCustomRatio(parseInt(width), parseInt(height));
        widthInput.value = '';
        heightInput.value = '';
      }
    });
    
    // 组装输入区域
    inputGroup.appendChild(widthInput);
    inputGroup.appendChild(heightInput);
    inputGroup.appendChild(addButton);
    
    // 添加比例说明
    const ratioHint = document.createElement('div');
    ratioHint.textContent = '输入宽度和高度值设置比例 (如: 16 和 9 表示 16:9)';
    ratioHint.style.cssText = `
      grid-column: 1 / -1;
      font-size: 12px;
      color: var(--orca-color-text-2, #666);
      margin-top: -8px;
      margin-bottom: 8px;
    `;
    inputGroup.appendChild(ratioHint);
    
    // 创建自定义比例列表容器
    const listContainer = document.createElement('div');
    listContainer.id = 'w95-custom-ratios-list';
    listContainer.style.cssText = `
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid var(--orca-color-border-1, #ddd);
      border-radius: 4px;
      margin-bottom: 16px;
      padding: 8px;
    `;
    
    // 创建按钮组
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    `;
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.cssText = `
      padding: 8px 16px;
      background-color: var(--orca-color-bg-2, #f5f5f5);
      color: var(--orca-color-text-1, #333);
      border: 1px solid var(--orca-color-border-1, #ddd);
      border-radius: 4px;
      cursor: pointer;
    `;
    
    const saveButton = document.createElement('button');
    saveButton.textContent = '保存';
    saveButton.style.cssText = `
      padding: 8px 16px;
      background-color: var(--orca-color-primary, #165DFF);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    
    // 添加取消按钮点击事件
    cancelButton.addEventListener('click', () => {
      this.closeSettingsModal();
    });
    
    // 添加保存按钮点击事件
    saveButton.addEventListener('click', () => {
      this.saveCustomRatios();
      this.closeSettingsModal();
    });
    
    buttonGroup.appendChild(cancelButton);
    buttonGroup.appendChild(saveButton);
    
    // 组装模态窗口
    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(inputGroup);
    modalContent.appendChild(listContainer);
    modalContent.appendChild(buttonGroup);
    
    modal.appendChild(modalContent);
    
    // 点击模态窗口背景关闭窗口
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeSettingsModal();
      }
    });
    
    return modal;
  }
  
  /**
   * 关闭设置窗口
   */
  private closeSettingsModal(): void {
    const modal = document.getElementById('w95-card-cover-ratio-settings-modal');
    if (modal) {
      modal.remove();
    }
    this.state.settingsModalOpen = false;
  }
  
  /**
   * 添加自定义比例
   */
  private addCustomRatio(width: number, height: number): void {
    if (!this.state.customRatios) {
      this.state.customRatios = [];
    }
    
    // 创建新的比例对象
    const newRatio: AspectRatioState = {
      ratio: `${width} / ${height}`,
      icon: width > height ? 'landscape' : 'portrait',
      title: `自定义比例 ${width}:${height}`
    };
    
    // 添加到自定义比例列表
    this.state.customRatios.push(newRatio);
    
    // 更新列表显示
    this.renderCustomRatiosList();
  }
  
  /**
   * 渲染自定义比例列表
   */
  private renderCustomRatiosList(): void {
    const listContainer = document.getElementById('w95-custom-ratios-list');
    if (!listContainer) return;
    
    // 清空列表
    listContainer.innerHTML = '';
    
    // 如果没有自定义比例，显示提示信息
    if (!this.state.customRatios || this.state.customRatios.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = '暂无自定义比例';
      emptyMessage.style.cssText = `
        padding: 16px;
        text-align: center;
        color: var(--orca-color-text-3, #999);
      `;
      listContainer.appendChild(emptyMessage);
      return;
    }
    
    // 创建列表项
    this.state.customRatios.forEach((ratio, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid var(--orca-color-border-1, #ddd);
        &:last-child {
          border-bottom: none;
        }
      `;
      
      // 比例信息
      const ratioInfo = document.createElement('div');
      ratioInfo.textContent = ratio.title;
      
      // 操作按钮组
      const actions = document.createElement('div');
      actions.style.cssText = `
        display: flex;
        gap: 8px;
      `;
      
      // 应用按钮
      const applyButton = document.createElement('button');
      applyButton.textContent = '应用';
      applyButton.style.cssText = `
        padding: 4px 8px;
        background-color: var(--orca-color-primary-light, rgba(22, 93, 255, 0.1));
        color: var(--orca-color-primary, #165DFF);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;
      
      // 删除按钮
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '删除';
      deleteButton.style.cssText = `
        padding: 4px 8px;
        background-color: var(--orca-color-danger-light, rgba(245, 63, 63, 0.1));
        color: var(--orca-color-danger, #F53F3F);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;
      
      // 添加应用按钮点击事件
      applyButton.addEventListener('click', () => {
        this.applyCustomRatio(index);
      });
      
      // 添加删除按钮点击事件
      deleteButton.addEventListener('click', () => {
        this.deleteCustomRatio(index);
      });
      
      actions.appendChild(applyButton);
      actions.appendChild(deleteButton);
      
      item.appendChild(ratioInfo);
      item.appendChild(actions);
      
      listContainer.appendChild(item);
    });
  }
  
  /**
   * 应用自定义比例
   */
  private applyCustomRatio(index: number): void {
    if (!this.state.customRatios || index >= this.state.customRatios.length) return;
    
    // 获取自定义比例
    const customRatio = this.state.customRatios[index];
    
    // 应用自定义比例
    let style = document.getElementById(this.config.styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = this.config.styleId;
      document.head.appendChild(style);
    }
    
    style.textContent = `
      .orca-query-card-cover {
        aspect-ratio: ${customRatio.ratio} !important;
      }
    `;
    
    // 更新按钮样式为激活状态
    const button = document.getElementById(this.config.buttonId);
    if (button) {
      button.style.backgroundColor = 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))';
      button.style.opacity = '1';
      const paths = button.querySelectorAll('svg path');
      paths.forEach(path => {
        path.setAttribute('fill', 'var(--orca-color-primary, #165DFF)');
      });
      
      // 更新按钮标题
      button.title = customRatio.title;
    }
  }
  
  /**
   * 删除自定义比例
   */
  private deleteCustomRatio(index: number): void {
    if (!this.state.customRatios || index >= this.state.customRatios.length) return;
    
    // 从列表中删除
    this.state.customRatios.splice(index, 1);
    
    // 更新列表显示
    this.renderCustomRatiosList();
  }
  
  /**
   * 加载保存的自定义比例
   */
  private loadCustomRatios(): void {
    try {
      const stored = localStorage.getItem(`${this.config.storageKey}_custom`);
      if (stored) {
        this.state.customRatios = JSON.parse(stored);
      } else {
        this.state.customRatios = [];
      }
    } catch (e) {
      console.error('加载自定义比例失败:', e);
      this.state.customRatios = [];
    }
  }
  
  /**
   * 保存自定义比例到本地存储
   */
  private saveCustomRatios(): void {
    try {
      localStorage.setItem(
        `${this.config.storageKey}_custom`, 
        JSON.stringify(this.state.customRatios || [])
      );
    } catch (e) {
      console.error('保存自定义比例失败:', e);
    }
  }

  /**
   * 初始化状态
   */
  private initState(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      this.state.currentState = stored ? parseInt(stored, 10) : 0;
      // 确保状态在有效范围内
      if (this.state.currentState < 0 || this.state.currentState >= this.config.states.length) {
        this.state.currentState = 0;
      }
    } catch (e) {
      console.error('状态初始化失败:', e);
      this.state.currentState = 0;
    }
  }

  /**
   * 切换状态
   */
  private toggleState(): void {
    // 循环切换状态：0 → 1 → 2 → 0...
    this.state.currentState = (this.state.currentState + 1) % this.config.states.length;
    this.updateButtonStyle();
    this.applyAspectRatioStyle();
    this.saveState();
  }

  /**
   * 设置特定状态
   */
  private setState(state: number): void {
    if (state >= 0 && state < this.config.states.length) {
      this.state.currentState = state;
      this.updateButtonStyle();
      this.applyAspectRatioStyle();
      this.saveState();
    }
  }

  /**
   * 获取当前比例
   */
  private getCurrentRatio(): string {
    const currentState = this.config.states[this.state.currentState];
    return currentState.ratio;
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
   * 应用比例样式
   */
  private applyAspectRatioStyle(): void {
    let style = document.getElementById(this.config.styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = this.config.styleId;
      document.head.appendChild(style);
    }
    
    // 仅在非禁用状态下应用比例
    const ratio = this.state.currentState < 2 ? this.config.states[this.state.currentState].ratio : 'auto';
    style.textContent = `
      .orca-query-card-cover {
        aspect-ratio: ${ratio} !important;
      }
    `;
  }

  /**
   * 移除比例样式
   */
  private removeAspectRatioStyle(): void {
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
    button.title = this.config.states[this.state.currentState].title;
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

    // 左键点击切换状态
    button.addEventListener('click', () => this.toggleState());
    
    // 右键点击打开设置窗口
    button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openSettingsModal();
    });

    // 使用按钮管理器注册按钮
    if (this.buttonManager) {
      this.buttonManager.registerButton(
        this.config.buttonId,
        button,
        9, // 优先级：卡片封面比例切换按钮
        'cardCoverAspectRatioToggle',
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
          this.applyAspectRatioStyle();
          this.updateButtonStyle();
          return;
        }
      }

      // 重试逻辑
      if (this.state.retryCount < this.config.maxRetries) {
        this.state.retryCount++;
        setTimeout(() => this.createButton(), this.config.retryInterval);
      } else {
        console.warn('无法添加卡片封面比例切换按钮：超过最大重试次数');
      }
    }
  }

  /**
   * 更新按钮图标
   */
  private updateButtonIcon(button: HTMLButtonElement): void {
    const current = this.config.states[this.state.currentState];
    
    // 根据当前状态设置不同图标
    switch(current.icon) {
      case 'portrait': // 11:16 竖版
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3H20V21H4V3ZM19 19H5V5H19V19Z" fill="#666"/>
            <path d="M8 7H16V11H8V7Z" fill="#666"/>
          </svg>
        `;
        break;
      case 'landscape': // 16:9 横版
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3H20V21H4V3ZM19 19H5V5H19V19Z" fill="#666"/>
            <path d="M7 8H17V10H7V8Z" fill="#666"/>
          </svg>
        `;
        break;
      case 'disabled': // 禁用状态
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3H20V21H4V3ZM19 19H5V5H19V19Z" fill="#999"/>
            <path d="M15 8L9 16" stroke="#999" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
        break;
    }
  }

  /**
   * 更新按钮样式
   */
  private updateButtonStyle(): void {
    const button = document.getElementById(this.config.buttonId);
    if (!button) return;

    const paths = button.querySelectorAll('svg path');
    const current = this.config.states[this.state.currentState];
    
    // 更新按钮标题
    button.title = current.title;
    
    // 更新按钮样式
    if (current.icon === 'disabled') {
      // 禁用状态样式
      button.style.backgroundColor = 'transparent';
      button.style.opacity = '0.6';
      paths.forEach(path => {
        path.setAttribute('fill', '#999');
      });
    } else {
      // 激活状态样式
      button.style.backgroundColor = 'var(--orca-color-primary-light, rgba(22, 93, 255, 0.15))';
      button.style.opacity = '1';
      paths.forEach(path => {
        path.setAttribute('fill', 'var(--orca-color-primary, #165DFF)');
      });
    }
    
    // 更新图标
    this.updateButtonIcon(button as HTMLButtonElement);
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
}
