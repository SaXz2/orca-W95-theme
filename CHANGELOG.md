# Changelog

## [1.0.7] - 2024-12-19

### 🎨 Major Features
- **真正的GLSL滤镜实现**: 使用WebGL渲染真正的GLSL着色器滤镜效果
- **右键菜单选择**: 右键按钮可以选择具体的GLSL文件
- **动态文件读取**: 自动读取glsl文件夹中的所有.glsl文件
- **WebGL渲染器**: 高性能的WebGL渲染引擎，支持实时滤镜效果

### 🔧 Technical Improvements
- **WebGL渲染器**: 创建了完整的WebGL渲染管线
- **GLSL文件管理器**: 智能文件加载和缓存系统
- **右键菜单系统**: 自定义右键菜单选择滤镜文件
- **渲染循环优化**: 高效的动画帧渲染循环

### 📁 Files Added
- `src/js/utils/glslRenderer.ts`: WebGL渲染器工具类
- `src/js/utils/glslFileManager.ts`: GLSL文件管理器
- `dist/glsl/`: 32个GLSL滤镜文件

### 🚀 New Capabilities
- **真实GLSL效果**: 不再是CSS模拟，而是真正的着色器效果
- **文件选择**: 右键菜单列出所有可用的GLSL文件
- **动态加载**: 运行时动态加载和编译GLSL文件
- **高性能渲染**: WebGL硬件加速渲染

### ✅ Verified
- WebGL渲染器正常工作
- GLSL文件管理器成功加载文件
- 右键菜单功能完整
- 滤镜效果实时渲染

---

## [1.0.6] - 2024-12-19

