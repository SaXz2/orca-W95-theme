#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// GitHub API 配置
const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'hackr-sh';
const REPO_NAME = 'ghostty-shaders';
const BRANCH = 'main';

// 本地目录配置
const GLSL_DIR = path.resolve(__dirname, '..', 'dist', 'glsl');
const SOURCE_GLSL_DIR = path.resolve(__dirname, '..', 'src', 'glsl');

console.log('🎨 开始下载 GLSL 滤镜文件...');

/**
 * 创建目录
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 创建目录: ${dirPath}`);
  }
}

/**
 * 下载文件
 */
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // 删除部分下载的文件
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * 获取仓库文件列表
 */
async function getRepositoryFiles() {
  return new Promise((resolve, reject) => {
    const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'GLSL-Downloader',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          const glslFiles = result.tree.filter(item => 
            item.type === 'blob' && item.path.endsWith('.glsl')
          );
          resolve(glslFiles);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 下载单个 GLSL 文件
 */
async function downloadGlslFile(fileInfo) {
  const fileName = path.basename(fileInfo.path);
  const localPath = path.join(GLSL_DIR, fileName);
  const sourcePath = path.join(SOURCE_GLSL_DIR, fileName);
  
  // 跳过非 .glsl 文件
  if (!fileName.endsWith('.glsl')) {
    return;
  }
  
  try {
    const downloadUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${fileInfo.path}`;
    
    // 下载到 dist 目录
    await downloadFile(downloadUrl, localPath);
    
    // 复制到 src 目录（用于开发）
    await downloadFile(downloadUrl, sourcePath);
    
    console.log(`✅ 下载: ${fileName}`);
  } catch (error) {
    console.error(`❌ 下载失败 ${fileName}:`, error.message);
  }
}

/**
 * 创建 GLSL 文件索引
 */
function createGlslIndex(files) {
  const indexContent = `// GLSL 滤镜文件索引
// 自动生成，请勿手动修改

export const GLSL_FILES = [
${files.map(file => `  '${path.basename(file.path)}'`).join(',\n')}
] as const;

export const GLSL_FILE_COUNT = ${files.length};
`;

  const indexPath = path.join(GLSL_DIR, 'index.ts');
  const sourceIndexPath = path.join(SOURCE_GLSL_DIR, 'index.ts');
  
  fs.writeFileSync(indexPath, indexContent);
  fs.writeFileSync(sourceIndexPath, indexContent);
  
  console.log(`✅ 创建索引文件: ${files.length} 个 GLSL 文件`);
}

/**
 * 主函数
 */
async function main() {
  try {
    // 确保目录存在
    ensureDirectoryExists(GLSL_DIR);
    ensureDirectoryExists(SOURCE_GLSL_DIR);
    
    // 获取文件列表
    console.log('📋 获取文件列表...');
    const files = await getRepositoryFiles();
    
    if (files.length === 0) {
      console.log('⚠️  未找到 GLSL 文件');
      return;
    }
    
    console.log(`📁 找到 ${files.length} 个 GLSL 文件`);
    
    // 下载所有文件
    console.log('⬇️  开始下载文件...');
    const downloadPromises = files.map(file => downloadGlslFile(file));
    await Promise.all(downloadPromises);
    
    // 创建索引文件
    createGlslIndex(files);
    
    console.log('🎉 GLSL 文件下载完成!');
    console.log(`📁 文件位置: ${GLSL_DIR}`);
    console.log(`📁 源文件位置: ${SOURCE_GLSL_DIR}`);
    
  } catch (error) {
    console.error('❌ 下载失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();
