/**
 * 主题2切换模块
 * - 遵循最小可行方案：持久化状态，按钮控制，通过外部CSS文件加载主题
 * - 支持主题2的加载和卸载，状态持久化
 */

import type { 
  Theme2ToggleAPI, 
  Theme2TogglePlugin, 
  Theme2ToggleState 
} from '../../types';
import { THEME2_TOGGLE_CONFIG } from '../../constants';
import type { ToolbarButtonManager } from '../utils/buttonUtils';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';
import { applyButtonStyle } from '../utils/buttonUtils';

// 模块作用域变量（完全仿照参考文件）
let currentPluginName = '';
const THEME_CSS_ID_PREFIX = 'css-injector-';
let isThemeCurrentlyActive = false; // 用于跟踪主题的当前状态
let themeToggleCommandId = '';    // 用于存储命令的ID
let absoluteCssPath = ''; // 缓存 CSS 路径

// --- Helper 函数：获取 DOM 元素，减少重复查询 ---
function getDomElements() {
  const head = document.head || document.getElementsByTagName('head')[0];
  const body = document.body || document.getElementsByTagName('body')[0];
  return { head, body };
}

// --- 内部 CSS 加载逻辑（完全仿照参考文件）---
function applyThemeStylesInternal() {
  if (!currentPluginName) {
    console.warn('applyThemeStylesInternal called but currentPluginName is not set.');
    return;
  }
  try {
    const { head, body } = getDomElements();

    if (head) {
      const linkId = THEME_CSS_ID_PREFIX + currentPluginName;
      if (document.getElementById(linkId)) {
        console.log(`Plugin '${currentPluginName}': Theme CSS link already exists (ID: ${linkId}).`);
        isThemeCurrentlyActive = true; // 确保状态同步
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = absoluteCssPath;
      link.id = linkId;

      // 添加 onload 和 onerror 以确认加载成功
      link.onload = () => {
        console.log(`Plugin '${currentPluginName}': CSS loaded successfully.`);
        isThemeCurrentlyActive = true;
        // 通知所有主题切换插件更新按钮状态
        window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
          detail: { isActive: true } 
        }));
      };
      link.onerror = () => {
        console.error(`Plugin '${currentPluginName}': Failed to load CSS from ${absoluteCssPath}.`);
        isThemeCurrentlyActive = false;
        // 通知所有主题切换插件更新按钮状态
        window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
          detail: { isActive: false } 
        }));
      };

      head.appendChild(link);
      console.log(`Plugin '${currentPluginName}': Custom CSS link created with ID '${link.id}'. Path: ${absoluteCssPath}`);
    } else {
      console.error(`Plugin '${currentPluginName}': Could not find document head to inject CSS.`);
      isThemeCurrentlyActive = false; // 加载失败，状态设为false
    }
  } catch (e) {
    console.error(`Plugin '${currentPluginName}': Error applying theme styles.`, e);
    isThemeCurrentlyActive = false; // 加载失败，状态设为false
  }
}

// --- 内部 CSS 卸载逻辑（完全仿照参考文件）---
function removeThemeStylesInternal() {
  if (!currentPluginName) {
    console.warn('removeThemeStylesInternal called but currentPluginName is not set.');
    return;
  }
  try {
    const { body } = getDomElements();
    const linkId = THEME_CSS_ID_PREFIX + currentPluginName;
    const themeLinkElement = document.getElementById(linkId);
    if (themeLinkElement) {
      themeLinkElement.remove();
      isThemeCurrentlyActive = false;
      console.log(`Plugin '${currentPluginName}': Custom CSS unloaded by removing element with ID '${linkId}'.`);
      // 通知所有主题切换插件更新按钮状态
      window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
        detail: { isActive: false } 
      }));
    } else {
      // 即使没找到元素，也应该将状态视为false，因为我们期望它被移除
      isThemeCurrentlyActive = false;
      console.warn(`Plugin '${currentPluginName}': No custom CSS link found to unload (expected ID: '${linkId}'). Current state set to inactive.`);
      // 通知所有主题切换插件更新按钮状态
      window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
        detail: { isActive: false } 
      }));
    }
  } catch (e) {
    console.error(`Plugin '${currentPluginName}': Error removing theme styles.`, e);
    isThemeCurrentlyActive = false; // 出错时，也认为主题未激活
    // 通知所有主题切换插件更新按钮状态
    window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
      detail: { isActive: false } 
    }));
  }
}

