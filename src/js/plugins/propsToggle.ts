/**
 * 属性折叠切换模块（针对 .orca-repr-tag-props）
 * - 遵循最小可行方案：无持久化，仅按钮控制，不改现有样式行为
 */

import type { PropsToggleAPI, PropsTogglePlugin, PropsToggleState } from '../../types';
import { PROPS_TOGGLE_CONFIG } from '../../constants';

export class PropsTogglePluginImpl implements PropsTogglePlugin {
  private state: PropsToggleState = {
    observer: null,
    isInitialized: false
  };

  private initializedContainers = new WeakSet<Element>();

  public initialize(): void {
    if (this.state.isInitialized) return;

    this.checkAndInitContainers();
    this.startMutationObserver();

    this.state.isInitialized = true;
    console.log('✅ W95 属性折叠切换模块已初始化');
  }

  public destroy(): void {
    if (!this.state.isInitialized) return;

    if (this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
    }

    // 清理已创建的按钮容器
    document.querySelectorAll(`.${PROPS_TOGGLE_CONFIG.buttonContainerClass}`).forEach(el => el.remove());

    this.state.isInitialized = false;
    console.log('✅ W95 属性折叠切换模块已销毁');
  }

  public getAPI(): PropsToggleAPI {
    return {
      refresh: () => this.checkAndInitContainers(),
      destroy: () => this.destroy()
    };
  }

  private checkAndInitContainers(): void {
    const selector = `${PROPS_TOGGLE_CONFIG.containerSelector}:not([data-w95-props-initialized])`;
    const containers = document.querySelectorAll(selector);
    containers.forEach(container => {
      if (!this.initializedContainers.has(container)) {
        this.init(container as HTMLElement);
        this.initializedContainers.add(container);
        (container as HTMLElement).setAttribute('data-w95-props-initialized', 'true');
      }
    });
  }

  private startMutationObserver(): void {
    const observerTarget = document.body;
    this.state.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if ((node as Element).nodeType === 1) {
              const element = node as Element;
              if (element.matches?.(PROPS_TOGGLE_CONFIG.containerSelector) && !this.initializedContainers.has(element)) {
                this.init(element as HTMLElement);
                this.initializedContainers.add(element);
                (element as HTMLElement).setAttribute('data-w95-props-initialized', 'true');
              } else {
                element.querySelectorAll?.(`${PROPS_TOGGLE_CONFIG.containerSelector}:not([data-w95-props-initialized])`).forEach(container => {
                  if (!this.initializedContainers.has(container)) {
                    this.init(container as HTMLElement);
                    this.initializedContainers.add(container);
                    (container as HTMLElement).setAttribute('data-w95-props-initialized', 'true');
                  }
                });
              }
            }
          });
        }
      }
    });

    this.state.observer.observe(observerTarget, PROPS_TOGGLE_CONFIG.observerOptions);
  }

  private init(container: HTMLElement): void {
    // 保存原始 display/position
    const originalContainerStyle = {
      display: container.style.display,
      position: container.style.position
    } as const;

    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    // 移除旧按钮（同容器重复初始化保护）
    const containerId = this.getContainerId(container);
    const oldBtn = container.parentElement?.querySelector(`.${PROPS_TOGGLE_CONFIG.buttonClass}[data-for="${containerId}"]`);
    oldBtn?.remove();

    // 创建按钮容器（跟随 IIFE 样式行为，不调整视觉）
    const btnContainer = document.createElement('div');
    btnContainer.className = PROPS_TOGGLE_CONFIG.buttonContainerClass;
    btnContainer.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transform: translateX(3px);
      transition: all 0.5s ease;
      pointer-events: auto;
    `;

    container.parentElement?.appendChild(btnContainer);
    const rect = container.getBoundingClientRect();
    const parentRect = container.parentElement?.getBoundingClientRect();
    if (parentRect) {
      btnContainer.style.top = (rect.top - parentRect.top + 6) + 'px';
      btnContainer.style.right = (parentRect.right - rect.right + 6) + 'px';
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.className = PROPS_TOGGLE_CONFIG.buttonClass;
    toggleBtn.title = '切换显示/隐藏';
    toggleBtn.setAttribute('data-for', containerId);

    const collapseSvg = `
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L4 4L7 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    const expandSvg = `
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 4L4 1L7 4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    toggleBtn.innerHTML = collapseSvg;
    toggleBtn.style.cssText = `
      width: 18px;
      height: 18px;
      padding: 0;
      margin: 0;
      background: rgba(0,0,0,0.6);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, opacity 0.6s ease, background 0.6s ease;
      outline: none;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15);
      opacity: 1;
    `;

    btnContainer.appendChild(toggleBtn);

    let isHidden = false;
    let isBtnHovered = false;
    let isContainerHovered = false;

    const updateButtonState = () => {
      if (isHidden) {
        btnContainer.style.opacity = '1';
        btnContainer.style.visibility = 'visible';
        btnContainer.style.transform = 'translateX(0)';
        toggleBtn.style.opacity = isBtnHovered ? '1' : '0.35';
        toggleBtn.style.background = isBtnHovered ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)';
      } else {
        if (isContainerHovered || isBtnHovered) {
          btnContainer.style.opacity = '1';
          btnContainer.style.visibility = 'visible';
          btnContainer.style.transform = 'translateX(0)';
          toggleBtn.style.opacity = '1';
          toggleBtn.style.background = 'rgba(0,0,0,0.8)';
        } else {
          btnContainer.style.opacity = '0';
          btnContainer.style.visibility = 'hidden';
          btnContainer.style.transform = 'translateX(3px)';
          toggleBtn.style.opacity = '1';
          toggleBtn.style.background = 'rgba(0,0,0,0.6)';
        }
      }
    };

    const toggleDisplay = () => {
      toggleBtn.style.transform = 'scale(0.9)';
      setTimeout(() => (toggleBtn.style.transform = 'scale(1)'), 150);

      isHidden = !isHidden;
      if (isHidden) {
        container.style.display = 'none';
        toggleBtn.innerHTML = expandSvg;
      } else {
        container.style.display = originalContainerStyle.display || '';
        toggleBtn.innerHTML = collapseSvg;
      }
      updateButtonState();
    };

    container.addEventListener('mouseenter', () => {
      isContainerHovered = true;
      updateButtonState();
    });
    container.addEventListener('mouseleave', () => {
      isContainerHovered = false;
      updateButtonState();
    });
    toggleBtn.addEventListener('mouseenter', () => {
      isBtnHovered = true;
      updateButtonState();
    });
    toggleBtn.addEventListener('mouseleave', () => {
      isBtnHovered = false;
      updateButtonState();
    });
    toggleBtn.addEventListener('click', toggleDisplay);

    const containerObserver = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        btnContainer.remove();
        containerObserver.disconnect();
        this.initializedContainers.delete(container);
      }
    });
    containerObserver.observe(document.body, { childList: true, subtree: true });

    updateButtonState();
  }

  private getContainerId(container: HTMLElement): string {
    return container.id || `w95-props-${Math.random().toString(36).substr(2, 9)}`;
  }
}


