/**
 * 查询列表块创建时间显示模块 - Sidetool 版本
 * - 遵循最小可行方案：自动检测查询列表块，添加创建时间显示
 * - 支持亮色/暗色主题，根据时间段显示不同颜色和图标
 */

import React from 'react';
import type { 
  QueryListBlockCreationTimeAPI, 
  QueryListBlockCreationTimePlugin, 
  QueryListBlockCreationTimeState,
  TimePeriod
} from '../../types';
import { QUERY_LIST_BLOCK_CREATION_TIME_CONFIG } from '../../constants';
import { createPersistenceManager, type PersistenceManager } from '../utils/persistenceUtils';

export class QueryListBlockCreationTimeSidetoolImpl implements QueryListBlockCreationTimePlugin {
  private state: QueryListBlockCreationTimeState = {
    isEnabled: true,
    retryCount: 0,
    observer: null,
    isInitialized: false
  };

  private config = QUERY_LIST_BLOCK_CREATION_TIME_CONFIG;
  private persistenceManager: PersistenceManager | null = null;
  private reactiveState: any; // Valtio proxy state

  constructor(pluginName?: string) {
    this.persistenceManager = pluginName ? createPersistenceManager(pluginName) : null;
    this.reactiveState = window.Valtio.proxy({ isEnabled: true });
  }

  public async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    await this.initState();
    this.applyStyle();
    
    // 根据保存的状态应用功能
    if (this.state.isEnabled) {
      this.addCreationTimeToBlocks();
    }
    
    this.setupObserver();

    this.state.isInitialized = true;
    console.log('✅ W95 查询列表块创建时间显示模块已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;

    // 断开观察者
    if (this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
    }

    // 移除样式
    this.removeStyle();

    // 移除所有创建时间显示
    this.removeAllCreationTimeDisplays();

    this.state.isInitialized = false;
    console.log('✅ W95 查询列表块创建时间显示模块已销毁');
  }

  public getAPI(): QueryListBlockCreationTimeAPI {
    return {
      toggle: () => this.toggleState(),
      enable: () => this.enable(),
      disable: () => this.disable(),
      isEnabled: () => this.state.isEnabled,
      refresh: () => this.addCreationTimeToBlocks(),
      destroy: () => this.destroy(),
      getProcessedCount: () => document.querySelectorAll('.creation-time-wrapper').length,
      getTotalCount: () => document.querySelectorAll(this.config.targetSelector).length
    };
  }

  public renderSidetool = (rootBlockId: any, panelId: string): React.ReactNode => {
    const Tooltip = orca.components.Tooltip;
    const Button = orca.components.Button;
    const useSnapshot = window.Valtio.useSnapshot;

    const QueryListBlockCreationTimeButton = () => {
      const snap = useSnapshot(this.reactiveState);

      const getIcon = () => 'ti ti-clock';
      const getTooltipText = () => snap.isEnabled ? '隐藏创建时间' : '显示创建时间';

      return React.createElement(Tooltip, {
        text: getTooltipText(),
        placement: "horizontal",
        children: React.createElement(Button, {
          className: `orca-block-editor-sidetools-btn ${snap.isEnabled ? "orca-opened" : ""}`,
          variant: "plain",
          onClick: async () => await this.toggleState()
        }, React.createElement('i', {
          className: getIcon()
        }))
      });
    };

    return React.createElement(QueryListBlockCreationTimeButton);
  };

  /**
   * 获取当前颜色方案
   */
  private getCurrentColorScheme(): readonly TimePeriod[] {
    const isPageDark = document.documentElement.classList.contains('dark') 
      || document.body.classList.contains('dark-mode')
      || getComputedStyle(document.body).backgroundColor === 'rgb(43, 49, 61)';
    const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return (isPageDark || isSystemDark) ? this.config.colorSchemes.dark : this.config.colorSchemes.light;
  }