// --- 切换主题的命令执行函数（完全仿照参考文件）---
function toggleThemeCommandExecute() {
  if (!currentPluginName) {
    console.warn('toggleThemeCommandExecute called but currentPluginName is not set.');
    return;
  }
  console.log(`Command '${themeToggleCommandId}' executed. Current theme active state BEFORE toggle: ${isThemeCurrentlyActive}`);
  if (isThemeCurrentlyActive) {
    removeThemeStylesInternal();
  } else {
    applyThemeStylesInternal();
  }
  console.log(`Theme active state AFTER toggle: ${isThemeCurrentlyActive}`);
  
  // 通知所有主题切换插件更新按钮状态
  window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
    detail: { isActive: isThemeCurrentlyActive } 
  }));
}

export class Theme2TogglePluginImpl implements Theme2TogglePlugin {
  private state: Theme2ToggleState = {
    isThemeLoaded: false,
    retryCount: 0,
    observer: null,
    isInitialized: false
  };

  private config = THEME2_TOGGLE_CONFIG;
  private buttonEl: HTMLButtonElement | null = null;
  private buttonManager: ToolbarButtonManager | null = null;
  private pluginName: string = '';
  private persistenceManager: PersistenceManager | null = null;
  private stateChangeHandler: ((event: Event) => void) | null = null;

  constructor(buttonManager?: ToolbarButtonManager, pluginName?: string) {
    this.buttonManager = buttonManager || null;
    this.pluginName = pluginName || '';
    this.persistenceManager = this.pluginName ? createPersistenceManager(this.pluginName) : null;
  }

  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    // 设置全局变量（仿照参考文件）
    currentPluginName = this.pluginName;
    themeToggleCommandId = `${this.pluginName}.toggleTheme2`;
    
    // 设置CSS路径 - 使用多种尝试方式
    const possiblePaths = [
      './css/theme2.css',
      'css/theme2.css', 
      './dist/css/theme2.css',
      'dist/css/theme2.css',
      '/css/theme2.css',
      '/dist/css/theme2.css'
    ];
    
    // 先尝试使用URL解析
    try {
      const cssUrl = new URL('./css/theme2.css', import.meta.url);
      absoluteCssPath = cssUrl.href;
      console.log(`[Theme2Toggle] CSS URL resolved to: ${absoluteCssPath}`);
    } catch (e) {
      // 如果URL解析失败，使用第一个备用路径
      absoluteCssPath = possiblePaths[0];
      console.log(`[Theme2Toggle] Using fallback CSS path: ${absoluteCssPath}`);
    }
    
    console.log(`Plugin '${currentPluginName}' LOADED. Attempting to apply theme by default. Command '${themeToggleCommandId}' will be registered.`);

    // 注册命令（仿照参考文件）
    try {
      const registerCommand = window.orca?.commands?.registerCommand;
      if (registerCommand) {
        registerCommand(themeToggleCommandId, toggleThemeCommandExecute, '启用/关闭主题2');
        console.log(`Plugin '${this.pluginName}': Command '${themeToggleCommandId}' successfully registered.`);
      } else {
        console.warn(`Plugin '${this.pluginName}': orca.commands.registerCommand API not found. Command cannot be registered.`);
      }
    } catch (e) {
      console.error(`Plugin '${this.pluginName}': Error registering command '${themeToggleCommandId}'.`, e);
    }

    // 根据保存的状态加载主题
    await this.initState();
    
    // 创建按钮
    this.createButton();
    
    // 如果状态为true，加载主题
    if (this.state.isThemeLoaded) {
      console.log('[Theme2Toggle] 检测到已保存的主题2状态，正在恢复...');
      applyThemeStylesInternal();
      // 同步全局状态
      isThemeCurrentlyActive = true;
      // 等待CSS加载完成后再更新按钮状态
      setTimeout(() => {
        this.updateButtonStyle();
      }, 100);
    } else {
      // 确保状态一致
      isThemeCurrentlyActive = false;
    }
    
    // 移除旧的观察者，使用按钮管理器统一管理
    // this.setupObserver();
    
