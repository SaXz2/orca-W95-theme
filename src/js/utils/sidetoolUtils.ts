/**
 * 侧边栏工具通用工具函数
 */

import React from 'react';

/**
 * 创建一个简单的侧边栏工具组件
 * @param iconClass - 图标类名 (如 'ti ti-list-numbers')
 * @param tooltip - 工具提示文本
 * @param isEnabled - 启用状态
 * @param onClick - 点击回调
 */
export function createSidetoolComponent(
  iconClass: string,
  tooltip: string,
  isEnabled: boolean,
  onClick: () => void | Promise<void>
): React.ReactNode {
  const Tooltip = orca.components.Tooltip;
  const Button = orca.components.Button;
  
  return React.createElement(Tooltip, {
    text: tooltip,
    placement: "horizontal",
    children: React.createElement(Button, {
      className: `orca-block-editor-sidetools-btn ${isEnabled ? "orca-opened" : ""}`,
      variant: "plain",
      onClick
    }, React.createElement('i', {
      className: iconClass
    }))
  });
}

/**
 * 创建一个带响应式状态的侧边栏工具渲染函数
 * @param reactiveState - Valtio proxy 状态
 * @param iconClass - 图标类名
 * @param tooltip - 工具提示文本
 * @param onToggle - 切换回调
 */
export function createReactiveSidetool(
  reactiveState: any,
  iconClass: string,
  tooltip: string,
  onToggle: () => void | Promise<void>
): (rootBlockId: any, panelId: string) => React.ReactNode {
  return () => {
    const useSnapshot = window.Valtio.useSnapshot;
    
    // 创建一个函数组件来使用 useSnapshot hook
    const SidetoolButton = () => {
      const snap = useSnapshot(reactiveState);
      
      return createSidetoolComponent(iconClass, tooltip, snap.isEnabled, onToggle);
    };
    
    return React.createElement(SidetoolButton);
  };
}

