/**
 * 查询视图切换插件配置常量
 */

import type { QueryViewToggleConfig } from './types';

// 插件基础配置
export const QUERY_VIEW_TOGGLE_CONFIG: QueryViewToggleConfig = {
  id: 'w95.queryViewToggle', // 使用插件前缀避免冲突
  command: 'toggleQueryView',
  storageKey: 'w95.queryViewHiddenState', // 使用插件前缀
  defaultShortcut: 'ctrl+shift+q',
  observerOptions: {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  }
};

// CSS 选择器常量
export const CSS_SELECTORS = {
  QUERY_TABS_CONTAINER: '.orca-block-editor-query-tabs-container',
  QUERY_VIEWS: '.orca-block-editor-query-views',
  BLOCK_EDITOR: '.orca-block-editor',
  ACTIVE_BLOCK: '.orca-block-editor:focus-within'
} as const;

// 样式元素 ID
export const STYLE_ELEMENT_ID = 'w95-query-view-toggle-styles';

// 跨标签页通信通道名称
export const BROADCAST_CHANNEL_NAME = 'w95.queryViewToggle';

// 默认状态
export const DEFAULT_STATE = {
  hiddenIds: {},
  styleElement: null,
  observer: null,
  isInitialized: false
} as const;

// 统一工具栏按钮配置
export const TOOLBAR_BUTTON_CONFIG = {
  retryInterval: 300,
  maxRetries: 30,
  toolbarSelector: '.orca-block-editor-sidetools',
  targetPanelSelector: '.orca-panel.active'
} as const;

// 标题编号切换配置
export const HEADING_NUMBER_TOGGLE_CONFIG = {
  buttonId: 'w95-heading-number-toggle-btn',
  numberClass: 'w95-auto-generated-number',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  storageKey: 'w95.headingNumberEnabled'
} as const;

// 标题编号切换默认状态
export const DEFAULT_HEADING_NUMBER_STATE = {
  isEnabled: false,
  retryCount: 0,
  observer: null,
  isInitialized: false
} as const;

// 属性折叠切换配置（针对 .orca-repr-tag-props）
export const PROPS_TOGGLE_CONFIG = {
  id: 'w95.propsToggle',
  containerSelector: '.orca-repr-tag-props',
  buttonClass: 'w95-toggle-orca-btn',
  buttonContainerClass: 'w95-toggle-btn-container',
  observerOptions: {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  } as MutationObserverInit
} as const;

// 仅块引用隐藏切换（面板工具栏按钮）
export const QUERY_BLOCK_REF_TOGGLE_CONFIG = {
  id: 'w95.queryBlockRefToggle',
  buttonId: 'w95-hide-specific-query-block-btn',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  targetPanelSelector: TOOLBAR_BUTTON_CONFIG.targetPanelSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  storageKey: 'w95.queryBlockRefHidden'
} as const;

// 仅块引用背景色高亮切换配置
export const QUERY_BLOCK_HIGHLIGHT_TOGGLE_CONFIG = {
  buttonId: 'w95-highlight-specific-query-block-btn',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  targetPanelSelector: TOOLBAR_BUTTON_CONFIG.targetPanelSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  highlightColor: 'var(--orca-color-primary-ultralight, rgba(22, 93, 255, 0.08))',
  storageKey: 'w95.specificQueryBlockIsHighlighted'
} as const;

// 镜像容器切换配置
export const MIRROR_CONTAINER_TOGGLE_CONFIG = {
  buttonId: 'w95-mirror-container-toggle-btn',
  styleId: 'w95-mirror-hide-style',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  targetPanelSelector: TOOLBAR_BUTTON_CONFIG.targetPanelSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  storageKey: 'w95.mirrorContainersHidden'
} as const;

// 列表面包屑切换配置
export const LIST_BREADCRUMB_TOGGLE_CONFIG = {
  buttonId: 'w95-list-breadcrumb-toggle-btn',
  styleId: 'w95-list-breadcrumb-hide-style',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  targetPanelSelector: TOOLBAR_BUTTON_CONFIG.targetPanelSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  storageKey: 'w95.listBreadcrumbHidden'
} as const;

// 卡片视图极简切换配置
export const CARD_VIEW_MINIMAL_TOGGLE_CONFIG = {
  buttonId: 'w95-card-view-minimal-toggle-btn',
  styleId: 'w95-card-view-minimal-style',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  targetPanelSelector: TOOLBAR_BUTTON_CONFIG.targetPanelSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  storageKey: 'w95.cardViewIsMinimal'
} as const;

// 卡片封面比例切换配置
export const CARD_COVER_ASPECT_RATIO_CONFIG = {
  buttonId: 'w95-card-cover-aspect-ratio-btn',
  styleId: 'w95-card-cover-aspect-ratio-style',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  targetPanelSelector: TOOLBAR_BUTTON_CONFIG.targetPanelSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  storageKey: 'w95.cardCoverAspectRatioState',
  states: [
    { ratio: '11 / 16', icon: 'portrait', title: '切换为16:9比例' },
    { ratio: '16 / 9', icon: 'landscape', title: '禁用比例控制' },
    { ratio: 'auto', icon: 'disabled', title: '启用11:16比例' }
  ]
} as const;

