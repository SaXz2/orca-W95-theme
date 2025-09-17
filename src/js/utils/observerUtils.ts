/**
 * 观察者工具函数
 * 提供通用的MutationObserver设置和管理功能
 */

export interface ObserverConfig {
  targetPanelSelector: string;
  toolbarSelector: string;
  observerOptions: MutationObserverInit;
}

/**
 * 创建主观察者：监听面板切换，确保按钮在新页面正常工作
 */
export function createMainObserver(
  config: ObserverConfig,
  onPanelChange: (activePanel: Element | null) => void
): MutationObserver {
  return new MutationObserver((mutations) => {
    const activePanel = document.querySelector(config.targetPanelSelector);
    onPanelChange(activePanel);
  });
}

/**
 * 创建区块观察者：监听特定面板内的变化
 */
export function createBlockObserver(
  activePanel: Element,
  onContentChange: () => void,
  observerOptions: MutationObserverInit = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
    attributeOldValue: true
  }
): MutationObserver {
    const observer = new MutationObserver((mutations) => {
      // 检查是否需要更新
      const needUpdate = mutations.some(mutation => {
        // 折叠状态变化（.orca-repr-main 的 class 变化）
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'class' &&
            mutation.target instanceof Element &&
            mutation.target.classList.contains('orca-repr-main')) {
          return true;
        }
        // 子内容变化（.orca-repr-children 的子元素变化）
        if (mutation.type === 'childList' &&
            mutation.target instanceof Element &&
            mutation.target.closest('.orca-repr-children')) {
          return true;
        }
        return false;
      });

      if (needUpdate) {
        onContentChange();
      }
    });

  // 观察当前激活面板的变化
  if (activePanel) {
    observer.observe(activePanel, observerOptions);
  }

  return observer;
}

/**
 * 启动主观察者
 */
export function startMainObserver(
  observer: MutationObserver,
  target: Element = document.body,
  options: MutationObserverInit = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  }
): void {
  observer.observe(target, options);
}

/**
 * 安全断开观察者
 */
export function disconnectObserver(observer: MutationObserver | null): void {
  if (observer) {
    observer.disconnect();
  }
}
