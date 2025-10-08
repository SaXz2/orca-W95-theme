import React from 'react';
import type { 
  ListBreadcrumbToggleAPI, 
  ListBreadcrumbTogglePlugin 
} from '../../types';
import { 
  LIST_BREADCRUMB_TOGGLE_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class ListBreadcrumbSidetoolImpl implements ListBreadcrumbTogglePlugin {
  private state = {
    isHidden: false,
    isInitialized: false
  };
  private config = LIST_BREADCRUMB_TOGGLE_CONFIG;
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
      this.hideBreadcrumbs();
    }
    this.state.isInitialized = true;
    console.log('✅ W95 列表面包屑切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    this.showBreadcrumbs();
    this.state.isHidden = false;
    this.state.isInitialized = false;
    console.log('✅ W95 列表面包屑切换插件已销毁');
  }

  public getAPI(): ListBreadcrumbToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showBreadcrumbs(),
      hide: () => this.hideBreadcrumbs(),
      getState: () => this.state.isHidden,
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const ListBreadcrumbButton = () => {
      const snap = useSnapshot(this.reactiveState);
      
      const getIcon = () => {
        return React.createElement('i', {
          className: 'ti ti-chevron-right'
        });
      };
      
      return React.createElement(Tooltip, {
        text: snap.isHidden ? "显示列表面包屑" : "隐藏列表面包屑",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isHidden ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, getIcon())
      });
    };
    
    return React.createElement(ListBreadcrumbButton);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isHidden = await this.persistenceManager.loadState('listBreadcrumbHidden', false);
      } else {
        this.state.isHidden = false;
      }
      this.reactiveState.isHidden = this.state.isHidden;
    } catch (e) {
      console.error('[ListBreadcrumbSidetool] 状态加载失败:', e);
      this.state.isHidden = false;
      this.reactiveState.isHidden = false;
    }
  }

  private async toggleState(): Promise<void> {
    if (this.state.isHidden) {
      await this.showBreadcrumbs();
    } else {
      await this.hideBreadcrumbs();
    }
  }

  private async hideBreadcrumbs(): Promise<void> {
    if (this.state.isHidden) return;
    this.state.isHidden = true;
    this.reactiveState.isHidden = true;
    this.applyHideStyle();
    await this.saveState();
    console.log('✅ 列表面包屑已隐藏');
  }

  private async showBreadcrumbs(): Promise<void> {
    if (!this.state.isHidden) return;
    this.state.isHidden = false;
    this.reactiveState.isHidden = false;
    this.removeHideStyle();
    await this.saveState();
    console.log('✅ 列表面包屑已显示');
  }

  private applyHideStyle(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = this.config.styleId;
      document.head.appendChild(this.styleElement);
    }
    this.styleElement.textContent = `
      .orca-breadcrumb.orca-block-breadcrumb.orca-query-list-block-breadcrumb {
        display: none !important;
      }
    `;
  }

  private removeHideStyle(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('listBreadcrumbHidden', this.state.isHidden);
      }
    } catch (e) {
      console.error('[ListBreadcrumbSidetool] 状态保存失败:', e);
    }
  }
}