// 查询列表块创建时间显示配置
export const QUERY_LIST_BLOCK_CREATION_TIME_CONFIG = {
  buttonId: 'w95-query-list-block-creation-time-toggle-btn',
  styleId: 'w95-query-list-block-creation-time-style',
  targetSelector: '.orca-block.orca-container.orca-query-list-block-block',
  timeFormat: 'YYYY-MM-DD HH:mm',
  retryInterval: 500,
  maxRetries: 15,
  storageKey: 'w95.queryListBlockCreationTimeEnabled',
  colorSchemes: {
    light: [
      {
        name: '凌晨',
        start: 0,
        end: 6,
        textColor: '#2563eb',
        borderColor: 'rgba(37, 99, 235, 0.5)',
        icon: 'ti ti-moon'
      },
      {
        name: '上午',
        start: 6,
        end: 12,
        textColor: '#0369a1',
        borderColor: 'rgba(3, 105, 161, 0.5)',
        icon: 'ti ti-sunrise'
      },
      {
        name: '中午',
        start: 12,
        end: 14,
        textColor: '#ca8a04',
        borderColor: 'rgba(202, 138, 4, 0.6)',
        icon: 'ti ti-sun'
      },
      {
        name: '下午',
        start: 14,
        end: 18,
        textColor: '#c2410c',
        borderColor: 'rgba(194, 65, 12, 0.6)',
        icon: 'ti ti-sunset'
      },
      {
        name: '晚上',
        start: 18,
        end: 24,
        textColor: '#7c3aed',
        borderColor: 'rgba(124, 58, 237, 0.5)',
        icon: 'ti ti-stars'
      }
    ],
    dark: [
      {
        name: '凌晨',
        start: 0,
        end: 6,
        bgColor: 'rgba(30, 41, 59, 0.6)',
        textColor: '#93c5fd',
        borderColor: 'rgba(93, 188, 252, 0.35)',
        icon: 'ti ti-moon'
      },
      {
        name: '上午',
        start: 6,
        end: 12,
        bgColor: 'rgba(20, 70, 89, 0.45)',
        textColor: '#60a5fa',
        borderColor: 'rgba(96, 165, 250, 0.4)',
        icon: 'ti ti-sunrise'
      },
      {
        name: '中午',
        start: 12,
        end: 14,
        bgColor: 'rgba(101, 73, 18, 0.4)',
        textColor: '#fbbf24',
        borderColor: 'rgba(251, 191, 36, 0.45)',
        icon: 'ti ti-sun'
      },
      {
        name: '下午',
        start: 14,
        end: 18,
        bgColor: 'rgba(107, 45, 14, 0.4)',
        textColor: '#fb923c',
        borderColor: 'rgba(251, 146, 60, 0.45)',
        icon: 'ti ti-sunset'
      },
      {
        name: '晚上',
        start: 18,
        end: 24,
        bgColor: 'rgba(55, 48, 163, 0.35)',
        textColor: '#a78bfa',
        borderColor: 'rgba(167, 139, 250, 0.4)',
        icon: 'ti ti-stars'
      }
    ]
  }
} as const;

// 主题2切换配置
export const THEME2_TOGGLE_CONFIG = {
  buttonId: 'w95-theme2-toggle-btn',
  styleId: 'w95-theme2-style',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  storageKey: 'w95.theme2Loaded',
  cssFilePath: 'css/theme2.css'
} as const;

// 隐藏OCR图片块配置
export const OCR_IMAGE_BLOCK_TOGGLE_CONFIG = {
  buttonId: 'w95-ocr-image-block-toggle-btn',
  containerSelector: '.orca-menu.orca-search-modal',
  footerSelector: '.orca-search-modal-footer',
  targetBlockSelector: '.orca-menu-item.orca-search-modal-block-item',
  photoClassSelector: '.ti-photo',
  retryInterval: 300,
  maxRetries: 30,
  storageKey: 'w95.ocrImageBlockState',
  stateTextMap: {
    0: '关闭',
    1: '隐藏OCR图片块',
    2: '仅显示OCR图片块'
  },
  stateTitleMap: {
    0: '当前：关闭，点击隐藏OCR图片块',
    1: '当前：隐藏OCR图片块，点击仅显示OCR图片块',
    2: '当前：仅显示OCR图片块，点击关闭'
  }
} as const;

// 特定标签查询隐藏切换配置
export const QUERY_TAG_TOGGLE_CONFIG = {
  buttonId: 'w95-query-tag-toggle-btn',
  toolbarSelector: TOOLBAR_BUTTON_CONFIG.toolbarSelector,
  targetPanelSelector: TOOLBAR_BUTTON_CONFIG.targetPanelSelector,
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries,
  storageKey: 'w95.queryTagToggleState',
  settingsKey: 'w95.queryTagToggleSettings'
} as const;

// GLSL滤镜切换配置
export const GLSL_FILTER_TOGGLE_CONFIG = {
  buttonId: 'w95-glsl-filter-toggle-btn',
  storageKey: 'w95.glslFilterToggleState',
  retryInterval: TOOLBAR_BUTTON_CONFIG.retryInterval,
  maxRetries: TOOLBAR_BUTTON_CONFIG.maxRetries
} as const;