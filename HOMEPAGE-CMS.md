# 主页内容管理

## 更新主页

1. 打开 <https://niketao.com/blog/admin/>。
2. 使用 GitHub 登录。
3. 进入「主页 → 主页内容」。
4. 修改首屏、Currently、精选项目、照片墙、书籍、音乐或统计信息。
5. 点击发布。GitHub Pages 构建完成后，主页会自动更新。

主页后台的数据保存在 `homepage/content.json`。页面加载失败时，`homepage/index.html` 中的默认内容仍会正常显示。

## 更新博客与 Latest Writing

在后台进入「文章」并发布新文章。首页的 Latest Writing 会自动读取 `/blog/index.xml`，展示最新三篇文章的标题、摘要、日期、链接和封面图。

- 文章设置了「封面图」时，首页优先使用该封面。
- 没有封面图时，首页使用内置的备用图片。
- 文章总数也会从 RSS 自动更新。
