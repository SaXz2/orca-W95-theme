// 最小可行：构建后复制主题样式到 dist/css
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'css');
const outDir = path.resolve(__dirname, '..', 'dist', 'css');

try {
  if (!fs.existsSync(srcDir)) {
    console.warn('[copy-css] 源目录不存在：', srcDir);
    process.exit(0);
  }
  // 递归复制 src/css → dist/css
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
  copyRecursive(srcDir, outDir);
  console.log('[copy-css] 已递归复制到：', outDir);
} catch (e) {
  console.error('[copy-css] 复制失败：', e);
  process.exit(1);
}


