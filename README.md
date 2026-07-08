# AI 智能对话平台

基于 Next.js 构建的现代 AI 对话应用，支持流式应答、多会话管理、Markdown 渲染与代码高亮。

## 功能
- 流式对话（SSE）：打字机效果，实时显示 AI 回复
- 多会话管理：创建、切换、删除对话，自动生成标题
- 本地持久化：使用 IndexedDB 离线存储聊天记录
- Markdown 渲染：支持列表、表格、代码块及语法高亮
- 代码块复制：一键复制 AI 生成的代码
- 主题切换：浅色/深色/跟随系统
- 响应式设计：适配桌面与移动端

## 技术栈
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- 阿里云百炼 / 通义千问 API
- IndexedDB (idb)
- react-markdown + highlight.js
- next-themes

## 本地运行
1. 克隆仓库
2. 安装依赖：`npm install`
3. 在 `.env.local` 中设置 `DASHSCOPE_API_KEY`
4. 运行：`npm run dev`
5. 访问 http://localhost:3000

## 在线演示
[Vercel 部署链接]（稍后补上）