import React from 'react';
import type { 
  QueryBlockHighlightToggleAPI, 
  QueryBlockHighlightTogglePlugin 
} from '../../types';
import { 
  QUERY_BLOCK_HIGHLIGHT_TOGGLE_CONFIG 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class QueryBlockHighlightSidetoolImpl implements QueryBlockHighlightTogglePlugin {
  private state = {
    isHighlighted: false,
    isInitialized: false,
    highlightedBlocks: new Set<Element>()
  };
  private config = QUERY_BLOCK_HIGHLIGHT_TOGGLE_CONFIG;
  private persistenceManager: PersistenceManager | null = null;
  private reactiveState: any;

  constructor(pluginName?: string) {
    this.persistenceManager = pluginName ? createPersistenceManager(pluginName) : null;
    this.reactiveState = window.Valtio.proxy({ isHighlighted: false });
  }

  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;
    await this.initState();
    if (this.state.isHighlighted) {
      this.highlightBlock();
    }
    this.state.isInitialized = true;
    console.log('✅ W95 查询块高亮切换插件已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;
    this.removeHighlight();
    this.state.isHighlighted = false;
    this.state.isInitialized = false;
    this.state.highlightedBlocks.clear();
    console.log('✅ W95 查询块高亮切换插件已销毁');
  }

  public getAPI(): QueryBlockHighlightToggleAPI {
    return {
      toggle: () => this.toggleState(),
      disable: () => this.removeHighlight(),
      enable: () => this.highlightBlock(),
      getState: () => this.state.isHighlighted,
      destroy: () => this.destroy()
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    const QueryBlockHighlightButton = () => {
      const snap = useSnapshot(this.reactiveState);
      
      const getIcon = (isHighlighted: boolean) => {
        return React.createElement('i', {
          className: isHighlighted ? 'ti ti-square-filled' : 'ti ti-square'
        });
      };
      
      return React.createElement(Tooltip, {
        text: snap.isHighlighted ? "取消高亮查询块" : "高亮查询块",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isHighlighted ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, getIcon(snap.isHighlighted))
      });
    };
    
    return React.createElement(QueryBlockHighlightButton);
  };

  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isHighlighted = await this.persistenceManager.loadState('queryBlockHighlighted', false);
      } else {
        this.state.isHighlighted = false;
      }
      this.reactiveState.isHighlighted = this.state.isHighlighted;
    } catch (e) {
      console.error('[QueryBlockHighlightSidetool] 状态加载失败:', e);
      this.state.isHighlighted = false;
      this.reactiveState.isHighlighted = false;
    }
  }

  private async toggleState(): Promise<void> {
    if (this.state.isHighlighted) {
      await this.removeHighlight();
    } else {
      await this.highlightBlock();
    }
  }

  private async highlightBlock(): Promise<void> {
    if (this.state.isHighlighted) return;
    this.state.isHighlighted = true;
    this.reactiveState.isHighlighted = true;
    this.highlightMatchingBlocks();
    await this.saveState();
    console.log('✅ 查询块高亮已启用');
  }

  private async removeHighlight(): Promise<void> {
    if (!this.state.isHighlighted) return;
    this.state.isHighlighted = false;
    this.reactiveState.isHighlighted = false;
    this.clearAllHighlights();
    await this.saveState();
    console.log('✅ 查询块高亮已禁用');
  }

  private highlightMatchingBlocks(): void {
    const newlyHighlighted = new Set<Element>();
    
    document.querySelectorAll('.orca-query-list-block').forEach(block => {
      const reprMain = block.querySelector('.orca-repr-main');
      const isCollapsed = reprMain && reprMain.classList.contains('orca-repr-main-collapsed');
      if (isCollapsed) {
        if (this.state.highlightedBlocks.has(block)) {
          (block as HTMLElement).style.removeProperty('background-color');
        }
        return;
      }
      
      const childrenContainer = block.querySelector('.orca-repr-children');
      if (childrenContainer) {
        const hasVisibleChildren = Array.from(childrenContainer.childNodes).some(node => 
          node.nodeType === 1 || 
          (node.nodeType === 3 && node.textContent?.trim() !== '')
        );
        if (hasVisibleChildren) {
          if (this.state.highlightedBlocks.has(block)) {
            (block as HTMLElement).style.removeProperty('background-color');
          }
          return;
        }
      }
      
      const container = block.querySelector('.orca-repr-main-content.orca-repr-text-content');
      if (!container) {
        if (this.state.highlightedBlocks.has(block)) {
          (block as HTMLElement).style.removeProperty('background-color');
        }
        return;
      }
      
      const children = container.children;
      if (children.length !== 3) {
        if (this.state.highlightedBlocks.has(block)) {
          (block as HTMLElement).style.removeProperty('background-color');
        }
        return;
      }
      
      if (children[0].classList.contains('orca-none-selectable') &&
          children[1].classList.contains('orca-inline') && 
          (children[1] as HTMLElement).dataset.type === 'r' &&
          children[2].classList.contains('orca-none-selectable')) {
        
        if (this.state.isHighlighted) {
          (block as HTMLElement).style.backgroundColor = this.config.highlightColor;
          newlyHighlighted.add(block);
        } else {
          if (this.state.highlightedBlocks.has(block)) {
            (block as HTMLElement).style.removeProperty('background-color');
          }
        }
      } else {
        if (this.state.highlightedBlocks.has(block)) {
          (block as HTMLElement).style.removeProperty('background-color');
        }
      }
    });
    
    this.state.highlightedBlocks = newlyHighlighted;
  }

  private clearAllHighlights(): void {
    this.state.highlightedBlocks.forEach(block => {
      (block as HTMLElement).style.removeProperty('background-color');
    });
    this.state.highlightedBlocks.clear();
  }

  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('queryBlockHighlighted', this.state.isHighlighted);
      }
    } catch (e) {
      console.error('[QueryBlockHighlightSidetool] 状态保存失败:', e);
    }
  }
}

