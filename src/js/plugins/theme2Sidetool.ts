import React from 'react';
import type { 
  Theme2ToggleAPI, 
  Theme2TogglePlugin 
} from '../../types';
import { 
  THEME2_TOGGLE_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

// 模块作用域变量
let currentPluginName = '';
const THEME_CSS_ID_PREFIX = 'css-injector-';
let isThemeCurrentlyActive = false;
let themeToggleCommandId = '';
let absoluteCssPath = '';

// Helper 函数
function getDomElements() {
  const head = document.head || document.getElementsByTagName('head')[0];
  const body = document.body || document.getElementsByTagName('body')[0];
  return { head, body };
}

// 内部 CSS 加载逻辑
function applyThemeStylesInternal() {
  if (!currentPluginName) {
    console.warn('applyThemeStylesInternal called but currentPluginName is not set.');
    return;
  }
  try {
    const { head } = getDomElements();

    if (head) {
      const linkId = THEME_CSS_ID_PREFIX + currentPluginName;
      if (document.getElementById(linkId)) {
        console.log(`Plugin '${currentPluginName}': Theme CSS link already exists (ID: ${linkId}).`);
        isThemeCurrentlyActive = true;
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = absoluteCssPath;
      link.id = linkId;

      link.onload = () => {
        console.log(`Plugin '${currentPluginName}': CSS loaded successfully.`);
        isThemeCurrentlyActive = true;
        window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
          detail: { isActive: true } 
        }));
      };
      link.onerror = () => {
        console.error(`Plugin '${currentPluginName}': Failed to load CSS from ${absoluteCssPath}.`);
        isThemeCurrentlyActive = false;
        window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
          detail: { isActive: false } 
        }));
      };

      head.appendChild(link);
      console.log(`Plugin '${currentPluginName}': Custom CSS link created with ID '${link.id}'. Path: ${absoluteCssPath}`);
    } else {
      console.error(`Plugin '${currentPluginName}': Could not find document head to inject CSS.`);
      isThemeCurrentlyActive = false;
    }
  } catch (e) {
    console.error(`Plugin '${currentPluginName}': Error applying theme styles.`, e);
    isThemeCurrentlyActive = false;
  }
}

// 内部 CSS 卸载逻辑
function removeThemeStylesInternal() {
  if (!currentPluginName) {
    console.warn('removeThemeStylesInternal called but currentPluginName is not set.');
    return;
  }
  try {
    const linkId = THEME_CSS_ID_PREFIX + currentPluginName;
    const themeLinkElement = document.getElementById(linkId);
    if (themeLinkElement) {
      themeLinkElement.remove();
      isThemeCurrentlyActive = false;
      console.log(`Plugin '${currentPluginName}': Custom CSS unloaded by removing element with ID '${linkId}'.`);
      window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
        detail: { isActive: false } 
      }));
    } else {
      isThemeCurrentlyActive = false;
      console.warn(`Plugin '${currentPluginName}': No custom CSS link found to unload (expected ID: '${linkId}'). Current state set to inactive.`);
      window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
        detail: { isActive: false } 
      }));
    }
  } catch (e) {
    console.error(`Plugin '${currentPluginName}': Error removing theme styles.`, e);
    isThemeCurrentlyActive = false;
    window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
      detail: { isActive: false } 
    }));
  }
}

// 切换主题的命令执行函数
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
  
  window.dispatchEvent(new CustomEvent('theme2StateChanged', { 
    detail: { isActive: isThemeCurrentlyActive } 
  }));
}

export class Theme2SidetoolImpl implements Theme2TogglePlugin {
  private state = {
    isThemeLoaded: false,
    isInitialized: false
  };
  private config = THEME2_TOGGLE_CONFIG;
  private persistenceManager: PersistenceManager | null = null;
  private reactiveState: any;
  private pluginName: string = '';
  private stateChangeHandler: ((event: Event) => void) | null = null;

  constructor(pluginName?: string) {
    if (pluginName) {
      this.pluginName = pluginName;
      currentPluginName = pluginName;
      themeToggleCommandId = `${pluginName}.toggleTheme2`;
    }
    this.persistenceManager = pluginName ? createPersistenceManager(pluginName) : null;
    this.reactiveState = window.Valtio.proxy({ isThemeLoaded: false });
  }

  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    // 设置CSS路径
    try {
      const cssUrl = new URL('./css/theme2.css', import.meta.url);
      absoluteCssPath = cssUrl.href;
      console.log(`[Theme2Toggle] CSS URL resolved to: ${absoluteCssPath}`);
    } catch (e) {
      absoluteCssPath = `local:///${this.pluginName}/css/theme2.css`;
      console.log(`[Theme2Toggle] Using fallback CSS path: ${absoluteCssPath}`);
    }
    
