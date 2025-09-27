/**
 * WebGL GLSL渲染器工具类
 * - 创建和管理WebGL上下文
 * - 编译和运行GLSL着色器
 * - 渲染滤镜效果到Canvas
 */

export class GlslRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private isInitialized = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    this.canvas.style.display = 'none';
    
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
  }

  /**
   * 初始化WebGL渲染器
   */
  initialize(): void {
    if (this.isInitialized) return;

    // 创建顶点着色器
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // 创建片段着色器模板
    const fragmentShaderTemplate = `
      precision mediump float;
      
      uniform vec2 iResolution;
      uniform float iTime;
      uniform sampler2D iChannel0;
      varying vec2 v_texCoord;
      
      void mainImage(out vec4 fragColor, in vec2 fragCoord);
      
      void main() {
        vec2 fragCoord = v_texCoord * iResolution;
        mainImage(gl_FragColor, fragCoord);
      }
    `;

    // 编译着色器
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderTemplate);

    // 创建程序
    this.program = this.createProgram(vertexShader, fragmentShader);
    this.gl.useProgram(this.program);

    // 创建顶点缓冲区
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    
    // 全屏四边形顶点数据
    const vertices = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0
    ]);
    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // 设置顶点属性
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 16, 0);
    
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 16, 8);

    // 创建纹理
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    // 创建帧缓冲区
    this.framebuffer = this.gl.createFramebuffer();

    this.isInitialized = true;
  }

  /**
   * 编译GLSL着色器
   */
  compileShader(source: string): void {
    if (!this.program) return;

    // 创建新的片段着色器
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform vec2 iResolution;
      uniform float iTime;
      uniform sampler2D iChannel0;
      varying vec2 v_texCoord;
      
      ${source}
      
      void main() {
        vec2 fragCoord = v_texCoord * iResolution;
        mainImage(gl_FragColor, fragCoord);
      }
    `;

    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    // 重新创建程序
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `);

    this.program = this.createProgram(vertexShader, fragmentShader);
    this.gl.useProgram(this.program);

    // 重新设置顶点属性
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 16, 0);
    
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 16, 8);
  }

  /**
   * 渲染滤镜效果
   */
  render(): void {
    if (!this.isInitialized || !this.program) return;

    // 更新Canvas尺寸
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // 设置uniform变量
    const resolutionLocation = this.gl.getUniformLocation(this.program, 'iResolution');
    const timeLocation = this.gl.getUniformLocation(this.program, 'iTime');
    const channelLocation = this.gl.getUniformLocation(this.program, 'iChannel0');

    this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(timeLocation, performance.now() / 1000.0);
    this.gl.uniform1i(channelLocation, 0);

    // 绑定纹理
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    // 渲染
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * 显示Canvas
   */
  show(): void {
    if (!document.body.contains(this.canvas)) {
      document.body.appendChild(this.canvas);
    }
    this.canvas.style.display = 'block';
  }

  /**
   * 隐藏Canvas
   */
  hide(): void {
    this.canvas.style.display = 'none';
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer);
    }
    
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
    }
    
    if (this.framebuffer) {
      this.gl.deleteFramebuffer(this.framebuffer);
    }
    
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
  }

  /**
   * 创建着色器
   */
  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${error}`);
    }
    
    return shader;
  }

  /**
   * 创建程序
   */
  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program linking error: ${error}`);
    }
    
    return program;
  }
}