  /**
   * 应用样式
   */
  private applyStyle(): void {
    let style = document.getElementById(this.config.styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = this.config.styleId;
      document.head.appendChild(style);
    }

    const lightScheme = this.config.colorSchemes.light;
    const darkScheme = this.config.colorSchemes.dark;

    const lightPeriodStyles = lightScheme.map(period => `
      .creation-time-container.period-${period.name} {
        background-color: ${(period as any).bgColor || 'transparent'} !important;
        color: ${period.textColor} !important;
        border-color: ${period.borderColor} !important;
      }
      .creation-time-container.period-${period.name} .time-icon {
        color: ${period.textColor} !important;
      }
    `).join('');

    const darkPeriodStyles = darkScheme.map(period => `
      .creation-time-container.period-${period.name} {
        background-color: ${period.bgColor} !important;
        color: ${period.textColor} !important;
        border-color: ${period.borderColor} !important;
      }
      .creation-time-container.period-${period.name} .time-icon {
        color: ${period.textColor} !important;
      }
    `).join('');

    style.textContent = `
      /* 主容器样式 */
      .creation-time-wrapper {
        display: flex;
        justify-content: center;
        margin-top: 4px;
      }
      
      /* 时间显示容器样式 */
      .creation-time-container {
        align-self: flex-end;
        font-size: 11px;
        padding: 0;
        border-radius: 4px;
        border: none;
        opacity: 1;
        pointer-events: auto;
        z-index: 10;
        white-space: nowrap;
        font-family: var(--orca-font-family);
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        cursor: default;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-right: 1px;
        font-weight: 800;
      }
      
      .time-icon {
        font-size: 12px;
        opacity: 1;
      }
      
      /* 亮色模式时段样式 */
      ${lightPeriodStyles}
      
      /* 暗色模式适配 */
      @media (prefers-color-scheme: dark), 
             :root.dark .creation-time-container, 
             body.dark-mode .creation-time-container,
             body[style*="background-color: rgb(43, 49, 61)"] .creation-time-container {
        ${darkPeriodStyles}
        
        .creation-time-container {
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
      }
      
      /* 调整查询列表块的边距 */
      ${this.config.targetSelector} {
        margin-bottom: 4px;
      }
    `;
  }

  /**
   * 移除样式
   */
  private removeStyle(): void {
    const style = document.getElementById(this.config.styleId);
    if (style) {
      style.remove();
    }
  }

  /**
   * 格式化时间
   */
  private formatTime(timestamp: number): { formatted: string; period: TimePeriod | null } {
    if (!timestamp) return { formatted: '', period: null };
    
    const date = new Date(timestamp);
    const hours = date.getHours();
    const currentScheme = this.getCurrentColorScheme();
    let period: TimePeriod | null = null;
    
    for (const p of currentScheme) {
      if (hours >= p.start && hours < p.end) {
        period = p;
        break;
      }
    }
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    const formatted = this.config.timeFormat
      .replace('YYYY', date.getFullYear().toString())
      .replace('MM', pad(date.getMonth() + 1))
      .replace('DD', pad(date.getDate()))
      .replace('HH', pad(date.getHours()))
      .replace('mm', pad(date.getMinutes()));
    
    return { formatted, period };
  }

  /**
   * 添加创建时间到块
   */
  private addCreationTimeToBlocks(): void {
    if (!this.state.isEnabled) return;
    
    const blocks = document.querySelectorAll(this.config.targetSelector);
    
    blocks.forEach(block => {
      if (block.nextElementSibling && block.nextElementSibling.classList.contains('creation-time-wrapper')) {
        return;
      }
      
      const blockId = block.getAttribute('data-id');
      if (!blockId) return;
      
      let blockData = (window as any).orca?.state?.blocks?.[blockId];
      if (!blockData) {
        const allBlocks = (window as any).orca?.state?.blocks;
        if (allBlocks) {
          for (const id in allBlocks) {
            if (allBlocks[id].id == blockId) {
              blockData = allBlocks[id];
              break;
            }
          }
        }
      }
      if (!blockData) return;
      
      const wrapper = document.createElement('div');
      wrapper.className = 'creation-time-wrapper';
      
      const timeContainer = document.createElement('div');
      timeContainer.className = 'creation-time-container';
      
      const { formatted, period } = this.formatTime(blockData.created);
      
      if (period) {
        const icon = document.createElement('i');
        icon.className = `time-icon ${period.icon}`;
        timeContainer.appendChild(icon);
        
        const text = document.createElement('span');
        text.textContent = formatted;
        timeContainer.appendChild(text);
        
        timeContainer.classList.add(`period-${period.name}`);
        timeContainer.title = `${period.name}创建`;
      } else {
        timeContainer.textContent = formatted;
      }
      
      wrapper.appendChild(timeContainer);
      block.parentNode?.insertBefore(wrapper, block.nextSibling);
    });
  }