    // 监听主题状态变化事件
    this.stateChangeHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.isActive === 'boolean') {
        this.state.isThemeLoaded = customEvent.detail.isActive;
        this.updateButtonStyle();
        // 自动保存状态
        this.saveState();
      }
    };
    window.addEventListener('theme2StateChanged', this.stateChangeHandler);

    this.state.isInitialized = true;
    console.log(`Theme active state after initial load: ${isThemeCurrentlyActive}`);
    console.log('✅ W95 主题2切换模块已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    
    console.log(`Plugin '${currentPluginName}' UNLOADING...`);

    // 1. 注销命令（仿照参考文件）
    try {
      const unregisterCommand = window.orca?.commands?.unregisterCommand;
      if (unregisterCommand && themeToggleCommandId) {
        unregisterCommand(themeToggleCommandId);
        console.log(`Plugin '${currentPluginName}': Command '${themeToggleCommandId}' unregistered.`);
      } else {
        console.warn(`Plugin '${currentPluginName}': Command unregistration API not available or command ID unknown.`);
      }
    } catch (e) {
      console.error(`Plugin '${currentPluginName}': Error unregistering command.`, e);
    }

    // 2. 移除CSS样式
    removeThemeStylesInternal();

    // 3. 移除按钮
    if (this.buttonEl) {
      this.buttonEl.remove();
      this.buttonEl = null;
    }

    // 4. 断开观察者
    if (this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
    }

    // 5. 移除事件监听器
    if (this.stateChangeHandler) {
      window.removeEventListener('theme2StateChanged', this.stateChangeHandler);
      this.stateChangeHandler = null;
    }

    console.log(`Plugin '${currentPluginName}' UNLOADED. Theme state was: ${isThemeCurrentlyActive}`);
    
    // 清理状态变量
    currentPluginName = '';
    isThemeCurrentlyActive = false;
    themeToggleCommandId = '';
    absoluteCssPath = '';
    
    this.state.isInitialized = false;
    console.log('✅ W95 主题2切换模块已销毁');
  }

  public getAPI(): Theme2ToggleAPI {
    return {
      toggle: () => toggleThemeCommandExecute(),
      loadTheme: () => applyThemeStylesInternal(),
      removeTheme: () => removeThemeStylesInternal(),
      getState: () => isThemeCurrentlyActive,
      destroy: () => this.destroy()
    };
  }

  /**
   * 初始化状态
   */
  private async initState(): Promise<void> {
    console.log('[Theme2Toggle] 开始初始化状态...');
    try {
      if (this.persistenceManager) {
        console.log('[Theme2Toggle] 使用Orca API加载状态');
        this.state.isThemeLoaded = await this.persistenceManager.loadState('theme2Loaded', false);
        console.log(`[Theme2Toggle] 从 Orca API 加载状态: ${this.state.isThemeLoaded}`);
      } else {
        // 降级到localStorage
        console.log('[Theme2Toggle] 降级到localStorage');
        const stored = localStorage.getItem(this.config.storageKey);
        this.state.isThemeLoaded = stored === 'true';
        console.log(`[Theme2Toggle] 从 localStorage 加载状态: ${stored} -> ${this.state.isThemeLoaded}`);
      }
    } catch (e) {
      console.error('[Theme2Toggle] 状态初始化失败:', e);
      this.state.isThemeLoaded = false;
    }
  }




  /**
   * 获取内联主题2 CSS（备用方案）
   */
  private getInlineTheme2CSS(): string {
    return `
:root{
@media (prefers-color-scheme: light) {
    --orca-color-menu-highlight: #2a7bb963 ;
    --orca-border-scope: 1px solid #dbd5cb !important;

    .orca-favorites-items {
        font-weight: 600;
    }

    .orca-query-list-block {
        border-radius: 0 !important;
        background: #f3f1ed ;
        border-radius: 10px !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        border: 1px solid #0000002b !important;
    }

    header#headbar {
        background: #e1e1e100 !important;
    }

    .orca-headbar-sidebar-tools {
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
    }

    button.orca-button.plain.orca-headbar-sidebar-toggle {
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
    }

    #sidebar {
        --orca-color-bg-1: #EEE9E2 !important;
        --orca-color-text-1: #222222 !important;
        color: #67635B !important;
    }

    button.orca-button.plain.orca-select-button.orca-repo-switcher-button {
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        border-radius: 10px !important;
        background: #ffffff38 !important;
    }

    .days {
        border-right: 0 !important;
        box-shadow: inset 0 0 75px rgb(165 165 165 / 25%) !important;
        border-radius: 10px !important;
        padding: 9px !important;
        border:none !important;
    }

    .orca-sidebar-tabs {
        margin: 0 calc(-0 * var(--orca-spacing-md)) !important;
        background: none !important;
        border: none !important;
        border-right: none !important;
        box-shadow: none !important;
    }

    .orca-sidebar-tab-options {
        background-color: #F8F8F8 !important;
        border-radius: 10px !important; 
    }

    span.orca-input-input {
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
    }

    .orca-sidebar-create-aliased-btn.orca-button {
        background-color: #F7F7F7 !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        border-radius: 10px !important;
    }

    .orca-fav-item-item:hover .orca-fav-item-icon, .orca-tags-tag-item:hover .orca-tags-tag-icon, .orca-aliased-block-item:hover .orca-aliased-block-icon {
        background-color: hsl(0deg 0% 35% / 9%) !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        border-radius: 0px !important;
        animation: none !important;
    }

    .orca-block-editor {
        border: none !important;
        box-shadow: none !important;
        caret-color: #ff6b6b !important;
    }

    .orca-panel {
        background-color: #f5f1ea2e;
    }
    
    .orca-container ::selection {
        background-color: #995C5C ;
    }

    div#app {
        background-image: radial-gradient(circle, rgba(71, 71, 71, 0.11) 1px, transparent 1px) !important;
        background-size: 25px 25px !important;
        background-color: #e5dccb7a !important;
    }
    
    .orca-menu {
        border-radius: 0 !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        padding: 0 !important;
    }

    .orca-toc {
        border: none !important;
        background: #f7f7f7ab !important;
    }

    .orca-query-result-list-toolbar {
        border-radius: 10px !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        background: #f3f3f38c !important;
        padding-left: 6px !important;
        padding-right: 6px !important;
    }
    
    button.orca-button.soft.orca-query-conditions-reset {
        border-radius: 10px !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
    }

    span.orca-tag-tag {
        font-weight: 600 !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        font-size: 10px !important;
        border-radius: 5px !important;
        background: #ffffff !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        border: var(--orca-border-general) !important;
    }

    .orca-menu {
        padding: var(--orca-spacing-sm) !important;
        border-radius: 10px !important;
    }

    .orca-menu-title {
        border-radius: 10px !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
    }

    .orca-query-card {
        background-color: #F7F7F7 !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        border-radius: 10px !important;
    }

    .orca-segmented:not(.orca-transitioning) .orca-segmented-item.orca-selected {
        background-color: var(--orca-color-bg-1) !important;
        box-shadow: var(--orca-shadow-segmented) !important;
        border-top: none !important;
        border-left: none !important;
        border-right: none !important;
        border-bottom: none !important;
    }

    .orca-menu-item:hover {
        background-color: var(--orca-color-menu-highlight) !important;
    }

    .orca-repo-switcher-selected:hover {
        background-color: var(--orca-color-menu-highlight) !important;
    }

    .orca-menu-text {
        border-radius: 10px !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
    }

    .orca-menu-text:not(.orca-menu-text-disabled):hover {
        background-color: var(--orca-color-menu-highlight) !important;
    }

    #sidebar .orca-button.plain:not(:disabled):active {
        background-color: #f8f8f8ad !important;
        opacity: 0.7 !important;
    }

    .orca-fav-item-icon, .orca-tags-tag-icon, .orca-aliased-block-icon{
        color: #AF8380 !important;
    }

    span.orca-input.orca-tags-list-filter, span.orca-input.orca-aliased-filter {
        border-top: none !important;
    }

    button.orca-button.plain.orca-block-editor-query-add-btn {
        border-radius: 20px !important;
        border-top: none !important;
        border-left: none !important; 
        border-right: none !important; 
        border-bottom: none !important;
        background: #ffffff !important;
    }

    .orca-repr.orca-mirror-bg:before {
        border-radius: 10px;
        border: 1px solid hsl(0deg 0% 0% / 23%);
        background-color: #F3F1ED;
    }

    .highlight {
        background-color: #ce1d1d98;
        color: #ffffff;
        font-weight: 700;
    }
    
    textarea.orca-textarea.orca-tag-data-textarea.orca-tag-data-text-break {
        border-radius: 8px;
    }
    
    span.orca-textarea-input{
        border-radius: 8px; 
    }
    
    .orca-segmented:not(.orca-transitioning) .orca-segmented-item.orca-selected{
        border-radius: 8px !important; 
    }
}
}`;
  }



  /**
   * 保存状态到Orca数据存储
   */
  private async saveState(): Promise<void> {
    // 同步全局状态和实例状态
    this.state.isThemeLoaded = isThemeCurrentlyActive;
    console.log(`[Theme2Toggle] 保存状态: ${this.state.isThemeLoaded}`);
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('theme2Loaded', this.state.isThemeLoaded);
        console.log(`[Theme2Toggle] 状态已保存到Orca API: ${this.state.isThemeLoaded}`);
      } else {
        // 降级到localStorage
        localStorage.setItem(this.config.storageKey, this.state.isThemeLoaded.toString());
        console.log(`[Theme2Toggle] 状态已保存到localStorage: ${this.state.isThemeLoaded}`);
      }
    } catch (e) {
      console.error('[Theme2Toggle] 状态保存失败:', e);
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
    button.title = this.state.isThemeLoaded ? '切换到默认主题' : '切换到主题2';
    button.style.width = '24px';
    button.style.height = '24px';
    button.style.margin = '5px 8px';
    button.style.padding = '0';
    button.style.border = 'none';
    button.style.borderRadius = '3px';
    applyButtonStyle(button, 'inactive');
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.transition = 'all 0.2s ease';

    button.addEventListener('click', async () => {
      // 直接调用全局命令函数
      toggleThemeCommandExecute();
      // 延迟更新按钮状态和保存状态，确保状态已同步
      setTimeout(async () => {
        // 同步状态
        this.state.isThemeLoaded = isThemeCurrentlyActive;
        this.updateButtonStyle();
        await this.saveState();
      }, 50);
    });

    // 使用按钮管理器注册按钮
    if (this.buttonManager) {
      this.buttonEl = button; // 保存按钮引用
      this.buttonManager.registerButton(
        this.config.buttonId,
        button,
        3, // 优先级：主题2切换按钮（调整到标题编号之后）
        'theme2Toggle',
        () => {
          // 按钮添加完成后更新样式
          this.updateButtonStyle();
        },
        (newButton: HTMLButtonElement) => {
          // 重新绑定点击事件
          newButton.addEventListener('click', async () => {
            // 直接调用全局命令函数
            toggleThemeCommandExecute();
            // 延迟更新按钮状态和保存状态，确保状态已同步
            setTimeout(async () => {
              // 同步状态
              this.state.isThemeLoaded = isThemeCurrentlyActive;
              this.updateButtonStyle();
              await this.saveState();
            }, 50);
          });
          console.log('🔧 主题2切换插件：重新绑定点击事件');
        }
      );
    } else {
      console.warn('🔧 主题2切换插件：按钮管理器不可用');
    }
  }

  /**
   * 更新按钮图标
   */
  private updateButtonIcon(button: HTMLButtonElement): void {
    // 优先使用全局状态，如果全局状态未设置则使用实例状态
    const isActive = isThemeCurrentlyActive !== undefined ? isThemeCurrentlyActive : this.state.isThemeLoaded;
    
    if (isActive) {
      // 主题2已加载 - 显示调色板图标（表示可以切换回默认主题）
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1" fill="none"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      `;
    } else {
      // 主题2未加载 - 显示画笔图标（表示可以应用主题2）
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 19l7-7 3 3-7 7-3-3z" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M2 2l7.586 7.586" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="11" cy="11" r="2" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      `;
    }
  }

  /**
   * 更新按钮样式
   */
  private updateButtonStyle(): void {
    // 更新所有同名按钮
    const buttons = document.querySelectorAll(`#${this.config.buttonId}`);
    buttons.forEach(button => {
      if (!(button instanceof HTMLElement)) return;

      // 优先使用全局状态，如果全局状态未设置则使用实例状态
      const isActive = isThemeCurrentlyActive !== undefined ? isThemeCurrentlyActive : this.state.isThemeLoaded;
      
      // 先更新图标，确保图标内容正确
      this.updateButtonIconForButton(button, isActive);
      
      const svgElements = button.querySelectorAll('svg circle, svg line, svg path');
      if (isActive) {
        // 主题2已加载 - 激活状态
        applyButtonStyle(button, 'active');
        button.title = '切换到默认主题';
      } else {
        // 主题2未加载 - 非激活状态
        applyButtonStyle(button, 'inactive');
        button.title = '切换到主题2';
      }
    });
  }

  /**
   * 为指定按钮更新图标
   */
  private updateButtonIconForButton(button: HTMLElement, isActive: boolean): void {
    if (isActive) {
      // 主题2已加载 - 显示调色板图标（表示可以切换回默认主题）
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1" fill="none"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      `;
    } else {
      // 主题2未加载 - 显示画笔图标（表示可以应用主题2）
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 19l7-7 3 3-7 7-3-3z" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M2 2l7.586 7.586" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="11" cy="11" r="2" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      `;
    }
  }

  /**
   * 设置观察者（已禁用，由 ToolbarButtonManager 统一管理）
   */
  private setupObserver(): void {
    console.log('🔧 主题2切换插件：观察者已禁用，由按钮管理器统一管理');
  }
}
