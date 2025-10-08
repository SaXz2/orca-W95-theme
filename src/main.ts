import zhCN from "./translations/zhCN";
import {
  setupL10N,
  PluginManager,
  QueryViewTogglePluginImpl,
  PropsTogglePluginImpl,
  OcrImageBlockTogglePluginImpl,
  ToolbarButtonManager,
  TOOLBAR_BUTTON_CONFIG,
  observerManager
} from "./js";
import { HeadingNumberSidetoolImpl } from "./js/plugins/headingNumberSidetool";
import { QueryTagSidetoolImpl } from "./js/plugins/queryTagSidetool";
import { QueryBlockRefSidetoolImpl } from "./js/plugins/queryBlockRefSidetool";
import { QueryBlockHighlightSidetoolImpl } from "./js/plugins/queryBlockHighlightSidetool";
import { MirrorContainerSidetoolImpl } from "./js/plugins/mirrorContainerSidetool";
import { ListBreadcrumbSidetoolImpl } from "./js/plugins/listBreadcrumbSidetool";
import { CardViewMinimalSidetoolImpl } from "./js/plugins/cardViewMinimalSidetool";
import { CardCoverAspectRatioSidetoolImpl } from "./js/plugins/cardCoverAspectRatioSidetool";
import { QueryListBlockCreationTimeSidetoolImpl } from "./js/plugins/queryListBlockCreationTimeSidetool";
import { Theme2SidetoolImpl } from "./js/plugins/theme2Sidetool";
import { PopupToolbarSidetoolImpl } from "./js/plugins/popupToolbarSidetool";

let pluginName: string;
let pluginManager: PluginManager;
let buttonManager: ToolbarButtonManager;
let headingNumberSidetool: HeadingNumberSidetoolImpl;
let queryTagSidetool: QueryTagSidetoolImpl;
let queryBlockRefSidetool: QueryBlockRefSidetoolImpl;
let queryBlockHighlightSidetool: QueryBlockHighlightSidetoolImpl;
let mirrorContainerSidetool: MirrorContainerSidetoolImpl;
let listBreadcrumbSidetool: ListBreadcrumbSidetoolImpl;
let cardViewMinimalSidetool: CardViewMinimalSidetoolImpl;
let cardCoverAspectRatioSidetool: CardCoverAspectRatioSidetoolImpl;
let queryListBlockCreationTimeSidetool: QueryListBlockCreationTimeSidetoolImpl;
let theme2Sidetool: Theme2SidetoolImpl;
let popupToolbarSidetool: PopupToolbarSidetoolImpl;

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

  // 先初始化按钮管理器，开始添加按钮
  buttonManager.initialize();

  // 初始化并注册主题2侧边栏工具（优先级1）- 保留完整功能
  theme2Sidetool = new Theme2SidetoolImpl(pluginName);
  await theme2Sidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('01.w95.theme2Toggle', {
    render: theme2Sidetool.renderSidetool
  });

  // 初始化标题编号侧边栏工具（优先级2）
  headingNumberSidetool = new HeadingNumberSidetoolImpl(pluginName);
  await headingNumberSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('02.w95.headingNumberToggle', {
    render: headingNumberSidetool.renderSidetool
  });

  // 初始化并注册查询标签侧边栏工具（优先级4）
  queryTagSidetool = new QueryTagSidetoolImpl(pluginName);
  await queryTagSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('04.w95.queryTagToggle', {
    render: queryTagSidetool.renderSidetool
  });

  // 初始化并注册查询块引用侧边栏工具（优先级6）
  queryBlockRefSidetool = new QueryBlockRefSidetoolImpl(pluginName);
  await queryBlockRefSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('06.w95.queryBlockRefToggle', {
    render: queryBlockRefSidetool.renderSidetool
  });

  // 初始化并注册查询块高亮侧边栏工具（优先级7）
  queryBlockHighlightSidetool = new QueryBlockHighlightSidetoolImpl(pluginName);
  await queryBlockHighlightSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('07.w95.queryBlockHighlightToggle', {
    render: queryBlockHighlightSidetool.renderSidetool
  });

  // 初始化并注册镜像容器侧边栏工具（优先级8）
  mirrorContainerSidetool = new MirrorContainerSidetoolImpl(pluginName);
  await mirrorContainerSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('08.w95.mirrorContainerToggle', {
    render: mirrorContainerSidetool.renderSidetool
  });

  // 初始化并注册列表面包屑侧边栏工具（优先级9）
  listBreadcrumbSidetool = new ListBreadcrumbSidetoolImpl(pluginName);
  await listBreadcrumbSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('09.w95.listBreadcrumbToggle', {
    render: listBreadcrumbSidetool.renderSidetool
  });

  // 初始化并注册卡片视图极简侧边栏工具（优先级10）
  cardViewMinimalSidetool = new CardViewMinimalSidetoolImpl(pluginName);
  await cardViewMinimalSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('10.w95.cardViewMinimalToggle', {
    render: cardViewMinimalSidetool.renderSidetool
  });

  // 初始化并注册卡片封面比例侧边栏工具（优先级11）
  cardCoverAspectRatioSidetool = new CardCoverAspectRatioSidetoolImpl(pluginName);
  await cardCoverAspectRatioSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('11.w95.cardCoverAspectRatioToggle', {
    render: cardCoverAspectRatioSidetool.renderSidetool
  });

  // 初始化并注册查询列表块创建时间侧边栏工具（优先级12）
  queryListBlockCreationTimeSidetool = new QueryListBlockCreationTimeSidetoolImpl(pluginName);
  await queryListBlockCreationTimeSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('12.w95.queryListBlockCreationTime', {
    render: queryListBlockCreationTimeSidetool.renderSidetool
  });

  // 初始化并注册悬浮工具栏侧边栏工具（优先级15）
  popupToolbarSidetool = new PopupToolbarSidetoolImpl(pluginName);
  await popupToolbarSidetool.initialize();
  orca.editorSidetools.registerEditorSidetool('15.w95.popupToolbarToggle', {
    render: popupToolbarSidetool.renderSidetool
  });

  // 注册所有插件（按优先级顺序）
  pluginManager.register('queryViewToggle', QueryViewTogglePluginImpl, 1);
  pluginManager.register('propsToggle', PropsTogglePluginImpl, 3);
  pluginManager.register('ocrImageBlockToggle', OcrImageBlockTogglePluginImpl, 14);
}

