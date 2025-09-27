/**
 * GLSL滤镜切换模块
 * - 使用WebGL渲染真正的GLSL滤镜效果
 * - 右键菜单选择GLSL文件
 * - 动态读取glsl文件夹中的文件
 */

import type { 
  GlslFilterToggleAPI, 
  GlslFilterTogglePlugin, 
  GlslFilterToggleState 
} from '../../types';
import { GLSL_FILTER_TOGGLE_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';
import { GlslRenderer } from '../utils/glslRenderer';
import { GlslFileManager, type GlslFileInfo } from '../utils/glslFileManager';

export class GlslFilterTogglePluginImpl implements GlslFilterTogglePlugin {
  private config = GLSL_FILTER_TOGGLE_CONFIG;
  private state: GlslFilterToggleState;
  private buttonManager?: ToolbarButtonManager;
  private persistenceManager: PersistenceManager;
  private buttonEl: HTMLButtonElement | null = null;
  private renderer: GlslRenderer;
  private fileManager: GlslFileManager;
  private currentFile: GlslFileInfo | null = null;
  private animationFrame: number | null = null;

  constructor(buttonManager?: ToolbarButtonManager, pluginName?: string) {
    this.buttonManager = buttonManager;
    this.state = {
      currentFilterIndex: 0,
      isEnabled: false,
      retryCount: 0,
      isInitialized: false
    };
    
    this.persistenceManager = createPersistenceManager(pluginName || 'glslFilterToggle');
    this.renderer = new GlslRenderer();
    this.fileManager = new GlslFileManager();
  }

  async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    try {
      // 初始化文件管理器
      await this.fileManager.initialize();
      
      // 初始化渲染器
      this.renderer.initialize();
      
      // 恢复保存的状态
      await this.loadState();
      
      // 创建按钮
      this.createButton();
      
      // 应用当前滤镜
      if (this.state.isEnabled) {
        await this.applyCurrentFilter();
      }
      
      this.state.isInitialized = true;
      console.log('GLSL滤镜切换插件初始化完成');
    } catch (error) {
      console.error('GLSL滤镜切换插件初始化失败:', error);
    }
  }

  destroy(): void {
    // 停止动画
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // 移除按钮
    if (this.buttonEl) {
      this.buttonEl.remove();
      this.buttonEl = null;
    }
    
    // 销毁渲染器
    this.renderer.destroy();
    
    // 销毁文件管理器
    this.fileManager.destroy();
    
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
      await this.applyCurrentFilter();
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
    const files = this.fileManager.getFileList();
    if (files.length === 0) return;
    
    this.state.currentFilterIndex = (this.state.currentFilterIndex + 1) % files.length;
    
    if (this.state.isEnabled) {
      await this.applyCurrentFilter();
    }
    
    this.updateButtonStyle();
    await this.saveState();
  }

  /**
   * 上一个滤镜
   */
  private async previousFilter(): Promise<void> {
    const files = this.fileManager.getFileList();
    if (files.length === 0) return;
    
    this.state.currentFilterIndex = this.state.currentFilterIndex === 0 
      ? files.length - 1 
      : this.state.currentFilterIndex - 1;
    
    if (this.state.isEnabled) {
      await this.applyCurrentFilter();
    }
    
    this.updateButtonStyle();
    await this.saveState();
  }

  /**
   * 设置指定滤镜
   */
  private async setFilter(index: number): Promise<void> {
    const files = this.fileManager.getFileList();
    if (index >= 0 && index < files.length) {
      this.state.currentFilterIndex = index;
      
      if (this.state.isEnabled) {
        await this.applyCurrentFilter();
      }
      
      this.updateButtonStyle();
      await this.saveState();
    }
  }

  /**
   * 获取当前滤镜
   */
  private getCurrentFilter(): string {
    const files = this.fileManager.getFileList();
    if (files.length === 0) return '无滤镜';
    
    const file = files[this.state.currentFilterIndex];
    return file ? file.name : '无滤镜';
  }

  /**
   * 应用当前滤镜
   */
  private async applyCurrentFilter(): Promise<void> {
    const files = this.fileManager.getFileList();
    if (files.length === 0) return;
    
    const file = files[this.state.currentFilterIndex];
    if (!file) return;
    
    try {
      // 编译着色器
      this.renderer.compileShader(file.content);
      
      // 显示渲染器
      this.renderer.show();
      
      // 开始渲染循环
      this.startRenderLoop();
      
      this.currentFile = file;
      console.log(`应用GLSL滤镜: ${file.name}`);
    } catch (error) {
      console.error(`应用GLSL滤镜失败: ${file.name}`, error);
    }
  }

  /**
   * 移除滤镜
   */
  private removeFilter(): void {
    // 停止渲染循环
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // 隐藏渲染器
    this.renderer.hide();
    
    this.currentFile = null;
    console.log('移除GLSL滤镜');
  }

  /**
   * 开始渲染循环
   */
  private startRenderLoop(): void {
    const render = () => {
      this.renderer.render();
      this.animationFrame = requestAnimationFrame(render);
    };
    
    render();
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

    // 添加点击事件（循环切换）
    button.addEventListener('click', () => this.toggleState());

    // 添加右键菜单
    button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, button);
    });

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
   * 显示右键菜单
   */
  private showContextMenu(event: MouseEvent, button: HTMLButtonElement): void {
    const files = this.fileManager.getFileList();
    if (files.length === 0) return;

    // 创建菜单元素
    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.backgroundColor = '#2d2d2d';
    menu.style.border = '1px solid #555';
    menu.style.borderRadius = '4px';
    menu.style.padding = '4px 0';
    menu.style.zIndex = '10000';
    menu.style.minWidth = '200px';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

    // 添加菜单项
    files.forEach((file, index) => {
      const item = document.createElement('div');
      item.style.padding = '8px 16px';
      item.style.cursor = 'pointer';
      item.style.color = '#fff';
      item.style.fontSize = '14px';
      item.style.borderBottom = '1px solid #444';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      
      if (index === this.state.currentFilterIndex) {
        item.style.backgroundColor = '#4CAF50';
      }
      
      item.innerHTML = `
        <span>${file.name}</span>
        <span style="font-size: 12px; color: #999;">${file.description || ''}</span>
      `;
      
      item.addEventListener('click', () => {
        this.setFilter(index);
        document.body.removeChild(menu);
      });
      
      item.addEventListener('mouseenter', () => {
        if (index !== this.state.currentFilterIndex) {
          item.style.backgroundColor = '#444';
        }
      });
      
      item.addEventListener('mouseleave', () => {
        if (index !== this.state.currentFilterIndex) {
          item.style.backgroundColor = 'transparent';
        }
      });
      
      menu.appendChild(item);
    });

    // 添加关闭选项
    const closeItem = document.createElement('div');
    closeItem.style.padding = '8px 16px';
    closeItem.style.cursor = 'pointer';
    closeItem.style.color = '#fff';
    closeItem.style.fontSize = '14px';
    closeItem.style.borderTop = '1px solid #444';
    closeItem.innerHTML = '<span>关闭滤镜</span>';
    
    closeItem.addEventListener('click', () => {
      this.removeFilter();
      this.state.isEnabled = false;
      this.updateButtonStyle();
      this.saveState();
      document.body.removeChild(menu);
    });
    
    closeItem.addEventListener('mouseenter', () => {
      closeItem.style.backgroundColor = '#444';
    });
    
    closeItem.addEventListener('mouseleave', () => {
      closeItem.style.backgroundColor = 'transparent';
    });
    
    menu.appendChild(closeItem);

    // 添加到页面
    document.body.appendChild(menu);

    // 点击外部关闭菜单
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  /**
   * 获取按钮图标
   */
  private getButtonIcon(): string {
    if (!this.state.isEnabled) {
      return 'ti ti-photo-off';
    }
    
    return 'ti ti-photo';
  }

  /**
   * 获取按钮标题
   */
  private getButtonTitle(): string {
    if (!this.state.isEnabled) {
      return 'GLSL滤镜 (关闭)';
    }
    
    const currentFilter = this.getCurrentFilter();
    return `GLSL滤镜: ${currentFilter}`;
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
