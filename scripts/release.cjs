#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取 package.json 获取版本信息
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const packageName = packageJson.name;

console.log(`🚀 准备发布 ${packageName} v${version}`);

// 确保 dist 目录存在
const distDir = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist 目录不存在，请先运行 npm run build');
  process.exit(1);
}

// 创建发布目录
const releaseDir = path.resolve(__dirname, '..', 'release');
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true });
}
fs.mkdirSync(releaseDir, { recursive: true });

console.log('📦 复制文件到发布目录...');

// 需要包含的文件
const filesToCopy = [
  'dist/index.js',
  'dist/css/theme.css',
  'dist/css/theme2.css',
  'icon.png',
  'package.json',
  'README.md'
];

// 复制文件
filesToCopy.forEach(file => {
  const srcPath = path.resolve(__dirname, '..', file);
  const destPath = path.resolve(releaseDir, path.basename(file));
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      // 复制目录
      const copyRecursive = (from, to) => {
        const stat = fs.statSync(from);
        if (stat.isDirectory()) {
          fs.mkdirSync(to, { recursive: true });
          for (const entry of fs.readdirSync(from)) {
            copyRecursive(path.join(from, entry), path.join(to, entry));
          }
        } else {
          fs.mkdirSync(path.dirname(to), { recursive: true });
          fs.copyFileSync(from, to);
        }
      };
      copyRecursive(srcPath, destPath);
    } else {
      // 复制文件
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
    console.log(`✅ 复制: ${file}`);
  } else {
    console.warn(`⚠️  文件不存在: ${file}`);
  }
});

// 创建 zip 包
const zipName = `${packageName}-v${version}.zip`;
const zipPath = path.resolve(__dirname, '..', zipName);

console.log('🗜️  创建 zip 包...');

try {
  // 使用 PowerShell 压缩命令
  const powershellCmd = `Compress-Archive -Path "${releaseDir}\\*" -DestinationPath "${zipPath}" -Force`;
  execSync(`powershell -Command "${powershellCmd}"`, { stdio: 'inherit' });
  console.log(`✅ 创建成功: ${zipName}`);
} catch (error) {
  console.error('❌ 创建 zip 包失败:', error.message);
  process.exit(1);
}

// 清理临时目录
fs.rmSync(releaseDir, { recursive: true });

console.log('🎉 发布包准备完成!');
console.log(`📁 文件位置: ${zipPath}`);
console.log(`📏 文件大小: ${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB`);

// 显示使用说明
console.log('\n📋 发布说明:');
console.log('1. 将 zip 包上传到 GitHub Release');
console.log('2. 或者使用 GitHub CLI: gh release create v' + version + ' ' + zipName);
console.log('3. 或者推送到 GitHub 并创建标签触发自动发布');
