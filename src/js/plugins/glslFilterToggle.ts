/**
 * GLSL滤镜切换模块
 * - 提供多种预设滤镜效果
 * - 循环切换滤镜，状态持久化
 * - 使用CSS滤镜实现视觉效果
 */

import type { 
  GlslFilterToggleAPI, 
  GlslFilterTogglePlugin, 
  GlslFilterToggleState 
} from '../../types';
import { GLSL_FILTER_TOGGLE_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class GlslFilterTogglePluginImpl implements GlslFilterTogglePlugin {
  private config = GLSL_FILTER_TOGGLE_CONFIG;
  private state: GlslFilterToggleState;
  private buttonManager?: ToolbarButtonManager;
  private persistenceManager: PersistenceManager;
  private buttonEl: HTMLButtonElement | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor(buttonManager?: ToolbarButtonManager, pluginName?: string) {
    this.buttonManager = buttonManager;
    this.state = {
      currentFilterIndex: 0,
      isEnabled: false,
      retryCount: 0,
      isInitialized: false
    };
    
    this.persistenceManager = createPersistenceManager(pluginName || 'glslFilterToggle');
  }

  async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    try {
      // 恢复保存的状态
      await this.loadState();
      
      // 创建按钮
      this.createButton();
      
      // 应用当前滤镜
      if (this.state.isEnabled) {
        this.applyCurrentFilter();
      }
      
      this.state.isInitialized = true;
      console.log('GLSL滤镜切换插件初始化完成');
    } catch (error) {
      console.error('GLSL滤镜切换插件初始化失败:', error);
    }
  }

  destroy(): void {
    // 移除按钮
    if (this.buttonEl) {
      this.buttonEl.remove();
      this.buttonEl = null;
    }
    
    // 移除样式
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    
    // 重置状态
    this.state.isInitialized = false;
  }

  getAPI(): GlslFilterToggleAPI {
    return {
      toggle: () => this.toggleState(),
      nextFilter: () => this.nextFilter(),
      previousFilter: () => this.previousFilter(),
      setFilter: (index: number) => this.setFilter(index),
      getCurrentFilter: () => this.getCurrentFilter(),
      isEnabled: () => this.state.isEnabled,
      destroy: () => this.destroy()
    };
  }

  /**
   * 切换滤镜开关
   */
  private async toggleState(): Promise<void> {
    this.state.isEnabled = !this.state.isEnabled;
    
    if (this.state.isEnabled) {
      this.applyCurrentFilter();
    } else {
      this.removeFilter();
    }
    
    this.updateButtonStyle();
    await this.saveState();
  }

  /**
   * 下一个滤镜
   */
  private async nextFilter(): Promise<void> {
    this.state.currentFilterIndex = (this.state.currentFilterIndex + 1) % this.config.filters.length;
    
    if (this.state.isEnabled) {
      this.applyCurrentFilter();
    }
    
    this.updateButtonStyle();
    await this.saveState();
  }

  /**
   * 上一个滤镜
   */
  private async previousFilter(): Promise<void> {
    this.state.currentFilterIndex = this.state.currentFilterIndex === 0 
      ? this.config.filters.length - 1 
      : this.state.currentFilterIndex - 1;
    
    if (this.state.isEnabled) {
      this.applyCurrentFilter();
    }
    
    this.updateButtonStyle();
    await this.saveState();
  }

  /**
   * 设置指定滤镜
   */
  private async setFilter(index: number): Promise<void> {
    if (index >= 0 && index < this.config.filters.length) {
      this.state.currentFilterIndex = index;
      
      if (this.state.isEnabled) {
        this.applyCurrentFilter();
      }
      
      this.updateButtonStyle();
      await this.saveState();
    }
  }

  /**
   * 获取当前滤镜
   */
  private getCurrentFilter(): string {
    return this.config.filters[this.state.currentFilterIndex].name;
  }

  /**
   * 应用当前滤镜
   */
  private applyCurrentFilter(): void {
    const filter = this.config.filters[this.state.currentFilterIndex];
    
    // 移除旧样式
    if (this.styleElement) {
      this.styleElement.remove();
    }
    
    // 创建新样式
    this.styleElement = document.createElement('style');
    this.styleElement.id = this.config.styleId;
    this.styleElement.textContent = `
      ${this.config.targetSelector} {
        filter: ${filter.cssFilter} !important;
        transition: filter 0.3s ease !important;
      }
    `;
    
    document.head.appendChild(this.styleElement);
    console.log(`应用滤镜: ${filter.name}`);
  }

  /**
   * 移除滤镜
   */
  private removeFilter(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    console.log('移除滤镜');
  }

  /**
   * 创建按钮
   */
  private createButton(): void {
    // 移除旧按钮
    const oldButton = document.getElementById(this.config.buttonId);
    if (oldButton) oldButton.remove();

    // 创建按钮元素
    const button = document.createElement('button');
    button.id = this.config.buttonId;
    button.title = this.getButtonTitle();
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
    button.style.outline = 'none';
    button.style.boxSizing = 'border-box';

    // 设置按钮内容
    button.innerHTML = `<i class="${this.getButtonIcon()}" style="font-size: 14px;"></i>`;

    // 添加点击事件
    button.addEventListener('click', () => this.toggleState());

    // 注册按钮
    if (this.buttonManager) {
      this.buttonManager.registerButton(
        this.config.buttonId,
        button,
        11, // 优先级：GLSL滤镜切换按钮
        'glslFilterToggle',
        () => {
          this.buttonEl = button;
          this.updateButtonStyle();
        }
      );
    } else {
      console.warn('按钮管理器未初始化，无法注册GLSL滤镜切换按钮');
    }
  }

  /**
   * 获取按钮图标
   */
  private getButtonIcon(): string {
    if (!this.state.isEnabled) {
      return 'ti ti-photo-off';
    }
    
    const filter = this.config.filters[this.state.currentFilterIndex];
    return filter.icon || 'ti ti-photo';
  }

  /**
   * 获取按钮标题
   */
  private getButtonTitle(): string {
    if (!this.state.isEnabled) {
      return 'GLSL滤镜 (关闭)';
    }
    
    const filter = this.config.filters[this.state.currentFilterIndex];
    return `GLSL滤镜: ${filter.name}`;
  }

  /**
   * 更新按钮样式
   */
  private updateButtonStyle(): void {
    if (!this.buttonEl) return;
    
    const isActive = this.state.isEnabled;
    this.buttonEl.style.backgroundColor = isActive ? '#4CAF50' : 'transparent';
    this.buttonEl.style.color = isActive ? '#ffffff' : '#666666';
    this.buttonEl.title = this.getButtonTitle();
    
    // 更新图标
    this.buttonEl.innerHTML = `<i class="${this.getButtonIcon()}" style="font-size: 14px;"></i>`;
  }

  /**
   * 保存状态
   */
  private async saveState(): Promise<void> {
    try {
      await this.persistenceManager.saveState(this.config.storageKey, {
        isEnabled: this.state.isEnabled,
        currentFilterIndex: this.state.currentFilterIndex
      });
    } catch (error) {
      console.error('保存GLSL滤镜状态失败:', error);
    }
  }

  /**
   * 加载状态
   */
  private async loadState(): Promise<void> {
    try {
      const savedState = await this.persistenceManager.loadState(this.config.storageKey);
      if (savedState) {
        this.state.isEnabled = savedState.isEnabled || false;
        this.state.currentFilterIndex = savedState.currentFilterIndex || 0;
      }
    } catch (error) {
      console.error('加载GLSL滤镜状态失败:', error);
    }
  }
}
