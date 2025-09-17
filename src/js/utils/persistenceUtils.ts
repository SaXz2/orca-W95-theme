/**
 * 统一的状态持久化工具类
 * 使用Orca官方API进行数据持久化，支持从localStorage迁移
 */

export class PersistenceManager {
  private pluginName: string;

  constructor(pluginName: string) {
    this.pluginName = pluginName;
  }

  /**
   * 保存状态数据
   */
  async saveState(key: string, value: any): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await orca.plugins.setData(this.pluginName, key, serializedValue);
    } catch (error) {
      console.error(`[${this.pluginName}] 状态保存失败:`, error);
      // 降级到localStorage作为备用方案
      try {
        localStorage.setItem(`${this.pluginName}.${key}`, 
          typeof value === 'string' ? value : JSON.stringify(value));
      } catch (fallbackError) {
        console.error(`[${this.pluginName}] localStorage备用保存也失败:`, fallbackError);
      }
    }
  }

  /**
   * 读取状态数据，支持从localStorage自动迁移
   */
  async loadState(key: string, defaultValue: any = null): Promise<any> {
    try {
      // 首先尝试从Orca官方API读取
      const orcaValue = await orca.plugins.getData(this.pluginName, key);
      if (orcaValue !== undefined && orcaValue !== null) {
        return this.parseValue(orcaValue, defaultValue);
      }

      // 如果Orca API中没有数据，尝试从localStorage迁移
      const legacyKey = `${this.pluginName}.${key}`;
      const localStorageValue = localStorage.getItem(legacyKey);
      if (localStorageValue !== null) {
        console.log(`[${this.pluginName}] 检测到localStorage数据，正在迁移到Orca API: ${key}`);
        
        // 迁移数据到Orca API
        await this.saveState(key, localStorageValue);
        
        // 删除localStorage中的旧数据
        localStorage.removeItem(legacyKey);
        
        return this.parseValue(localStorageValue, defaultValue);
      }

      return defaultValue;
    } catch (error) {
      console.error(`[${this.pluginName}] 状态读取失败:`, error);
      
      // 降级到localStorage
      try {
        const fallbackValue = localStorage.getItem(`${this.pluginName}.${key}`);
        return fallbackValue !== null ? this.parseValue(fallbackValue, defaultValue) : defaultValue;
      } catch (fallbackError) {
        console.error(`[${this.pluginName}] localStorage备用读取也失败:`, fallbackError);
        return defaultValue;
      }
    }
  }

  /**
   * 删除状态数据
   */
  async removeState(key: string): Promise<void> {
    try {
      await orca.plugins.removeData(this.pluginName, key);
      // 同时清理可能存在的localStorage数据
      localStorage.removeItem(`${this.pluginName}.${key}`);
    } catch (error) {
      console.error(`[${this.pluginName}] 状态删除失败:`, error);
    }
  }

  /**
   * 解析存储的值
   */
  private parseValue(value: any, defaultValue: any): any {
    if (typeof value === 'string') {
      // 尝试解析JSON
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (value === 'null') return null;
      if (value === 'undefined') return defaultValue;
      
      // 尝试解析数字
      if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) {
        return Number(value);
      }
      
      // 尝试解析JSON对象/数组
      try {
        return JSON.parse(value);
      } catch {
        // 如果解析失败，返回原始字符串
        return value;
      }
    }
    return value;
  }

  /**
   * 批量迁移localStorage数据到Orca API
   */
  async migrateFromLocalStorage(keys: string[]): Promise<void> {
    console.log(`[${this.pluginName}] 开始批量迁移localStorage数据...`);
    
    for (const key of keys) {
      try {
        await this.loadState(key); // 这会自动触发迁移
      } catch (error) {
        console.error(`[${this.pluginName}] 迁移键 ${key} 失败:`, error);
      }
    }
    
    console.log(`[${this.pluginName}] localStorage数据迁移完成`);
  }
}

/**
 * 创建持久化管理器的工厂函数
 */
export function createPersistenceManager(pluginName: string): PersistenceManager {
  return new PersistenceManager(pluginName);
}
