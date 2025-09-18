/**
 * 共享观察者管理器
 * 提供统一的 MutationObserver 管理，减少多个观察者带来的性能开销
 */

// 观察者回调类型
export type ObserverCallback = (mutations: MutationRecord[], observer: MutationObserver) => void;

// 观察者注册信息
interface ObserverRegistration {
  id: string;
  callback: ObserverCallback;
  priority: number;
}

/**
 * 共享观察者管理器
 * 统一管理所有 MutationObserver，减少性能开销
 */
export class SharedObserverManager {
  private static instance: SharedObserverManager;
  private mainObserver: MutationObserver | null = null;
  private callbacks: Map<string, ObserverRegistration> = new Map();
  private throttleTimer: number | null = null;
  private throttleDelay: number = 100; // 节流延迟时间（毫秒）

  // 单例模式
  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): SharedObserverManager {
    if (!SharedObserverManager.instance) {
      SharedObserverManager.instance = new SharedObserverManager();
    }
    return SharedObserverManager.instance;
  }

  /**
   * 初始化共享观察者
   */
  public initialize(throttleDelay: number = 100): void {
    if (this.mainObserver) return;

    this.throttleDelay = throttleDelay;
    
    // 创建主观察者
    this.mainObserver = new MutationObserver((mutations) => {
      // 使用节流逻辑处理变化，避免频繁触发回调
      if (this.throttleTimer !== null) return;
      
      this.throttleTimer = window.setTimeout(() => {
        // 按优先级排序回调
        const sortedCallbacks = Array.from(this.callbacks.values())
          .sort((a, b) => a.priority - b.priority);
        
        // 执行所有回调
        for (const registration of sortedCallbacks) {
          try {
            registration.callback(mutations, this.mainObserver!);
          } catch (error) {
            console.error(`观察者回调 ${registration.id} 执行出错:`, error);
          }
        }
        
        this.throttleTimer = null;
      }, this.throttleDelay);
    });

    // 观察文档变化
    this.mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    console.log('✅ 共享观察者管理器已初始化');
  }

  /**
   * 注册观察者回调
   * @param id 回调唯一标识
   * @param callback 回调函数
   * @param priority 优先级（数字越小越先执行）
   */
  public register(id: string, callback: ObserverCallback, priority: number = 10): void {
    this.callbacks.set(id, { id, callback, priority });
    
    // 如果主观察者尚未初始化，则初始化
    if (!this.mainObserver) {
      this.initialize();
    }
  }

  /**
   * 注销观察者回调
   */
  public unregister(id: string): void {
    this.callbacks.delete(id);
  }

  /**
   * 销毁共享观察者
   */
  public destroy(): void {
    if (this.mainObserver) {
      this.mainObserver.disconnect();
      this.mainObserver = null;
    }

    if (this.throttleTimer !== null) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }

    this.callbacks.clear();
    console.log('✅ 共享观察者管理器已销毁');
  }

  /**
   * 手动触发所有回调
   * 用于初始化时处理已有的 DOM 元素
   */
  public triggerCallbacks(): void {
    const sortedCallbacks = Array.from(this.callbacks.values())
      .sort((a, b) => a.priority - b.priority);
    
    for (const registration of sortedCallbacks) {
      try {
        // 传递空数组作为 mutations
        registration.callback([], this.mainObserver!);
      } catch (error) {
        console.error(`观察者回调 ${registration.id} 执行出错:`, error);
      }
    }
  }

  /**
   * 获取已注册的回调数量
   */
  public getCallbackCount(): number {
    return this.callbacks.size;
  }
}

// 导出单例实例
export const observerManager = SharedObserverManager.getInstance();