# 需求协作板（todo-items）

产品提需求 / 缺陷，开发回完成情况的双人协作清单。

## 界面结构

| 区域 | 内容 |
|---|---|
| 左侧 | 需求 / 缺陷 两类清单，各带总数与未完成数 |
| 中栏 | 条目列表，顶部为状态筛选下拉；卡片左侧色条对应当前状态 |
| 右栏 | 详情：标题、描述、附件、创建与更新时间、状态切换、完成情况评论区 |

状态流转：待处理 → 开发中 → 待验证 → 验证通过；验收不通过回到「重新处理」；另有「已归档」——归档条目从主列表隐藏，归入左侧对应「已归档需求 / 已归档缺陷」清单，状态改回即恢复原列表可见。

## 按状态筛选

列表顶部是一个下拉选择器（`src/components/StatusFilter.vue`）：收起时显示当前筛选项及其条目数，展开后列出「全部」与五档状态，每项右侧是该状态下的条目数。

- 键盘：`↑` `↓` 移动高亮，`Enter` / `空格` 选中，`Esc` 收起
- 点击面板以外的区域自动收起
- 筛选只作用于当前分类（需求 / 缺陷），切换分类会重置为「全部」
- 归档视图不显示状态筛选（该视图内状态恒为已归档）

## 按适用端口筛选

状态筛选旁还有一个多选下拉（`src/components/PortFilter.vue`）：勾选 8080 / 8318 后只显示含对应端口的条目（任一匹配，双端口条目在两个选项下都会出现）：

- 全不勾 = 不筛选；收起时显示「全部端口」及当前匹配条数
- 勾选逻辑为多选，点选项不关闭面板，键盘 `↑` `↓` 移动、`Enter` / `空格` 切换勾选、`Esc` 收起
- 主列表与归档视图都生效；切换分类 / 归档视图 / 新建条目后会重置为不筛选

## 适用端口

新建需求 / 缺陷时选择该条适用于哪个端口：`8080`、`8318` 可多选，「全部」是同时选中两者的快捷按钮。
选中态用不同颜色区分（蓝 / 青 / 琥珀），列表卡片与详情页头部都会显示对应的端口小标签。
数据存 `items.ports` 列（逗号分隔）；旧库执行 `npm run init-db` 会自动补列，旧数据视为未指定。

## 删除条目

两条路径，都要二次确认：

- **删单条**：鼠标移到列表卡片上，右侧出现垃圾桶图标，点击后卡片原地变成「删除「标题」？确认 / 取消」。
- **批量删**：点列表中栏右上角「批量」进入多选模式，勾选若干条（或点「全选」），底部操作条点「删除」→ 确认。

已有条目的删除同样可以在右栏详情页头部完成。

批量删除的实现方式：**不新增后端接口**，前端循环调用已有的 `DELETE /api/items/:id`（见 `deleteItems`，`src/store/board.ts`）。这样后端无需改动；代价是删除 N 条会发出 N 个请求，且中途失败会留下部分删除的结果——失败条数会在顶栏错误条里提示。

只有**当前可见**（当前分类 + 当前状态筛选）的条目才会被勾选与删除，切换分类会自动清空已选，避免误删看不见的条目。

## 在描述里放截图

编辑描述时，把截图直接粘进输入框即可（macOS 截图 `⌘⇧⌃4` 后按 `⌘V`）：

- 粘贴的图片走附件通道上传，名称自动改成 `截图-20260914-093600.png` 这类可读形式；
- 上传完成后，图片会以缩略图显示在**描述下方**，点击可看大图、下载原图；
- 也可以点描述下方的「选择图片…」，或走附件区的「上传附件」；
- 剪贴板里同时有文字时不做拦截，按浏览器默认粘贴文字。

判定逻辑集中在 `src/utils/clipboard.ts`，不涉及后端改动。

## 目录结构

```
├── src/                    前端（Vue3 + Vite + TypeScript）
│   ├── api/
│   │   ├── types.ts        BoardApi 接口契约
│   │   ├── local.ts        浏览器本地存储实现
│   │   ├── http.ts         后端接口实现（默认）
│   │   └── index.ts        按环境变量选择实现
│   ├── components/         9 个组件（含状态筛选下拉 StatusFilter、图片查看器 ImageLightbox）
│   ├── store/board.ts      全局状态
│   ├── utils/              format（时间与大小）/ clipboard（粘贴取图）
│   │                       select（下拉导航）/ attachments（附件校验，三处入口共用）
│   └── constants.ts        状态与文案定义
└── server/                 后端（Node + Express + MySQL）
    ├── src/
    │   ├── index.js        Express 入口（同时托管前端 dist/）
    │   ├── db.js           MySQL 连接池
    │   ├── paths.js        附件目录 / 前端产物目录
    │   ├── schema.sql      建表语句
    │   ├── init-db.js      建库 + 建表
    │   ├── check-db.js     连接自检
    │   └── routes/items.js 全部业务接口
    ├── uploads/            附件落盘目录（已 gitignore）
    └── .env.example        配置模板
```

