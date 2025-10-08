import React from 'react';
import type { 
  PopupToolbarToggleAPI, 
  PopupToolbarTogglePlugin 
} from '../../types';
import { 
  POPUP_TOOLBAR_TOGGLE_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class PopupToolbarSidetoolImpl implements PopupToolbarTogglePlugin {
  private state = {
    isHidden: false,
    isInitialized: false
  };
  private config = POPUP_TOOLBAR_TOGGLE_CONFIG;
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
      this.hideToolbar();
    }
    this.state.isInitialized = true;
    console.log('✅ W95 悬浮工具栏切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    this.showToolbar();
    this.state.isHidden = false;
    this.state.isInitialized = false;
    console.log('✅ W95 悬浮工具栏切换插件已销毁');
  }

  public getAPI(): PopupToolbarToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showToolbar(),
      hide: () => this.hideToolbar(),
      getState: () => this.state.isHidden,
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const PopupToolbarButton = () => {
      const snap = useSnapshot(this.reactiveState);
      
      const getIcon = () => {
        return React.createElement('i', {
          className: 'ti ti-wand'
        });
      };
      
      return React.createElement(Tooltip, {
        text: snap.isHidden ? "显示悬浮工具栏" : "隐藏悬浮工具栏",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isHidden ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, getIcon())
      });
    };
    
    return React.createElement(PopupToolbarButton);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isHidden = await this.persistenceManager.loadState('popupToolbarHidden', false);
      } else {
        this.state.isHidden = false;
      }
      this.reactiveState.isHidden = this.state.isHidden;
    } catch (e) {
      console.error('[PopupToolbarSidetool] 状态加载失败:', e);
      this.state.isHidden = false;
      this.reactiveState.isHidden = false;
    }
  }

  private async toggleState(): Promise<void> {
    if (this.state.isHidden) {
      await this.showToolbar();
    } else {
      await this.hideToolbar();
    }
  }

  private async hideToolbar(): Promise<void> {
    if (this.state.isHidden) return;
    this.state.isHidden = true;
    this.reactiveState.isHidden = true;
    this.addHideStyle();
    await this.saveState();
    console.log('✅ 悬浮工具栏已隐藏');
  }

  private async showToolbar(): Promise<void> {
    if (!this.state.isHidden) return;
    this.state.isHidden = false;
    this.reactiveState.isHidden = false;
    this.removeHideStyle();
    await this.saveState();
    console.log('✅ 悬浮工具栏已显示');
  }

  private addHideStyle(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = this.config.styleId;
      document.head.appendChild(this.styleElement);
    }
    this.styleElement.textContent = `
      .orca-popup.orca-editor-toolbar {
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
        await this.persistenceManager.saveState('popupToolbarHidden', this.state.isHidden);
      }
    } catch (e) {
      console.error('[PopupToolbarSidetool] 状态保存失败:', e);
    }
  }
}

