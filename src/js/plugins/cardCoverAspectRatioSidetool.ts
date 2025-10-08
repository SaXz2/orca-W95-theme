import React from 'react';
import type { 
  CardCoverAspectRatioAPI, 
  CardCoverAspectRatioPlugin 
} from '../../types';
import { 
  CARD_COVER_ASPECT_RATIO_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class CardCoverAspectRatioSidetoolImpl implements CardCoverAspectRatioPlugin {
  private state = {
    currentState: 0,
    isInitialized: false
  };
  private config = CARD_COVER_ASPECT_RATIO_CONFIG;
  private persistenceManager: PersistenceManager | null = null;
  private reactiveState: any;
  private styleElement: HTMLStyleElement | null = null;

  constructor(pluginName?: string) {
    this.persistenceManager = pluginName ? createPersistenceManager(pluginName) : null;
    this.reactiveState = window.Valtio.proxy({ currentState: 0 });
  }

  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;
    await this.initState();
    this.applyAspectRatioStyle();
    this.state.isInitialized = true;
    console.log('✅ W95 卡片封面比例切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    this.removeAspectRatioStyle();
    this.state.currentState = 0;
    this.state.isInitialized = false;
    console.log('✅ W95 卡片封面比例切换插件已销毁');
  }

  public getAPI(): CardCoverAspectRatioAPI {
    return {
      toggle: () => this.toggleState(),
      setState: (state: number) => this.setState(state),
      getState: () => this.state.currentState,
      getCurrentRatio: () => this.getCurrentRatio() || '',
      openSettings: () => {},
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const CardCoverAspectRatioButton = () => {
      const snap = useSnapshot(this.reactiveState);
      const current = this.config.states[snap.currentState];
      
      const getIcon = (icon: string) => {
        let iconClass = 'ti ti-aspect-ratio';
        if (icon === 'portrait') {
          iconClass = 'ti ti-rectangle-vertical';
        } else if (icon === 'landscape') {
          iconClass = 'ti ti-rectangle';
        }
        return React.createElement('i', {
          className: iconClass
        });
      };
      
      return React.createElement(Tooltip, {
        text: current.title,
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${current.icon !== 'disabled' ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, getIcon(current.icon))
      });
    };
    
    return React.createElement(CardCoverAspectRatioButton);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.currentState = await this.persistenceManager.loadState('cardCoverAspectRatio', 0);
      } else {
        this.state.currentState = 0;
      }
      this.reactiveState.currentState = this.state.currentState;
    } catch (e) {
      console.error('[CardCoverAspectRatioSidetool] 状态加载失败:', e);
      this.state.currentState = 0;
      this.reactiveState.currentState = 0;
    }
  }

  private async toggleState(): Promise<void> {
    this.state.currentState = (this.state.currentState + 1) % this.config.states.length;
    this.reactiveState.currentState = this.state.currentState;
    this.applyAspectRatioStyle();
    await this.saveState();
    console.log(`✅ 卡片封面比例已切换: ${this.config.states[this.state.currentState].title}`);
  }

  private async setState(state: number): Promise<void> {
    if (state < 0 || state >= this.config.states.length) return;
    this.state.currentState = state;
    this.reactiveState.currentState = state;
    this.applyAspectRatioStyle();
    await this.saveState();
  }

  private getCurrentRatio(): string | null {
    const current = this.config.states[this.state.currentState];
    return current.ratio || null;
  }

  private applyAspectRatioStyle(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = this.config.styleId;
      document.head.appendChild(this.styleElement);
    }
    
    const current = this.config.states[this.state.currentState];
    if (current.ratio) {
      this.styleElement.textContent = `
        .orca-query-card-cover {
          aspect-ratio: ${current.ratio} !important;
          object-fit: cover !important;
        }
      `;
    } else {
      this.styleElement.textContent = '';
    }
  }

  private removeAspectRatioStyle(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('cardCoverAspectRatio', this.state.currentState);
      }
    } catch (e) {
      console.error('[CardCoverAspectRatioSidetool] 状态保存失败:', e);
    }
  }
}

