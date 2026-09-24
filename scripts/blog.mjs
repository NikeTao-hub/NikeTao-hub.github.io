import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const categories = ['科研', '生活', '技术'];

export function article(title, category, now = new Date()) {
  title = title.trim();
  if (!title || title.length > 120 || /[\r\n]/.test(title)) throw new Error('请输入 1～120 字的单行标题。');
  if (!categories.includes(category)) throw new Error('分类请选择科研、生活或技术。');
  const date = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 19) + '+08:00';
  const slug = title.normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\s]+/g, '-').replace(/^[.\-]+|[.\-]+$/g, '');
  if (!slug) throw new Error('标题需要包含可用的文件名字符。');
  return {
    filename: `${date.slice(0, 10)}-${slug}.md`,
    content: `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\ndescription: ""\ncategories: ${category}\ntags: []\nimage: ""\ntoc: true\ndraft: true\n---\n\n`
  };
}

export async function createArticle(title, category, directory = join(root, 'content/post')) {
  const post = article(title, category);
  await mkdir(directory, { recursive: true });
  const path = join(directory, post.filename);
  await writeFile(path, post.content, { flag: 'wx' });
  return path;
}

export async function uploadImage(path, request = fetch) {
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
  const type = types[extname(path).toLowerCase()];
  if (!type) throw new Error('支持 JPG、PNG、WebP、GIF、AVIF 图片。');
  const info = await stat(path);
  if (!info.isFile() || info.size === 0 || info.size > 20 * 1024 * 1024) throw new Error('请选择非空且不超过 20 MB 的图片。');
  // Reuse the existing CMS public unsigned-upload configuration; never require API secrets.
  const widget = await readFile(join(root, 'static/admin/vditor-widget.js'), 'utf8');
  const cloud = widget.match(/var CLOUDINARY_CLOUD_NAME = '([^']+)'/)?.[1];
  const preset = widget.match(/var CLOUDINARY_UPLOAD_PRESET = '([^']+)'/)?.[1];
  if (!cloud || !preset) throw new Error('未找到现有后台的 Cloudinary 上传配置。');
  const form = new FormData();
  form.set('file', new Blob([await readFile(path)], { type }), basename(path));
  form.set('upload_preset', preset);
  form.set('folder', 'blog');
  form.set('public_id', `${Date.now()}-${randomUUID()}`);
  const response = await request(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`上传失败（HTTP ${response.status}），请检查网络或 Cloudinary 配额和上传预设。`);
  const data = await response.json();
  if (typeof data.secure_url !== 'string' || !data.secure_url.startsWith('https://res.cloudinary.com/')) throw new Error('Cloudinary 未返回有效的 HTTPS 图片地址。');
  return data.secure_url;
}

async function main() {
  const [command, value, category] = process.argv.slice(2);
  if (command === 'new') {
    console.log(`已新建草稿：${await createArticle(value || '', category || '科研')}\n正式发布前将 draft 改为 false。`);
  } else if (command === 'upload' && value) {
    const url = await uploadImage(resolve(value));
    const alt = basename(value).replace(/[\[\]\\\r\n]/g, '');
    console.log(`正文图片（复制到文章）：\n![${alt}](${url})\n\n封面 URL：\n${url}`);
  } else {
    throw new Error('用法：node scripts/blog.mjs new "文章标题" 科研\n      node scripts/blog.mjs upload "/完整路径/图片.png"');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.code === 'EEXIST' ? '同名文章已存在，未覆盖原文，请换一个标题。' : error.message);
    process.exitCode = 1;
  });
}
