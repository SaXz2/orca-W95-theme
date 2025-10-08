/**
 * 标题编号编辑器侧边栏工具实现
 */

import React from 'react';
import type { 
  HeadingNumberToggleState, 
  HeadingNumberToggleAPI, 
  HeadingNumberTogglePlugin 
} from '../../types';
import { 
  HEADING_NUMBER_TOGGLE_CONFIG, 
  DEFAULT_HEADING_NUMBER_STATE 
} from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

/**
 * 标题编号编辑器侧边栏工具类
 */
export class HeadingNumberSidetoolImpl implements HeadingNumberTogglePlugin {
  private state: HeadingNumberToggleState;
  private config = HEADING_NUMBER_TOGGLE_CONFIG;
  private persistenceManager: PersistenceManager | null = null;
  private reactiveState: any; // Valtio proxy state

  constructor(pluginName?: string) {
    this.state = { ...DEFAULT_HEADING_NUMBER_STATE };
    this.persistenceManager = pluginName ? createPersistenceManager(pluginName) : null;
    // 创建响应式状态
    this.reactiveState = window.Valtio.proxy({ isEnabled: false });
  }

  /**
   * 初始化插件
   */
  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    await this.initState();
    
    // 根据保存的状态应用功能
    if (this.state.isEnabled) {
      this.applyNumbers();
    }

    this.state.isInitialized = true;
    console.log('✅ W95 标题编号侧边栏工具已初始化');
  }

  /**
   * 销毁插件
   */
  public destroy(): void {
    if (!this.state.isInitialized) return;

    // 清除所有编号
    this.clearNumbers();

    // 断开观察者
    if (this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
    }

    // 重置状态
    this.state = { ...DEFAULT_HEADING_NUMBER_STATE };
    console.log('✅ W95 标题编号侧边栏工具已销毁');
  }

  /**
   * 获取公共 API
   */
  public getAPI(): HeadingNumberToggleAPI {
    return {
      toggle: () => this.toggleState(),
      enable: () => this.enableNumbers(),
      disable: () => this.disableNumbers(),
      isEnabled: () => this.state.isEnabled,
      destroy: () => this.destroy()
    };
  }

  /**
   * 渲染侧边栏工具组件
   */
  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;
    
    // 创建一个函数组件来使用 useSnapshot hook
    const HeadingNumberButton = () => {
      const snap = useSnapshot(this.reactiveState);
      
      return React.createElement(Tooltip, {
        text: "标题编号（点击切换启用/关闭）",
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isEnabled ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, React.createElement('i', {
          className: 'ti ti-list-numbers'
        }))
      });
    };
    
    return React.createElement(HeadingNumberButton);
  };

  /**
   * 初始化状态
   */
  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isEnabled = await this.persistenceManager.loadState('headingNumberEnabled', false);
      } else {
        this.state.isEnabled = false;
      }
      // 同步到响应式状态
      this.reactiveState.isEnabled = this.state.isEnabled;
    } catch (e) {
      console.error('[HeadingNumberSidetool] 状态加载失败:', e);
      this.state.isEnabled = false;
      this.reactiveState.isEnabled = false;
    }
  }

  /**
   * 切换状态
   */
  private async toggleState(): Promise<void> {
    if (this.state.isEnabled) {
      await this.disableNumbers();
    } else {
      await this.enableNumbers();
    }
  }

  /**
   * 启用编号
   */
  private async enableNumbers(): Promise<void> {
    if (this.state.isEnabled) return;

    this.state.isEnabled = true;
    this.reactiveState.isEnabled = true; // 同步到响应式状态
    this.applyNumbers();
    await this.saveState();
    console.log('✅ 标题编号已启用');
  }

  /**
   * 禁用编号
   */
  private async disableNumbers(): Promise<void> {
    if (!this.state.isEnabled) return;

    this.state.isEnabled = false;
    this.reactiveState.isEnabled = false; // 同步到响应式状态
    this.clearNumbers();
    await this.saveState();
    console.log('✅ 标题编号已禁用');
  }

  /**
   * 添加编号（核心修改：去掉末尾点号）
   */
  private applyNumbers(): void {
    this.clearNumbers();
    
    let h1 = 0, h2 = 0, h3 = 0, h4 = 0;
    document.querySelectorAll('.orca-repr-heading-content').forEach(el => {
      const level = parseInt((el as HTMLElement).dataset.level || '0');
      if (!level || level < 1 || level > 4) return;

      switch(level) {
        case 1: h1++; h2 = h3 = h4 = 0; break;
        case 2: h2++; h3 = h4 = 0; break;
        case 3: h3++; h4 = 0; break;
        case 4: h4++; break;
      }
      
      // 生成编号（移除末尾的点号）
      let number = `${h1}`;
      if (level >= 2) number += `.${h2}`;
      if (level >= 3) number += `.${h3}`;
      if (level >= 4) number += `.${h4}`;
      number += ' '; // 只保留空格，去掉点号
      
      const numberSpan = document.createElement('span');
      numberSpan.className = this.config.numberClass;
      numberSpan.style.fontWeight = '600';
      numberSpan.style.opacity = '0.85';
      numberSpan.style.marginRight = '0.5em';
      numberSpan.textContent = number;
      
      el.insertBefore(numberSpan, el.firstChild);
    });
  }

  /**
   * 清除编号
   */
  private clearNumbers(): void {
    document.querySelectorAll(`.${this.config.numberClass}`).forEach(el => {
      el.remove();
    });
  }

  /**
   * 保存状态
   */
  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('headingNumberEnabled', this.state.isEnabled);
      }
    } catch (e) {
      console.error('[HeadingNumberSidetool] 状态保存失败:', e);
    }
  }
}
