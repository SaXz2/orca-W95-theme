import React from 'react';
import type { 
  CardViewMinimalToggleAPI, 
  CardViewMinimalTogglePlugin 
} from '../../types';
import { 
  CARD_VIEW_MINIMAL_TOGGLE_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class CardViewMinimalSidetoolImpl implements CardViewMinimalTogglePlugin {
  private state = {
    isMinimal: false,
    isInitialized: false
  };
  private config = CARD_VIEW_MINIMAL_TOGGLE_CONFIG;
  private persistenceManager: PersistenceManager | null = null;
  private reactiveState: any;
  private styleElement: HTMLStyleElement | null = null;

  constructor(pluginName?: string) {
    this.persistenceManager = pluginName ? createPersistenceManager(pluginName) : null;
    this.reactiveState = window.Valtio.proxy({ isMinimal: false });
  }

  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;
    await this.initState();
    if (this.state.isMinimal) {
      this.enableMinimal();
    }
    this.state.isInitialized = true;
    console.log('✅ W95 卡片视图极简切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    this.disableMinimal();
    this.state.isMinimal = false;
    this.state.isInitialized = false;
    console.log('✅ W95 卡片视图极简切换插件已销毁');
  }

  public getAPI(): CardViewMinimalToggleAPI {
    return {
      toggle: () => this.toggleState(),
      enable: () => this.enableMinimal(),
      disable: () => this.disableMinimal(),
      getState: () => this.state.isMinimal,
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const CardViewMinimalButton = () => {
      const snap = useSnapshot(this.reactiveState);
      
      const getIcon = (isMinimal: boolean) => {
        return React.createElement('i', {
          className: isMinimal ? 'ti ti-layout-grid' : 'ti ti-layout-cards'
        });
      };
      
      return React.createElement(Tooltip, {
        text: snap.isMinimal ? "禁用卡片极简视图" : "启用卡片极简视图",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isMinimal ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, getIcon(snap.isMinimal))
      });
    };
    
    return React.createElement(CardViewMinimalButton);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isMinimal = await this.persistenceManager.loadState('cardViewMinimal', false);
      } else {
        this.state.isMinimal = false;
      }
      this.reactiveState.isMinimal = this.state.isMinimal;
    } catch (e) {
      console.error('[CardViewMinimalSidetool] 状态加载失败:', e);
      this.state.isMinimal = false;
      this.reactiveState.isMinimal = false;
    }
  }

  private async toggleState(): Promise<void> {
    if (this.state.isMinimal) {
      await this.disableMinimal();
    } else {
      await this.enableMinimal();
    }
  }

  private async enableMinimal(): Promise<void> {
    if (this.state.isMinimal) return;
    this.state.isMinimal = true;
    this.reactiveState.isMinimal = true;
    this.applyMinimalStyle();
    await this.saveState();
    console.log('✅ 卡片极简视图已启用');
  }

  private async disableMinimal(): Promise<void> {
    if (!this.state.isMinimal) return;
    this.state.isMinimal = false;
    this.reactiveState.isMinimal = false;
    this.removeMinimalStyle();
    await this.saveState();
    console.log('✅ 卡片极简视图已禁用');
  }

  private applyMinimalStyle(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = this.config.styleId;
      document.head.appendChild(this.styleElement);
    }
    this.styleElement.textContent = `
      .orca-breadcrumb.orca-block-breadcrumb.orca-query-card-breadcrumb {
        display: none !important;
      }
      .orca-query-card-subtitle {
        display: none !important;
      }
      .orca-query-card-title {
        display: none !important;
      }
    `;
  }

  private removeMinimalStyle(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('cardViewMinimal', this.state.isMinimal);
      }
    } catch (e) {
      console.error('[CardViewMinimalSidetool] 状态保存失败:', e);
    }
  }
}

