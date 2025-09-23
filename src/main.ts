import zhCN from "./translations/zhCN";
import {
  setupL10N,
  t,
  PluginManager,
  QueryViewTogglePluginImpl,
  HeadingNumberTogglePluginImpl,
  PropsTogglePluginImpl,
  QueryTagTogglePluginImpl,
  QueryBlockRefTogglePluginImpl,
  QueryBlockHighlightTogglePluginImpl,
  MirrorContainerTogglePluginImpl,
  ListBreadcrumbTogglePluginImpl,
  CardViewMinimalTogglePluginImpl,
  CardCoverAspectRatioTogglePluginImpl,
  QueryListBlockCreationTimePluginImpl,
  Theme2TogglePluginImpl,
  OcrImageBlockTogglePluginImpl,
  ToolbarButtonManager,
  TOOLBAR_BUTTON_CONFIG,
  observerManager
} from "./js";

let pluginName: string;
let pluginManager: PluginManager;
let buttonManager: ToolbarButtonManager;

export async function load(_name: string) {
  pluginName = _name;

  setupL10N(orca.state.locale, { "zh-CN": zhCN });

  // 主题注册
  orca.themes.register(pluginName, "W95", "css/theme.css");

  // 初始化共享观察者管理器
  observerManager.initialize(100); // 设置100ms的节流延迟

  // 初始化按钮管理器
  buttonManager = new ToolbarButtonManager(
    TOOLBAR_BUTTON_CONFIG.retryInterval,
    TOOLBAR_BUTTON_CONFIG.maxRetries,
    TOOLBAR_BUTTON_CONFIG.toolbarSelector,
    TOOLBAR_BUTTON_CONFIG.targetPanelSelector
  );

  // 初始化插件管理器
  pluginManager = new PluginManager(buttonManager, pluginName);

  // 注册所有插件（按优先级顺序）
  pluginManager.register('queryViewToggle', QueryViewTogglePluginImpl, 1);
  pluginManager.register('headingNumberToggle', HeadingNumberTogglePluginImpl, 2);
  pluginManager.register('propsToggle', PropsTogglePluginImpl, 3);
  pluginManager.register('queryTagToggle', QueryTagTogglePluginImpl, 4);
  pluginManager.register('queryBlockRefToggle', QueryBlockRefTogglePluginImpl, 6);
  pluginManager.register('queryBlockHighlightToggle', QueryBlockHighlightTogglePluginImpl, 7);
  pluginManager.register('mirrorContainerToggle', MirrorContainerTogglePluginImpl, 8);
  pluginManager.register('listBreadcrumbToggle', ListBreadcrumbTogglePluginImpl, 9);
  pluginManager.register('cardViewMinimalToggle', CardViewMinimalTogglePluginImpl, 10);
  pluginManager.register('cardCoverAspectRatioToggle', CardCoverAspectRatioTogglePluginImpl, 11);
  pluginManager.register('queryListBlockCreationTime', QueryListBlockCreationTimePluginImpl, 12);
  pluginManager.register('theme2Toggle', Theme2TogglePluginImpl, 13);
  pluginManager.register('ocrImageBlockToggle', OcrImageBlockTogglePluginImpl, 14);

  // 初始化按钮管理器，开始添加按钮
  buttonManager.initialize();
}

export async function unload() {
  // 卸载所有插件
  if (pluginManager) {
    pluginManager.unloadAll();
  }

  // 销毁按钮管理器
  if (buttonManager) {
    buttonManager.destroy();
  }

  // 销毁共享观察者管理器
  observerManager.destroy();

  // 取消主题注册
  orca.themes.unregister("W95");
}
