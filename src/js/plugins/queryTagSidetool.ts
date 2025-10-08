import React from 'react';
import type { 
  QueryTagToggleAPI, 
  QueryTagTogglePlugin 
} from '../../types';
import { 
  QUERY_TAG_TOGGLE_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class QueryTagSidetoolImpl implements QueryTagTogglePlugin {
  private state = {
    isHidden: false,
    isInitialized: false
  };
  private config = QUERY_TAG_TOGGLE_CONFIG;
  private persistenceManager: PersistenceManager | null = null;
  private reactiveState: any;
  private styleElement: HTMLStyleElement | null = null;

  constructor(pluginName?: string) {
    this.persistenceManager = pluginName ? createPersistenceManager(pluginName) : null;
    this.reactiveState = window.Valtio.proxy({ isHidden: false });
  }

  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;
    await this.initState();
    if (this.state.isHidden) {
      this.hideTag();
    }
    this.state.isInitialized = true;
    console.log('✅ W95 查询标签切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    this.showTag();
    this.state.isHidden = false;
    this.state.isInitialized = false;
    console.log('✅ W95 查询标签切换插件已销毁');
  }

  public getAPI(): QueryTagToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showTag(),
      hide: () => this.hideTag(),
      getState: () => this.state.isHidden,
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const QueryTagButton = () => {
      const snap = useSnapshot(this.reactiveState);
      
      const getIcon = (isHidden: boolean) => {
        return React.createElement('i', {
          className: isHidden ? 'ti ti-square-filled' : 'ti ti-square'
        });
      };
      
      return React.createElement(Tooltip, {
        text: snap.isHidden ? "显示标签：空" : "隐藏标签：空",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isHidden ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, getIcon(snap.isHidden))
      });
    };
    
    return React.createElement(QueryTagButton);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isHidden = await this.persistenceManager.loadState('queryTagHidden', false);
      } else {
        this.state.isHidden = false;
      }
      this.reactiveState.isHidden = this.state.isHidden;
    } catch (e) {
      console.error('[QueryTagSidetool] 状态加载失败:', e);
      this.state.isHidden = false;
      this.reactiveState.isHidden = false;
    }
  }

  private async toggleState(): Promise<void> {
    if (this.state.isHidden) {
      await this.showTag();
    } else {
      await this.hideTag();
    }
  }

  private async hideTag(): Promise<void> {
    if (this.state.isHidden) return;
    this.state.isHidden = true;
    this.reactiveState.isHidden = true;
    this.applyHideTagStyle();
    await this.saveState();
    console.log('✅ 查询标签已隐藏（空标签）');
  }

  private async showTag(): Promise<void> {
    if (!this.state.isHidden) return;
    this.state.isHidden = false;
    this.reactiveState.isHidden = false;
    this.removeHideTagStyle();
    await this.saveState();
    console.log('✅ 查询标签已显示（空标签）');
  }

  private applyHideTagStyle(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'w95-query-tag-toggle-style';
      document.head.appendChild(this.styleElement);
    }
    
    this.styleElement.textContent = `
      .orca-query-list-block:not(:has(.orca-repr-main.orca-repr-main-collapsed)):not(:has(.orca-repr-children > *:not(:empty))):has(.orca-tag[data-name="空"]) {
        display: none !important;
      }
    `;
  }

  private removeHideTagStyle(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('queryTagHidden', this.state.isHidden);
      }
    } catch (e) {
      console.error('[QueryTagSidetool] 状态保存失败:', e);
    }
  }
}