export async function unload() {
  // 卸载主题2侧边栏工具
  if (theme2Sidetool) {
    orca.editorSidetools.unregisterEditorSidetool('01.w95.theme2Toggle');
    theme2Sidetool.destroy();
  }

  // 卸载标题编号侧边栏工具
  if (headingNumberSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('02.w95.headingNumberToggle');
    headingNumberSidetool.destroy();
  }

  // 卸载查询标签侧边栏工具
  if (queryTagSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('04.w95.queryTagToggle');
    queryTagSidetool.destroy();
  }

  // 卸载查询块引用侧边栏工具
  if (queryBlockRefSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('06.w95.queryBlockRefToggle');
    queryBlockRefSidetool.destroy();
  }

  // 卸载查询块高亮侧边栏工具
  if (queryBlockHighlightSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('07.w95.queryBlockHighlightToggle');
    queryBlockHighlightSidetool.destroy();
  }

  // 卸载镜像容器侧边栏工具
  if (mirrorContainerSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('08.w95.mirrorContainerToggle');
    mirrorContainerSidetool.destroy();
  }

  // 卸载列表面包屑侧边栏工具
  if (listBreadcrumbSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('09.w95.listBreadcrumbToggle');
    listBreadcrumbSidetool.destroy();
  }

  // 卸载卡片视图极简侧边栏工具
  if (cardViewMinimalSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('10.w95.cardViewMinimalToggle');
    cardViewMinimalSidetool.destroy();
  }

  // 卸载卡片封面比例侧边栏工具
  if (cardCoverAspectRatioSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('11.w95.cardCoverAspectRatioToggle');
    cardCoverAspectRatioSidetool.destroy();
  }

  // 卸载查询列表块创建时间侧边栏工具
  if (queryListBlockCreationTimeSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('12.w95.queryListBlockCreationTime');
    queryListBlockCreationTimeSidetool.destroy();
  }

  // 卸载悬浮工具栏侧边栏工具
  if (popupToolbarSidetool) {
    orca.editorSidetools.unregisterEditorSidetool('15.w95.popupToolbarToggle');
    popupToolbarSidetool.destroy();
  }

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
