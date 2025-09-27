/**
 * GLSL文件管理器
 * - 读取glsl文件夹中的所有.glsl文件
 * - 提供文件列表和内容获取功能
 * - 支持动态加载和缓存
 */

export interface GlslFileInfo {
  name: string;
  path: string;
  content: string;
  description?: string;
}

export class GlslFileManager {
  private files: Map<string, GlslFileInfo> = new Map();
  private isInitialized = false;

  /**
   * 初始化文件管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadGlslFiles();
      this.isInitialized = true;
      console.log(`GLSL文件管理器初始化完成，加载了 ${this.files.size} 个文件`);
    } catch (error) {
      console.error('GLSL文件管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有GLSL文件列表
   */
  getFileList(): GlslFileInfo[] {
    return Array.from(this.files.values());
  }

  /**
   * 根据名称获取文件信息
   */
  getFile(name: string): GlslFileInfo | undefined {
    return this.files.get(name);
  }

  /**
   * 根据名称获取文件内容
   */
  getFileContent(name: string): string | undefined {
    const file = this.files.get(name);
    return file?.content;
  }

  /**
   * 检查文件是否存在
   */
  hasFile(name: string): boolean {
    return this.files.has(name);
  }

  /**
   * 获取文件数量
   */
  getFileCount(): number {
    return this.files.size;
  }

  /**
   * 加载GLSL文件
   */
  private async loadGlslFiles(): Promise<void> {
    // 尝试从多个可能的路径加载文件
    const possiblePaths = [
      '/glsl/',           // 相对路径
      './glsl/',          // 当前目录
      '../glsl/',         // 上级目录
      'glsl/',            // 直接路径
    ];

    for (const basePath of possiblePaths) {
      try {
        await this.loadFromPath(basePath);
        if (this.files.size > 0) {
          console.log(`从路径 ${basePath} 成功加载 ${this.files.size} 个GLSL文件`);
          return;
        }
      } catch (error) {
        console.warn(`从路径 ${basePath} 加载GLSL文件失败:`, error);
      }
    }

    // 如果所有路径都失败，尝试使用硬编码的文件列表
    await this.loadHardcodedFiles();
  }

  /**
   * 从指定路径加载文件
   */
  private async loadFromPath(basePath: string): Promise<void> {
    // 这里需要根据实际的GLSL文件列表来构建请求
    const glslFiles = [
      'animated-gradient-shader.glsl',
      'bettercrt.glsl',
      'bloom.glsl',
      'cineShader-Lava.glsl',
      'crt.glsl',
      'cubes.glsl',
      'cursor_blaze.glsl',
      'dither.glsl',
      'drunkard.glsl',
      'fireworks-rockets.glsl',
      'fireworks.glsl',
      'galaxy.glsl',
      'gears-and-belts.glsl',
      'glitchy.glsl',
      'glow-rgbsplit-twitchy.glsl',
      'gradient-background.glsl',
      'in-game-crt.glsl',
      'inside-the-matrix.glsl',
      'just-snow.glsl',
      'matrix-hallway.glsl',
      'mnoise.glsl',
      'negative.glsl',
      'retro-terminal.glsl',
      'sin-interference.glsl',
      'smoke-and-ghost.glsl',
      'sparks-from-fire.glsl',
      'spotlight.glsl',
      'starfield-colors.glsl',
      'starfield.glsl',
      'tft.glsl',
      'underwater.glsl',
      'water.glsl'
    ];

    for (const fileName of glslFiles) {
      try {
        const filePath = `${basePath}${fileName}`;
        const response = await fetch(filePath);
        
        if (response.ok) {
          const content = await response.text();
          const fileInfo: GlslFileInfo = {
            name: fileName.replace('.glsl', ''),
            path: filePath,
            content: content,
            description: this.extractDescription(content)
          };
          
          this.files.set(fileInfo.name, fileInfo);
        }
      } catch (error) {
        console.warn(`加载文件 ${fileName} 失败:`, error);
      }
    }
  }

  /**
   * 加载硬编码的文件内容（作为备用方案）
   */
  private async loadHardcodedFiles(): Promise<void> {
    // 这里可以硬编码一些基本的GLSL文件内容
    const basicFiles = {
      'none': {
        name: 'none',
        path: 'none',
        content: `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = texture(iChannel0, uv);
}`,
        description: '无滤镜效果'
      },
      'grayscale': {
        name: 'grayscale',
        path: 'grayscale',
        content: `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 color = texture(iChannel0, uv);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    fragColor = vec4(vec3(gray), color.a);
}`,
        description: '黑白滤镜'
      },
      'sepia': {
        name: 'sepia',
        path: 'sepia',
        content: `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 color = texture(iChannel0, uv);
    
    float r = color.r;
    float g = color.g;
    float b = color.b;
    
    fragColor = vec4(
        min(1.0, (r * 0.393) + (g * 0.769) + (b * 0.189)),
        min(1.0, (r * 0.349) + (g * 0.686) + (b * 0.168)),
        min(1.0, (r * 0.272) + (g * 0.534) + (b * 0.131)),
        color.a
    );
}`,
        description: '复古棕褐色滤镜'
      }
    };

    for (const [name, fileInfo] of Object.entries(basicFiles)) {
      this.files.set(name, fileInfo);
    }

    console.log(`加载了 ${this.files.size} 个硬编码的GLSL文件`);
  }

  /**
   * 从GLSL内容中提取描述
   */
  private extractDescription(content: string): string {
    // 尝试从注释中提取描述
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') && trimmed.length > 2) {
        const description = trimmed.substring(2).trim();
        if (description.length > 0 && !description.includes('Copyright') && !description.includes('License')) {
          return description;
        }
      }
    }
    return 'GLSL滤镜效果';
  }

  /**
   * 重新加载文件
   */
  async reload(): Promise<void> {
    this.files.clear();
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * 销毁文件管理器
   */
  destroy(): void {
    this.files.clear();
    this.isInitialized = false;
  }
}