根目录的 `dist/` 是 `npm run build` 的产物，后端启动时自动托管，已 gitignore。
缺失时服务照常启动，只是不提供页面。

## 本地开发

### 前端

```bash
npm install
npm run dev          # http://localhost:5173
```

开发服务器已配好代理：`/api` 与 `/uploads` 自动转发到 `127.0.0.1:8218`。
后端地址不同时，用 `VITE_API_TARGET` 覆盖。

### 后端

```bash
cd server
cp .env.example .env    # 填数据库连接信息
npm install
npm run init-db         # 建库 + 建三张表
npm run dev             # 默认 8218 端口
```

自检：

```bash
npm run check           # 打印 MySQL 版本与已有的表
curl http://127.0.0.1:8218/api/health
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

## 部署到自己的服务器（单端口同源）

前端构建产物由后端进程一并托管，因此**只需一个端口**（本项目部署在 `8218`），
直接用 `http://服务器IP:8218` 访问即可——不需要 Nginx，也不涉及跨域。

1. 安装运行环境（Ubuntu / Debian）：

   ```bash
   apt install -y mysql-server
   # Node.js 18+ 需另行安装
   ```

2. 建库与专用账号（用 MySQL 的 root 执行一次；应用不要直接用 root）：

   ```sql
   CREATE DATABASE todo_items CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'todo_app'@'127.0.0.1' IDENTIFIED BY '换成你的密码';
   GRANT ALL PRIVILEGES ON todo_items.* TO 'todo_app'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```

3. 构建前端（在项目根目录）：

   ```bash
   npm install
   npm run build          # 产出 dist/
   ```

4. 配置并启动后端：

   ```bash
   cd server
   cp .env.example .env   # 填 DB_USER / DB_PASSWORD；PORT 默认 8218
   npm install
   npm run init-db        # 建三张表
   pm2 start src/index.js --name todo-items
   pm2 save
   ```

5. 若服务器启用了防火墙，放行 8218，然后自检：

   ```bash
   curl http://127.0.0.1:8218/api/health
   ```

### 更新已部署的版本

```bash
cd /opt/todo-items
git pull
npm install && npm run build     # 前端有改动时
cd server && npm install         # 后端依赖有改动时
pm2 restart todo-items
```

### 为什么不用 Nginx

`server/src/index.js` 用 `express.static` 托管 `dist/`，非接口路径回落到 `index.html`；
前后端同源，`src/api/http.ts` 走相对路径请求——既不反向代理也不需要 CORS。

将来若要绑域名 + HTTPS，在 Nginx 里反代到本服务即可，后端无需改动：

```nginx
location / {
    proxy_pass http://127.0.0.1:8218;
    proxy_set_header Host $host;
    client_max_body_size 12m;   # 附件上限 10MB，留余量
}
```

## 接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/items` | 列表，可带 `?type=requirement\|defect` |
| POST | `/api/items` | 新建，body：`type` `title` `description` `status` `ports`（端口数组，如 `["8080","8318"]`） |
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
| `items` | 一条需求 / 缺陷 | `type` `title` `description` `status` `ports`（适用端口，逗号分隔）`created_at` `updated_at` |
| `attachments` | 附件 | `item_id` `name` `size` `mime` `url` |
| `comments` | 完成情况 | `item_id` `author` `role` `body` |

附件文件本身存放于 `server/uploads/`，数据库只记录访问路径 `/uploads/xxx`，不存二进制。

## 配置项（server/.env）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DB_HOST` / `DB_PORT` | 127.0.0.1 / 3306 | MySQL 地址（仅本机可连） |
| `DB_USER` / `DB_PASSWORD` | todo_app / 空 | 数据库账号，建议用只授权本库的专用账号 |
| `DB_NAME` | todo_items | 库名 |
| `PORT` | 8218 | 后端监听端口，同时用于访问前端页面 |
| `CORS_ORIGIN` | 空 | 允许的前端来源，逗号分隔。留空即禁止跨域（同源部署不需要） |
| `MAX_UPLOAD_BYTES` | 10485760 | 单文件上限，10MB |
| `WEB_DIR` | 仓库根 `dist/` | 前端构建产物目录，一般不用改 |
