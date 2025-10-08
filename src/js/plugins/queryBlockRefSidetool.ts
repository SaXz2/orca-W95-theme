import React from 'react';
import type { 
  QueryBlockRefToggleAPI, 
  QueryBlockRefTogglePlugin 
} from '../../types';
import { 
  QUERY_BLOCK_REF_TOGGLE_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class QueryBlockRefSidetoolImpl implements QueryBlockRefTogglePlugin {
  private state = {
    isHidden: false,
    isInitialized: false
  };
  private config = QUERY_BLOCK_REF_TOGGLE_CONFIG;
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
      this.hideRef();
    }
    this.state.isInitialized = true;
    console.log('✅ W95 查询块引用切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    this.showRef();
    this.state.isHidden = false;
    this.state.isInitialized = false;
    console.log('✅ W95 查询块引用切换插件已销毁');
  }

  public getAPI(): QueryBlockRefToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showRef(),
      hide: () => this.hideRef(),
      getState: () => this.state.isHidden,
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const QueryBlockRefButton = () => {
      const snap = useSnapshot(this.reactiveState);
      
      const getIcon = (isHidden: boolean) => {
        return React.createElement('i', {
          className: isHidden ? 'ti ti-square-filled' : 'ti ti-square'
        });
      };
      
      return React.createElement(Tooltip, {
        text: snap.isHidden ? "显示块引用" : "隐藏块引用",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isHidden ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, getIcon(snap.isHidden))
      });
    };
    
    return React.createElement(QueryBlockRefButton);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isHidden = await this.persistenceManager.loadState('queryBlockRefHidden', false);
      } else {
        this.state.isHidden = false;
      }
      this.reactiveState.isHidden = this.state.isHidden;
    } catch (e) {
      console.error('[QueryBlockRefSidetool] 状态加载失败:', e);
      this.state.isHidden = false;
      this.reactiveState.isHidden = false;
    }
  }

  private async toggleState(): Promise<void> {
    if (this.state.isHidden) {
      await this.showRef();
    } else {
      await this.hideRef();
    }
  }

  private async hideRef(): Promise<void> {
    if (this.state.isHidden) return;
    this.state.isHidden = true;
    this.reactiveState.isHidden = true;
    this.applyHideRefStyle();
    await this.saveState();
    console.log('✅ 查询块引用已隐藏');
  }

  private async showRef(): Promise<void> {
    if (!this.state.isHidden) return;
    this.state.isHidden = false;
    this.reactiveState.isHidden = false;
    this.removeHideRefStyle();
    await this.saveState();
    console.log('✅ 查询块引用已显示');
  }

  private applyHideRefStyle(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'w95-query-block-ref-toggle-style';
      document.head.appendChild(this.styleElement);
    }
    
    this.styleElement.textContent = `
      .orca-query-list-block:not(:has(.orca-repr-main.orca-repr-main-collapsed)):not(:has(.orca-repr-children > *:not(:empty))):has(.orca-repr-main-content.orca-repr-text-content > .orca-none-selectable:first-child + .orca-inline[data-type="r"] + .orca-none-selectable:last-child) {
        display: none !important;
      }
    `;
  }

  private removeHideRefStyle(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('queryBlockRefHidden', this.state.isHidden);
      }
    } catch (e) {
      console.error('[QueryBlockRefSidetool] 状态保存失败:', e);
    }
  }
}

