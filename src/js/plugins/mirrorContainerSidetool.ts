import React from 'react';
import type { 
  MirrorContainerToggleAPI, 
  MirrorContainerTogglePlugin 
} from '../../types';
import { 
  MIRROR_CONTAINER_TOGGLE_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class MirrorContainerSidetoolImpl implements MirrorContainerTogglePlugin {
  private state = {
    isHidden: false,
    isInitialized: false
  };
  private config = MIRROR_CONTAINER_TOGGLE_CONFIG;
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
      this.hideContainer();
    }
    this.state.isInitialized = true;
    console.log('✅ W95 镜像容器切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    this.showContainer();
    this.state.isHidden = false;
    this.state.isInitialized = false;
    console.log('✅ W95 镜像容器切换插件已销毁');
  }

  public getAPI(): MirrorContainerToggleAPI {
    return {
      toggle: () => this.toggleState(),
      show: () => this.showContainer(),
      hide: () => this.hideContainer(),
      getState: () => this.state.isHidden,
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const MirrorContainerButton = () => {
      const snap = useSnapshot(this.reactiveState);
      
      const getIcon = (isHidden: boolean) => {
        return React.createElement('i', {
          className: isHidden ? 'ti ti-copy-off' : 'ti ti-copy'
        });
      };
      
      return React.createElement(Tooltip, {
        text: snap.isHidden ? "显示镜像容器" : "隐藏镜像容器",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isHidden ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, getIcon(snap.isHidden))
      });
    };
    
    return React.createElement(MirrorContainerButton);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isHidden = await this.persistenceManager.loadState('mirrorContainerHidden', false);
      } else {
        this.state.isHidden = false;
      }
      this.reactiveState.isHidden = this.state.isHidden;
    } catch (e) {
      console.error('[MirrorContainerSidetool] 状态加载失败:', e);
      this.state.isHidden = false;
      this.reactiveState.isHidden = false;
    }
  }

  private async toggleState(): Promise<void> {
    if (this.state.isHidden) {
      await this.showContainer();
    } else {
      await this.hideContainer();
    }
  }

  private async hideContainer(): Promise<void> {
    if (this.state.isHidden) return;
    this.state.isHidden = true;
    this.reactiveState.isHidden = true;
    this.applyHideContainerStyle();
    await this.saveState();
    console.log('✅ 镜像容器已隐藏');
  }

  private async showContainer(): Promise<void> {
    if (!this.state.isHidden) return;
    this.state.isHidden = false;
    this.reactiveState.isHidden = false;
    this.removeHideContainerStyle();
    await this.saveState();
    console.log('✅ 镜像容器已显示');
  }

  private applyHideContainerStyle(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = this.config.styleId;
      document.head.appendChild(this.styleElement);
    }
    this.styleElement.textContent = `
      .orca-query-list-block:has(> .orca-block.orca-container[data-type="mirror"]) {
        display: none !important;
      }
    `;
  }

  private removeHideContainerStyle(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('mirrorContainerHidden', this.state.isHidden);
      }
    } catch (e) {
      console.error('[MirrorContainerSidetool] 状态保存失败:', e);
    }
  }
}

