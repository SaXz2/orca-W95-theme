/**
 * 查询视图切换插件类型定义
 */

// 插件配置接口
export interface QueryViewToggleConfig {
  id: string;
  command: string;
  storageKey: string;
  defaultShortcut: string;
  observerOptions: MutationObserverInit;
}

// 状态管理接口
export interface QueryViewToggleState {
  hiddenIds: Record<string, boolean>;
  styleElement: HTMLStyleElement | null;
  observer: MutationObserver | null;
  isInitialized: boolean;
}

// 公共 API 接口
export interface QueryViewToggleAPI {
  toggle: (blockId: string) => void;
  show: (blockId: string) => void;
  hide: (blockId: string) => void;
  getState: (blockId: string) => boolean;
  destroy: () => void;
}

// 跨标签页消息类型
export interface CrossTabMessage {
  type: 'stateUpdate';
  hiddenIds: Record<string, boolean>;
}

// 插件类接口
export interface QueryViewTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => QueryViewToggleAPI;
}

// 标题编号切换配置接口
export interface HeadingNumberToggleConfig {
  buttonId: string;
  numberClass: string;
  toolbarSelector: string;
  retryInterval: number;
  maxRetries: number;
  storageKey: string;
}

// 标题编号切换状态接口
export interface HeadingNumberToggleState {
  isEnabled: boolean;
  retryCount: number;
  observer: MutationObserver | null;
  isInitialized: boolean;
}

// 标题编号切换 API 接口
export interface HeadingNumberToggleAPI {
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
  destroy: () => void;
}

// 标题编号切换插件接口
export interface HeadingNumberTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => HeadingNumberToggleAPI;
}

/**
 * 属性折叠切换（针对 .orca-repr-tag-props）类型定义
 */
export interface PropsToggleConfig {
  id: string;
  containerSelector: string;
  buttonClass: string;
  buttonContainerClass: string;
  observerOptions: MutationObserverInit;
}

export interface PropsToggleState {
  observer: MutationObserver | null;
  isInitialized: boolean;
}

export interface PropsToggleAPI {
  /** 重新扫描并初始化未处理容器 */
  refresh: () => void;
  /** 销毁模块 */
  destroy: () => void;
}

export interface PropsTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => PropsToggleAPI;
}

/**
 * 仅块引用隐藏切换（面板级按钮）类型定义
 */
export interface QueryBlockRefToggleConfig {
  id: string;
  buttonId: string;
  toolbarSelector: string;
  targetPanelSelector: string;
  retryInterval: number;
  maxRetries: number;
}

export interface QueryBlockRefToggleState {
  isHidden: boolean;
  retryCount: number;
  observer: MutationObserver | null;
  isInitialized: boolean;
}

export interface QueryBlockRefToggleAPI {
  toggle: () => void;
  show: () => void;
  hide: () => void;
  getState: () => boolean;
  destroy: () => void;
}

export interface QueryBlockRefTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => QueryBlockRefToggleAPI;
}

/**
 * 仅块引用背景色高亮切换类型定义
 */
export interface QueryBlockHighlightToggleConfig {
  buttonId: string;
  toolbarSelector: string;
  targetPanelSelector: string;
  retryInterval: number;
  maxRetries: number;
  highlightColor: string;
  storageKey: string;
}

export interface QueryBlockHighlightToggleState {
  isHighlighted: boolean;
  retryCount: number;
  mainObserver: MutationObserver | null;
  blockObserver: MutationObserver | null;
  highlightedBlocks: Set<Element>;
  isInitialized: boolean;
}

export interface QueryBlockHighlightToggleAPI {
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  getState: () => boolean;
  destroy: () => void;
}

export interface QueryBlockHighlightTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => QueryBlockHighlightToggleAPI;
}

// ========================================
//   镜像容器切换相关类型定义
// ========================================

export interface MirrorContainerToggleState {
  isHidden: boolean;
  retryCount: number;
  isInitialized: boolean;
}

export interface MirrorContainerToggleAPI {
  toggle: () => void;
  show: () => void;
  hide: () => void;
  getState: () => boolean;
  destroy: () => void;
}

export interface MirrorContainerToggleConfig {
  buttonId: string;
  styleId: string;
  toolbarSelector: string;
  targetPanelSelector: string;
  retryInterval: number;
  maxRetries: number;
  storageKey: string;
}

export interface MirrorContainerTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => MirrorContainerToggleAPI;
}

// ========================================
//   列表面包屑切换相关类型定义
// ========================================

export interface ListBreadcrumbToggleState {
  isHidden: boolean;
  retryCount: number;
  observer: MutationObserver | null;
  isInitialized: boolean;
}

export interface ListBreadcrumbToggleAPI {
  toggle: () => void;
  show: () => void;
  hide: () => void;
  getState: () => boolean;
  destroy: () => void;
}

