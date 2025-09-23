# Changelog

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
