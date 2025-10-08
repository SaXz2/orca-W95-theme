/**
 * 查询视图切换侧边栏工具
 * 这是原 queryViewToggle 插件的侧边栏工具实现
 * 实际功能由 queryViewToggle 插件提供
 */

import React from 'react';

// 响应式状态（全局共享）
let reactiveState: any;

/**
 * 初始化查询视图侧边栏工具
 */
export function initQueryViewSidetool() {
  // 创建响应式状态
  if (!reactiveState) {
    reactiveState = window.Valtio.proxy({ hasHiddenViews: false });
  }
}

/**
 * 更新查询视图侧边栏工具状态
 */
export function updateQueryViewSidetoolState(hasHiddenViews: boolean) {
  if (reactiveState) {
    reactiveState.hasHiddenViews = hasHiddenViews;
  }
}

/**
 * 渲染查询视图侧边栏工具
 */
export function renderQueryViewSidetool(): React.ReactNode {
  const Tooltip = orca.components.Tooltip;
  const Button = orca.components.Button;
  const useSnapshot = window.Valtio.useSnapshot;
  
  // 创建一个函数组件来使用 useSnapshot hook
  const QueryViewButton = () => {
    const snap = useSnapshot(reactiveState);
    
    return React.createElement(Tooltip, {
      text: "查询视图切换",
      placement: "horizontal",
      children: React.createElement(Button, {
        className: `orca-block-editor-sidetools-btn ${snap.hasHiddenViews ? "orca-opened" : ""}`,
        variant: "plain",
        onClick: () => {
          // 调用原插件的命令
          if (orca.state.commands && orca.state.commands['w95.query-toggle']) {
            orca.commands.invokeCommand('w95.query-toggle');
          }
        }
      }, React.createElement('i', {
        className: 'ti ti-eye-off'
      }))
    });
  };
  
  return React.createElement(QueryViewButton);
}

