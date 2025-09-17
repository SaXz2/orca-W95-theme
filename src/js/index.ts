/**
 * W95 主题插件主导入文件
 * 统一导出所有插件模块和工具函数
 */

// ========================================
//   插件模块导出
// ========================================

// 查询视图切换插件
export { QueryViewTogglePluginImpl } from './plugins/queryViewToggle';
export type { 
  QueryViewTogglePlugin, 
  QueryViewToggleAPI, 
  QueryViewToggleState, 
  QueryViewToggleConfig 
} from '../types';

// 标题编号切换插件
export { HeadingNumberTogglePluginImpl } from './plugins/headingNumberToggle';
export type { 
  HeadingNumberTogglePlugin, 
  HeadingNumberToggleAPI, 
  HeadingNumberToggleState, 
  HeadingNumberToggleConfig 
} from '../types';

// 属性折叠切换插件
export { PropsTogglePluginImpl } from './plugins/propsToggle';
export type { 
  PropsTogglePlugin, 
  PropsToggleAPI, 
  PropsToggleState, 
  PropsToggleConfig 
} from '../types';

// 仅块引用隐藏切换插件
export { QueryBlockRefTogglePluginImpl } from './plugins/queryBlockRefToggle';
export type { 
  QueryBlockRefTogglePlugin, 
  QueryBlockRefToggleAPI, 
  QueryBlockRefToggleState, 
  QueryBlockRefToggleConfig 
} from '../types';

// 仅块引用背景色高亮切换插件
export { QueryBlockHighlightTogglePluginImpl } from './plugins/queryBlockHighlightToggle';
export type { 
  QueryBlockHighlightTogglePlugin, 
  QueryBlockHighlightToggleAPI, 
  QueryBlockHighlightToggleState, 
  QueryBlockHighlightToggleConfig 
} from '../types';

// 镜像容器切换插件
export { MirrorContainerTogglePluginImpl } from './plugins/mirrorContainerToggle';
export type { 
  MirrorContainerTogglePlugin, 
  MirrorContainerToggleAPI, 
  MirrorContainerToggleState, 
  MirrorContainerToggleConfig 
} from '../types';

// 列表面包屑切换插件
export { ListBreadcrumbTogglePluginImpl } from './plugins/listBreadcrumbToggle';
export type { 
  ListBreadcrumbTogglePlugin, 
  ListBreadcrumbToggleAPI, 
  ListBreadcrumbToggleState, 
  ListBreadcrumbToggleConfig 
} from '../types';

// 卡片视图极简切换插件
export { CardViewMinimalTogglePluginImpl } from './plugins/cardViewMinimalToggle';
export type { 
  CardViewMinimalTogglePlugin, 
  CardViewMinimalToggleAPI, 
  CardViewMinimalToggleState, 
  CardViewMinimalToggleConfig 
} from '../types';

// 卡片封面比例切换插件
export { CardCoverAspectRatioTogglePluginImpl } from './plugins/cardCoverAspectRatioToggle';
export type { 
  CardCoverAspectRatioPlugin, 
  CardCoverAspectRatioAPI, 
  CardCoverAspectRatioState, 
  CardCoverAspectRatioConfig,
  AspectRatioState
} from '../types';

// 查询列表块创建时间显示插件
export { QueryListBlockCreationTimePluginImpl } from './plugins/queryListBlockCreationTime';
export type { 
  QueryListBlockCreationTimePlugin, 
  QueryListBlockCreationTimeAPI, 
  QueryListBlockCreationTimeState, 
  QueryListBlockCreationTimeConfig,
  TimePeriod,
  ColorScheme
} from '../types';

// 主题2切换插件
export { Theme2TogglePluginImpl } from './plugins/theme2Toggle';
export type { 
  Theme2TogglePlugin, 
  Theme2ToggleAPI, 
  Theme2ToggleState, 
  Theme2ToggleConfig
} from '../types';

// 隐藏OCR图片块插件
export { OcrImageBlockTogglePluginImpl } from './plugins/ocrImageBlockToggle';
export type { 
  OcrImageBlockTogglePlugin, 
  OcrImageBlockToggleAPI, 
  OcrImageBlockToggleState, 
  OcrImageBlockToggleConfig
} from '../types';

