/**
 * 查询视图切换插件核心功能模块
 */

import type { 
  QueryViewToggleState, 
  QueryViewToggleAPI, 
  QueryViewTogglePlugin,
  CrossTabMessage 
} from '../../types';
import { 
  QUERY_VIEW_TOGGLE_CONFIG, 
  CSS_SELECTORS, 
  STYLE_ELEMENT_ID, 
  BROADCAST_CHANNEL_NAME,
  DEFAULT_STATE 
} from '../../constants';

/**
 * 查询视图切换插件类
 */
export class QueryViewTogglePluginImpl implements QueryViewTogglePlugin {
  private state: QueryViewToggleState;
  private config = QUERY_VIEW_TOGGLE_CONFIG;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.state = { ...DEFAULT_STATE };
  }

  /**
   * 初始化插件
   */
  public initialize(): void {
    if (this.state.isInitialized) return;

    this.initState();
    this.registerOrcaCommand();
    this.setupCrossTabListener();
    this.setupMutationObserver();
    this.updateStyleElement();

    this.state.isInitialized = true;
    console.log('✅ W95 查询视图切换插件已初始化');
  }

  /**
   * 销毁插件
   */
  public destroy(): void {
    if (!this.state.isInitialized) return;

    // 清理样式元素
    if (this.state.styleElement) {
      this.state.styleElement.remove();
      this.state.styleElement = null;
    }

    // 断开 DOM 观察者
    if (this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
    }

    // 关闭跨标签页通信
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // 注销 Orca 命令
    this.unregisterOrcaCommand();

    // 重置状态
    this.state = { ...DEFAULT_STATE };
    console.log('✅ W95 查询视图切换插件已销毁');
  }

  /**
   * 获取公共 API
   */
  public getAPI(): QueryViewToggleAPI {
    return {
      toggle: (blockId: string) => this.toggleView(blockId),
      show: (blockId: string) => this.showView(blockId),
      hide: (blockId: string) => this.hideView(blockId),
      getState: (blockId: string) => this.getViewState(blockId),
      destroy: () => this.destroy()
    };
  }

  /**
   * 初始化状态
   */
  private initState(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          this.state.hiddenIds = parsed;
        } else {
          console.warn('检测到无效的状态格式，已重置为默认值');
          this.state.hiddenIds = {};
          localStorage.setItem(this.config.storageKey, JSON.stringify(this.state.hiddenIds));
        }
      }
    } catch (e) {
      console.error('状态初始化失败，已重置:', e);
      this.state.hiddenIds = {};
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.state.hiddenIds));
    }
  }

  /**
   * 切换指定面板的查询视图显示/隐藏状态
   */
  private toggleView(blockId: string): void {
    if (!blockId) {
      console.error('缺少有效的面板ID');
      return;
    }

    this.state.hiddenIds[blockId] = !this.state.hiddenIds[blockId];
    this.persistState();
    this.applyViewState(blockId);
    this.showFeedback(blockId);
  }

  /**
   * 显示指定面板的查询视图
   */
  private showView(blockId: string): void {
    if (blockId) {
      this.state.hiddenIds[blockId] = false;
      this.persistState();
      this.applyViewState(blockId);
    }
  }

  /**
   * 隐藏指定面板的查询视图
   */
  private hideView(blockId: string): void {
    if (blockId) {
      this.state.hiddenIds[blockId] = true;
      this.persistState();
      this.applyViewState(blockId);
    }
  }

  /**
   * 获取指定面板的状态
   */
  private getViewState(blockId: string): boolean {
    return blockId ? this.state.hiddenIds[blockId] || false : false;
  }

  /**
   * 持久化状态
   */
  private persistState(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.state.hiddenIds));
      this.broadcastState();
    } catch (e) {
      console.error('状态保存失败:', e);
    }
  }

  /**
   * 应用视图状态
   */
  private applyViewState(blockId: string): void {
    this.updateStyleElement();
  }

  /**
   * 创建/更新样式元素
   */
  private updateStyleElement(): void {
    if (!this.state.styleElement) {
      this.state.styleElement = document.createElement('style');
      this.state.styleElement.id = STYLE_ELEMENT_ID;
      document.head.appendChild(this.state.styleElement);
    }

    let styleContent = '';
    Object.entries(this.state.hiddenIds).forEach(([blockId, isHidden]) => {
      if (isHidden) {
        styleContent += `
          .orca-block-editor[data-block-id="${blockId}"] ${CSS_SELECTORS.QUERY_TABS_CONTAINER},
          .orca-block-editor[data-block-id="${blockId}"] ${CSS_SELECTORS.QUERY_VIEWS} {
            display: none !important;
          }
        `;
      }
    });
    this.state.styleElement.textContent = styleContent;
  }

  /**
   * 显示反馈通知
   */
  private showFeedback(blockId: string): void {
    const status = this.state.hiddenIds[blockId] ? '隐藏' : '显示';
    const message = `面板 [${blockId}] 查询视图已${status}`;
    console.log(message);
    
    // Orca 没有 notifications.show API，只通过控制台输出
  }

  /**
   * 跨标签页广播状态
   */
  private broadcastState(): void {
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({
        type: 'stateUpdate',
        hiddenIds: this.state.hiddenIds
      } as CrossTabMessage);
      channel.close();
    }
  }

  /**
   * 设置跨标签页监听
   */
  private setupCrossTabListener(): void {
    if (window.BroadcastChannel) {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.broadcastChannel.addEventListener('message', (event) => {
        if (event.data.type === 'stateUpdate' && typeof event.data.hiddenIds === 'object') {
          this.state.hiddenIds = event.data.hiddenIds;
          this.updateStyleElement();
        }
      });
    }
  }

  /**
   * 设置 DOM 变化观察者
   */
  private setupMutationObserver(): void {
    if (this.state.observer) this.state.observer.disconnect();
    
    this.state.observer = new MutationObserver((mutations) => {
      const hasBlockChange = mutations.some(mutation => 
        Array.from(mutation.addedNodes).some(node => 
          (node as Element).classList?.contains('orca-block-editor') || 
          (node as Element).querySelector?.('.orca-block-editor')
        ) || Array.from(mutation.removedNodes).some(node => 
          (node as Element).classList?.contains('orca-block-editor')
        )
      );

      if (hasBlockChange) {
        this.updateStyleElement();
      }
    });
    
    this.state.observer.observe(document.body, this.config.observerOptions);
  }

  /**
   * 注册 Orca 命令
   */
  private registerOrcaCommand(): void {
    if (!window.orca || !orca.commands) return;
    
    try {
      const fullCommandId = `${this.config.id}.${this.config.command}`;
      
      // 先注销已有命令
      if (typeof orca.commands.unregisterCommand === 'function') {
        orca.commands.unregisterCommand(fullCommandId);
      }

      // 注册新命令
      if (typeof orca.commands.registerCommand === 'function') {
        orca.commands.registerCommand(
          fullCommandId,
          () => {
            const activeBlock = document.querySelector(CSS_SELECTORS.ACTIVE_BLOCK) as HTMLElement;
            const blockId = activeBlock?.dataset.blockId;
            if (blockId) {
              this.toggleView(blockId);
            } else {
              console.warn('未找到激活的面板');
            }
          },
          '切换当前面板查询视图显示状态'
        );
      }
      
      // 绑定快捷键（使用空字符串来移除快捷键）
      if (typeof orca.shortcuts?.assign === 'function') {
        orca.shortcuts.assign('', fullCommandId); // 先移除
        orca.shortcuts.assign(this.config.defaultShortcut, fullCommandId);
      }
    } catch (error) {
      console.error('Orca集成失败:', error);
    }
  }

  /**
   * 注销 Orca 命令
   */
  private unregisterOrcaCommand(): void {
    if (!window.orca || !orca.commands) return;
    
    try {
      const fullCommandId = `${this.config.id}.${this.config.command}`;
      
      if (typeof orca.commands.unregisterCommand === 'function') {
        orca.commands.unregisterCommand(fullCommandId);
      }

      // 移除快捷键（使用空字符串）
      if (typeof orca.shortcuts?.assign === 'function') {
        orca.shortcuts.assign('', fullCommandId);
      }
    } catch (error) {
      console.error('Orca命令注销失败:', error);
    }
  }
}