export interface ListBreadcrumbToggleConfig {
  buttonId: string;
  styleId: string;
  toolbarSelector: string;
  targetPanelSelector: string;
  retryInterval: number;
  maxRetries: number;
  storageKey: string;
}

export interface ListBreadcrumbTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => ListBreadcrumbToggleAPI;
}

// ========================================
//   卡片视图极简切换相关类型定义
// ========================================

export interface CardViewMinimalToggleState {
  isMinimal: boolean;
  retryCount: number;
  isInitialized: boolean;
}

export interface CardViewMinimalToggleAPI {
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  getState: () => boolean;
  destroy: () => void;
}

export interface CardViewMinimalToggleConfig {
  buttonId: string;
  styleId: string;
  toolbarSelector: string;
  targetPanelSelector: string;
  retryInterval: number;
  maxRetries: number;
  storageKey: string;
}

export interface CardViewMinimalTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => CardViewMinimalToggleAPI;
}

// ========================================
//   卡片封面比例切换相关类型定义
// ========================================

export interface CardCoverAspectRatioState {
  currentState: number;
  retryCount: number;
  observer: MutationObserver | null;
  isInitialized: boolean;
  customRatios: AspectRatioState[];
  settingsModalOpen: boolean;
}

export interface CardCoverAspectRatioAPI {
  toggle: () => void;
  setState: (state: number) => void;
  getState: () => number;
  getCurrentRatio: () => string;
  openSettings: () => void;
  destroy: () => void;
}

export interface AspectRatioState {
  ratio: string;
  icon: string;
  title: string;
}

export interface CardCoverAspectRatioConfig {
  buttonId: string;
  styleId: string;
  toolbarSelector: string;
  targetPanelSelector: string;
  retryInterval: number;
  maxRetries: number;
  storageKey: string;
  states: AspectRatioState[];
}

export interface CardCoverAspectRatioPlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => CardCoverAspectRatioAPI;
}

// ========================================
//   查询列表块创建时间显示相关类型定义
// ========================================

export interface QueryListBlockCreationTimeState {
  isEnabled: boolean;
  retryCount: number;
  observer: MutationObserver | null;
  isInitialized: boolean;
}

export interface QueryListBlockCreationTimeAPI {
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
  refresh: () => void;
  destroy: () => void;
  getProcessedCount: () => number;
  getTotalCount: () => number;
}

export interface TimePeriod {
  name: string;
  start: number;
  end: number;
  textColor: string;
  borderColor: string;
  icon: string;
  bgColor?: string;
}

export interface ColorScheme {
  light: TimePeriod[];
  dark: TimePeriod[];
}

export interface QueryListBlockCreationTimeConfig {
  buttonId: string;
  styleId: string;
  targetSelector: string;
  timeFormat: string;
  retryInterval: number;
  maxRetries: number;
  storageKey: string;
  colorSchemes: ColorScheme;
}

export interface QueryListBlockCreationTimePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => QueryListBlockCreationTimeAPI;
}

// ========================================
//   主题2切换相关类型定义
// ========================================

export interface Theme2ToggleState {
  isThemeLoaded: boolean;
  retryCount: number;
  observer: MutationObserver | null;
  isInitialized: boolean;
}

export interface Theme2ToggleAPI {
  toggle: () => void;
  loadTheme: () => void;
  removeTheme: () => void;
  getState: () => boolean;
  destroy: () => void;
}

export interface Theme2ToggleConfig {
  buttonId: string;
  styleId: string;
  toolbarSelector: string;
  retryInterval: number;
  maxRetries: number;
  storageKey: string;
  cssFilePath: string;
}

export interface Theme2TogglePlugin {
  initialize: () => Promise<void>;
  destroy: () => void;
  getAPI: () => Theme2ToggleAPI;
}

// ========================================
//   隐藏OCR图片块相关类型定义
// ========================================

export interface OcrImageBlockToggleState {
  currentState: number;
  retryCount: number;
  mainObserver: MutationObserver | null;
  isInitialized: boolean;
}

export interface OcrImageBlockToggleAPI {
  toggle: () => void;
  setState: (state: number) => void;
  getState: () => number;
  updateBlocksDisplay: () => void;
  destroy: () => void;
}

export interface OcrImageBlockToggleConfig {
  buttonId: string;
  containerSelector: string;
  footerSelector: string;
  targetBlockSelector: string;
  photoClassSelector: string;
  retryInterval: number;
  maxRetries: number;
  storageKey: string;
  stateTextMap: Record<number, string>;
  stateTitleMap: Record<number, string>;
}

export interface OcrImageBlockTogglePlugin {
  initialize: () => void;
  destroy: () => void;
  getAPI: () => OcrImageBlockToggleAPI;
}