# 需求协作板（todo-items）

老师提需求 / 缺陷，学生回完成情况的双人协作清单。

## 界面结构

| 区域 | 内容 |
|---|---|
| 左侧 | 需求 / 缺陷 两类清单，各带总数与未完成数 |
| 中栏 | 条目列表，支持按五档状态筛选 |
| 右栏 | 详情：标题、描述、附件、创建与更新时间、状态切换、完成情况评论区 |

状态流转：待处理 → 开发中 → 待验证 → 验证通过；验收不通过回到「重新处理」。

## 目录结构

```
├── src/                    前端（Vue3 + Vite + TypeScript）
│   ├── api/
│   │   ├── types.ts        BoardApi 接口契约
│   │   ├── local.ts        浏览器本地存储实现
│   │   ├── http.ts         后端接口实现（默认）
│   │   └── index.ts        按环境变量选择实现
│   ├── components/         7 个组件
│   ├── store/board.ts      全局状态
│   └── constants.ts        状态与文案定义
└── server/                 后端（Node + Express + MySQL）
    ├── src/
    │   ├── index.js        Express 入口
    │   ├── db.js           MySQL 连接池
    │   ├── schema.sql      建表语句
    │   ├── init-db.js      建库 + 建表
    │   ├── check-db.js     连接自检
    │   └── routes/items.js 全部业务接口
    ├── uploads/            附件落盘目录（已 gitignore）
    └── .env.example        配置模板
```

## 本地开发

### 前端

```bash
npm install
npm run dev          # http://localhost:5173
```

开发服务器已配好代理：`/api` 与 `/uploads` 自动转发到 `127.0.0.1:3000`。
后端地址不同时，用 `VITE_API_TARGET` 覆盖。

### 后端

```bash
cd server
cp .env.example .env    # 填数据库连接信息
npm install
npm run init-db         # 建库 + 建三张表
npm run dev             # 默认 3000 端口
```

自检：

```bash
npm run check           # 打印 MySQL 版本与已有的表
curl http://127.0.0.1:3000/api/health
```

## 数据源切换

| 模式 | 配置 | 数据位置 | 两人是否互通 |
|---|---|---|---|
| 后端（默认） | 不设置，或 `VITE_API_MODE=http` | MySQL | 是 |
| 本地 | 根目录 `.env` 写 `VITE_API_MODE=local` | 各自浏览器 | 否 |

前后端不同源部署时，在根目录 `.env` 里指定后端地址：

```
VITE_API_BASE=https://api.你的域名.com
```

## 部署到自己的服务器

1. 服务器安装 Node.js 18+ 与 MySQL
2. 拉取代码，进入 `server/`，`cp .env.example .env` 并填好数据库连接
3. `npm install && npm run init-db` 建库建表
4. `npm start` 启动后端，建议用 pm2 常驻：`pm2 start src/index.js --name todo-items-api`
5. 回到项目根目录 `npm install && npm run build`，产出 `dist/`
6. Nginx 托管 `dist/`，并把 `/api` 与 `/uploads` 反向代理到后端 3000 端口

Nginx 关键片段：

```nginx
location / {
    root /var/www/todo-items/dist;
    try_files $uri $uri/ /index.html;
}

location /api {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
}

location /uploads {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
}
```

## 接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/items` | 列表，可带 `?type=requirement\|defect` |
| POST | `/api/items` | 新建，body：`type` `title` `description` `status` |
| PATCH | `/api/items/:id` | 局部更新，body 同上任选 |
| DELETE | `/api/items/:id` | 删除，级联清理评论与磁盘附件 |
| POST | `/api/items/:id/comments` | 添加评论，body：`author` `role` `body` |
| POST | `/api/items/:id/attachments` | 上传附件，multipart 字段名 `file` |
| DELETE | `/api/items/:id/attachments/:attId` | 删除附件 |
| GET | `/api/health` | 健康检查，含数据库连通性 |

除上传外，写操作成功均返回该条记录的完整结构（含 `attachments` 与 `comments`），前端据此刻画最新状态，无需二次拉取。

## 数据表

| 表 | 用途 | 关键字段 |
|---|---|---|
| `items` | 一条需求 / 缺陷 | `type` `title` `description` `status` `created_at` `updated_at` |
| `attachments` | 附件 | `item_id` `name` `size` `mime` `url` |
| `comments` | 完成情况 | `item_id` `author` `role` `body` |

附件文件本身存放于 `server/uploads/`，数据库只记录访问路径 `/uploads/xxx`，不存二进制。

## 配置项（server/.env）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DB_HOST` / `DB_PORT` | 127.0.0.1 / 3306 | MySQL 地址 |
| `DB_USER` / `DB_PASSWORD` | root / 空 | 数据库账号 |
| `DB_NAME` | todo_items | 库名 |
| `PORT` | 3000 | 后端端口 |
| `CORS_ORIGIN` | http://localhost:5173 | 允许的前端来源，逗号分隔 |
| `MAX_UPLOAD_BYTES` | 10485760 | 单文件上限，10MB |