### 🎨 New Features
- **新增GLSL滤镜切换功能**: 添加了 `glslFilterToggle` 插件，提供多种预设滤镜效果
- **滤镜效果丰富**: 包含复古、黑白、暖色、冷色、高对比、模糊、锐化、霓虹、怀旧等10种滤镜
- **自动下载GLSL文件**: 构建时自动从 [ghostty-shaders](https://github.com/hackr-sh/ghostty-shaders) 仓库下载32个GLSL文件
- **状态持久化**: 滤镜选择状态自动保存，重启后保持用户设置

### 🔧 Technical Improvements
- **CSS滤镜实现**: 使用CSS滤镜属性实现视觉效果，性能优秀
- **循环切换**: 按钮点击循环切换不同滤镜效果
- **文件管理**: 自动下载和管理GLSL文件，为将来扩展做准备
- **构建优化**: 新增 `download-glsl` 和 `build-with-glsl` 脚本命令

### 📁 Files Added
- `src/js/plugins/glslFilterToggle.ts`: GLSL滤镜切换插件
- `scripts/download-glsl.cjs`: GLSL文件自动下载脚本
- `dist/glsl/`: GLSL滤镜文件目录（32个文件）
- `src/glsl/`: 源GLSL文件目录

### 📝 Documentation
- **更新README**: 添加GLSL滤镜功能说明
- **完善类型定义**: 新增GLSL相关TypeScript类型

### ✅ Verified
- GLSL文件下载功能正常工作
- 滤镜切换效果流畅
- 状态持久化功能正常
- 构建流程完整

---

## [1.0.5] - 2024-12-19

### 🎨 New Features
- **增强镜像容器切换功能**: 优化了 `mirrorContainerToggle` 插件的显示逻辑和用户体验
- **改进主题样式**: 更新了按钮、编辑器和侧边栏的样式，提升整体视觉效果

### 🔧 Technical Improvements
- **CSS样式优化**: 
  - 更新了 `buttons.css` 的样式定义
  - 改进了 `editor.css` 的编辑器样式
  - 优化了 `sidebar.css` 的侧边栏样式
  - 增强了 `theme2.css` 的主题2样式
- **插件功能增强**: 
  - 改进了 `mirrorContainerToggle.ts` 的功能实现
  - 优化了状态管理和用户交互

### 📝 Documentation
- **更新README**: 完善了项目说明文档，提供更详细的使用指南

### ✅ Verified
- 所有样式更新已测试通过
- 插件功能正常工作
- 文档内容准确完整

---

## [1.0.4] - 2024-12-19

### 🐛 Bug Fixes
- **修复标签查询隐藏逻辑**: 优化了 `queryTagToggle` 的CSS选择器，避免隐藏已折叠或有子内容的查询块
- **修复主题切换状态同步**: 解决了多个主题切换插件实例之间的状态不一致问题

### ⚡ Performance Improvements
- **优化主题切换性能**: 改进了 `theme2Toggle` 的状态管理机制，减少不必要的DOM操作
- **智能状态同步**: 使用 `CustomEvent` 实现全局状态通知，确保所有插件实例状态一致

### 🔧 Technical Improvements
- **queryTagToggle.ts**: 
  - 更新CSS选择器为更精确的过滤条件
  - 避免误隐藏有内容的查询块
- **theme2Toggle.ts**:
  - 添加全局状态同步机制
  - 改进初始化顺序和状态管理
  - 优化按钮状态更新逻辑
  - 添加事件监听器处理状态变化

### ✅ Verified
- 标签查询隐藏功能更加智能，不会误隐藏有内容的块
- 主题切换状态在多个插件实例间保持同步
- 按钮状态更新更加准确和及时

---

## [1.0.3] - 2024-12-19

### 🎨 New Features
- **新增标签查询隐藏功能**: 添加了 `queryTagToggle` 插件，可以隐藏/显示带有"空"标签的查询块
- **智能标签过滤**: 支持通过工具栏按钮快速切换显示状态，提升查询界面的整洁度
- **状态持久化**: 隐藏状态会自动保存，页面刷新后保持用户设置

### 🔧 Technical Improvements
- **CSS样式优化**: 使用CSS选择器 `:has()` 实现高效的标签匹配和隐藏
- **无闪烁初始化**: 插件在初始化时立即应用样式，避免页面加载时的闪烁问题
- **观察者模式**: 使用 MutationObserver 监听DOM变化，自动处理动态内容

### 📁 Files Added
- `src/js/plugins/queryTagToggle.ts`: 新增标签查询隐藏切换插件
- 相关类型定义和配置常量

### ✅ Verified
- 插件集成到主模块并正确注册
- 工具栏按钮正常显示和交互
- 状态持久化功能正常工作
- 无页面刷新闪烁问题

---

## [1.0.2] - 2024-12-19

### 🐛 Bug Fixes
- **修复页面刷新闪烁问题**: 修复了 `queryBlockRefToggle` 和 `ocrImageBlockToggle` 插件在页面刷新时出现的闪烁问题
- **优化初始化时机**: 所有插件现在在初始化时立即应用样式，确保隐藏效果在页面加载的最早期就生效
- **改进CSS选择器**: 修复了 `queryBlockRefToggle` 的CSS选择器，确保隐藏逻辑与原来完全一致

### ⚡ Performance Improvements
- **CSS替代DOM操作**: 将直接DOM操作改为CSS样式方式，提高性能并减少重排重绘
- **简化代码逻辑**: 移除了复杂的DOM状态跟踪和节流机制，代码更简洁

### 🔧 Technical Changes
- **queryBlockRefToggle.ts**: 改为使用CSS样式方式处理仅块引用隐藏
- **ocrImageBlockToggle.ts**: 改为使用CSS样式方式处理OCR图片块显示/隐藏
- **types.ts**: 更新了相关类型定义，移除不再需要的属性

### ✅ Verified
- 全面检查了所有插件，确认无其他闪烁问题
- 所有插件都使用CSS样式方式，初始化时机正确
- 用户体验显著提升，页面加载更流畅

---

## [1.0.1] - 2024-12-18

### 🎨 Features
- 初始版本发布
- 完整的W95风格主题
- 多种功能切换插件

---

## [1.0.0] - 2024-12-17

### 🎉 Initial Release
- 首次发布
- 基础W95主题样式
