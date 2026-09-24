import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { article, createArticle, uploadImage } from './blog.mjs';

test('Chinese titles remain in filenames; dates and drafts are consistent', () => {
  const post = article('科研："笔记" / 示例', '科研', new Date('2026-09-24T18:00:00Z'));
  assert.equal(post.filename, '2026-09-25-科研：-笔记-示例.md');
  assert.match(post.content, /date: 2026-09-25T02:00:00\+08:00/);
  assert.match(post.content, /draft: true/);
  assert.equal(JSON.parse(post.content.split('\n')[1].slice(7)), '科研："笔记" / 示例');
  assert.throws(() => article('../', '科研'));
  assert.throws(() => article('hello', '未知'));
});

test('creating an existing article never overwrites its content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'blog-post-test-'));
  try {
    const path = await createArticle('科研笔记', '科研', directory);
    await writeFile(path, 'existing content');
    await assert.rejects(createArticle('科研笔记', '科研', directory), { code: 'EEXIST' });
    assert.equal(await readFile(path, 'utf8'), 'existing content');
  } finally { await rm(directory, { recursive: true }); }
});

test('image upload uses the existing preset and validates errors without real uploads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'blog-image-test-'));
  const path = join(directory, 'sample.png');
  try {
    await writeFile(path, Buffer.from('test fixture'));
    const url = await uploadImage(path, async (endpoint, options) => {
      assert.match(endpoint, /^https:\/\/api.cloudinary.com\/v1_1\/.+\/image\/upload$/);
      assert.equal(options.body.get('upload_preset'), 'blog_images');
      assert.equal(options.body.get('folder'), 'blog');
      assert.equal(options.body.get('file').type, 'image/png');
      assert.equal(options.body.has('api_secret'), false);
      return Response.json({ secure_url: 'https://res.cloudinary.com/test/image.png' });
    });
    assert.equal(url, 'https://res.cloudinary.com/test/image.png');
    await assert.rejects(uploadImage(path, async () => new Response('', { status: 401 })), /401/);
    await assert.rejects(uploadImage(path, async () => Response.json({ secure_url: 'http://bad.example/image.png' })), /HTTPS/);
    await assert.rejects(uploadImage(join(directory, 'file.txt')), /支持/);
  } finally { await rm(directory, { recursive: true }); }
});