    console.log(`Plugin '${currentPluginName}' LOADED. Command '${themeToggleCommandId}' will be registered.`);

    // 注册Orca命令
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
    
    // 如果状态为true，加载主题
    if (this.state.isThemeLoaded) {
      console.log('[Theme2Toggle] 检测到已保存的主题2状态，正在恢复...');
      applyThemeStylesInternal();
      isThemeCurrentlyActive = true;
    } else {
      isThemeCurrentlyActive = false;
    }
    
    // 监听主题状态变化事件
    this.stateChangeHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.isActive === 'boolean') {
        this.state.isThemeLoaded = customEvent.detail.isActive;
        this.reactiveState.isThemeLoaded = customEvent.detail.isActive;
        // 自动保存状态
        this.saveState();
      }
    };
    window.addEventListener('theme2StateChanged', this.stateChangeHandler);
    
    this.state.isInitialized = true;
    console.log(`Theme active state after initial load: ${isThemeCurrentlyActive}`);
    console.log('✅ W95 主题2切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    
    console.log(`Plugin '${currentPluginName}' UNLOADING...`);

    // 注销命令
    try {
      const unregisterCommand = window.orca?.commands?.unregisterCommand;
      if (unregisterCommand && themeToggleCommandId) {
        unregisterCommand(themeToggleCommandId);
        console.log(`Plugin '${this.pluginName}': Command '${themeToggleCommandId}' unregistered.`);
      }
    } catch (e) {
      console.error(`Plugin '${this.pluginName}': Error unregistering command '${themeToggleCommandId}'.`, e);
    }

    // 移除事件监听
    if (this.stateChangeHandler) {
      window.removeEventListener('theme2StateChanged', this.stateChangeHandler);
      this.stateChangeHandler = null;
    }

    // 移除主题样式
    removeThemeStylesInternal();
    
    this.state.isThemeLoaded = false;
    this.state.isInitialized = false;
    console.log('✅ W95 主题2切换插件已销毁');
  }

  public getAPI(): Theme2ToggleAPI {
    return {
      toggle: () => this.toggleTheme(),
      loadTheme: () => this.applyThemeStyles(),
      removeTheme: () => this.removeThemeStyles(),
      getState: () => this.state.isThemeLoaded,
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const Theme2Button = () => {
      const snap = useSnapshot(this.reactiveState);
      
      const getIcon = () => {
        return React.createElement('i', {
          className: 'ti ti-a-b-2'
        });
      };
      
      return React.createElement(Tooltip, {
        text: snap.isThemeLoaded ? "切换回默认主题" : "应用主题2",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isThemeLoaded ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleTheme()
        }, getIcon())
      });
    };
    
    return React.createElement(Theme2Button);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isThemeLoaded = await this.persistenceManager.loadState('theme2Loaded', false);
      } else {
        this.state.isThemeLoaded = false;
      }
      this.reactiveState.isThemeLoaded = this.state.isThemeLoaded;
      isThemeCurrentlyActive = this.state.isThemeLoaded;
    } catch (e) {
      console.error('[Theme2Sidetool] 状态加载失败:', e);
      this.state.isThemeLoaded = false;
      this.reactiveState.isThemeLoaded = false;
      isThemeCurrentlyActive = false;
    }
  }

  private async toggleTheme(): Promise<void> {
    if (this.state.isThemeLoaded) {
      await this.removeThemeStyles();
    } else {
      await this.applyThemeStyles();
    }
  }

  private async applyThemeStyles(): Promise<void> {
    applyThemeStylesInternal();
    // 状态会通过事件监听器自动更新
  }

  private async removeThemeStyles(): Promise<void> {
    removeThemeStylesInternal();
    // 状态会通过事件监听器自动更新
  }

  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('theme2Loaded', this.state.isThemeLoaded);
      }
    } catch (e) {
      console.error('[Theme2Sidetool] 状态保存失败:', e);
    }
  }
}