// ========================================
//   工具函数导出
// ========================================

// 按钮工具函数
export { 
  createToolbarButton, 
  updateButtonStyle, 
  addButtonToToolbar, 
  createRetryMechanism,
  ToolbarButtonManager,
  type ButtonConfig,
  type ButtonStyleConfig,
  type ButtonRegistration
} from './utils/buttonUtils';

// 观察者工具函数
export { 
  createMainObserver, 
  createBlockObserver, 
  startMainObserver, 
  disconnectObserver,
  type ObserverConfig
} from './utils/observerUtils';

// 本地化工具函数
export { setupL10N, t } from './utils/l10n';

// ========================================
//   配置常量导出
// ========================================

export {
  QUERY_VIEW_TOGGLE_CONFIG,
  CSS_SELECTORS,
  STYLE_ELEMENT_ID,
  BROADCAST_CHANNEL_NAME,
  DEFAULT_STATE,
  TOOLBAR_BUTTON_CONFIG,
  HEADING_NUMBER_TOGGLE_CONFIG,
  DEFAULT_HEADING_NUMBER_STATE,
  PROPS_TOGGLE_CONFIG,
  QUERY_BLOCK_REF_TOGGLE_CONFIG,
  QUERY_BLOCK_HIGHLIGHT_TOGGLE_CONFIG,
  MIRROR_CONTAINER_TOGGLE_CONFIG,
  LIST_BREADCRUMB_TOGGLE_CONFIG,
  CARD_VIEW_MINIMAL_TOGGLE_CONFIG,
  CARD_COVER_ASPECT_RATIO_CONFIG,
  QUERY_LIST_BLOCK_CREATION_TIME_CONFIG,
  THEME2_TOGGLE_CONFIG,
  OCR_IMAGE_BLOCK_TOGGLE_CONFIG
} from '../constants';

// ========================================
//   类型定义导出
// ========================================

export type {
  // 查询视图切换相关
  CrossTabMessage
} from '../types';

// ========================================
//   插件管理器
// ========================================

import { ToolbarButtonManager } from './utils/buttonUtils';

/**
 * 插件管理器类
 * 统一管理所有插件的注册和卸载
 */
export class PluginManager {
  private plugins: Map<string, any> = new Map();
  private pluginInstances: Map<string, any> = new Map();
  private buttonManager: ToolbarButtonManager | null = null;
  private pluginName: string = '';

  constructor(buttonManager?: ToolbarButtonManager, pluginName?: string) {
    this.buttonManager = buttonManager || null;
    this.pluginName = pluginName || '';
  }

  /**
   * 注册插件
   */
  register<T extends { initialize?: () => void | Promise<void>; destroy?: () => void }>(
    name: string, 
    pluginClass: new (buttonManager?: ToolbarButtonManager, ...args: any[]) => T, 
    priority?: number
  ): T {
    if (this.pluginInstances.has(name)) {
      return this.pluginInstances.get(name);
    }

    // 向所有插件传递pluginName以支持持久化
    const instance: T = new pluginClass(this.buttonManager || undefined, this.pluginName);
    
    this.plugins.set(name, pluginClass);
    this.pluginInstances.set(name, instance);
    
    // 自动初始化插件（支持异步）
    if (instance && typeof instance.initialize === 'function') {
      const result = instance.initialize();
      if (result instanceof Promise) {
        result.catch(error => {
          console.error(`插件 ${name} 初始化失败:`, error);
        });
      }
    }

    return instance;
  }

  /**
   * 卸载所有插件
   */
  unloadAll(): void {
    this.pluginInstances.forEach((instance, name) => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    });
    this.pluginInstances.clear();
    this.plugins.clear();
  }

  /**
   * 获取插件实例
   */
  getPlugin<T>(name: string): T | null {
    return this.pluginInstances.get(name) || null;
  }

  /**
   * 检查插件是否存在
   */
  hasPlugin(name: string): boolean {
    return this.pluginInstances.has(name);
  }
}