  /**
   * 移除所有创建时间显示
   */
  private removeAllCreationTimeDisplays(): void {
    const wrappers = document.querySelectorAll('.creation-time-wrapper');
    wrappers.forEach(wrapper => wrapper.remove());
  }

  /**
   * 设置观察者
   */
  private setupObserver(): void {
    this.state.observer = new MutationObserver((mutations) => {
      let needsUpdate = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && 
                ((node as Element).matches?.(this.config.targetSelector) || 
                 (node as Element).querySelector?.(this.config.targetSelector))) {
              needsUpdate = true;
            }
          });
        }
        if (mutation.type === 'attributes' && 
            (mutation.target === document.documentElement || mutation.target === document.body)) {
          if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
            this.applyStyle();
            this.addCreationTimeToBlocks();
          }
        }
      });
      
      if (needsUpdate) {
        this.addCreationTimeToBlocks();
      }
    });
    
    this.state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        this.applyStyle();
        this.addCreationTimeToBlocks();
      });
    }
  }

  /**
   * 初始化状态
   */
  private async initState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        this.state.isEnabled = await this.persistenceManager.loadState('queryListBlockCreationTimeEnabled', true);
      } else {
        const stored = localStorage.getItem(this.config.storageKey);
        this.state.isEnabled = stored ? JSON.parse(stored) : true;
      }
      this.reactiveState.isEnabled = this.state.isEnabled;
    } catch (e) {
      console.error('[QueryListBlockCreationTimeSidetool] 状态加载失败:', e);
      this.state.isEnabled = true;
      this.reactiveState.isEnabled = true;
    }
  }

  /**
   * 切换状态
   */
  private async toggleState(): Promise<void> {
    if (this.state.isEnabled) {
      await this.disable();
    } else {
      await this.enable();
    }
  }

  /**
   * 启用功能
   */
  private async enable(): Promise<void> {
    if (this.state.isEnabled) return;
    this.state.isEnabled = true;
    this.reactiveState.isEnabled = true;
    this.addCreationTimeToBlocks();
    await this.saveState();
    console.log('✅ 查询列表块创建时间已启用');
  }

  /**
   * 禁用功能
   */
  private async disable(): Promise<void> {
    if (!this.state.isEnabled) return;
    this.state.isEnabled = false;
    this.reactiveState.isEnabled = false;
    this.removeCreationTimeFromBlocks();
    await this.saveState();
    console.log('✅ 查询列表块创建时间已禁用');
  }

  /**
   * 保存状态
   */
  private async saveState(): Promise<void> {
    try {
      if (this.persistenceManager) {
        await this.persistenceManager.saveState('queryListBlockCreationTimeEnabled', this.state.isEnabled);
      } else {
        localStorage.setItem(this.config.storageKey, JSON.stringify(this.state.isEnabled));
      }
    } catch (e) {
      console.error('[QueryListBlockCreationTimeSidetool] 状态保存失败:', e);
    }
  }

  /**
   * 移除所有创建时间显示
   */
  private removeCreationTimeFromBlocks(): void {
    document.querySelectorAll('.creation-time-wrapper').forEach(wrapper => {
      wrapper.remove();
    });
  }
}
