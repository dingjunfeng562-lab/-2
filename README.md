# 校园羽毛球比赛管理系统

基于 Next.js + NestJS + Prisma + PostgreSQL 的校园羽毛球赛事管理系统。

> 完整需求文档见 [docs/PRD.md](docs/PRD.md)

## 项目结构

```
ayumaoqiu/
├── apps/
│   ├── backend/        # NestJS 后端 (端口 4000)
│   └── frontend/       # Next.js 前端 (端口 3000)
├── docs/
│   └── PRD.md          # 产品需求文档
├── package.json        # Monorepo 根
└── pnpm-workspace.yaml
```

## Phase 1 已完成功能

- 总管理员/裁判账号 (基于 JWT 登录, NextAuth + Passport-JWT)
- 选手 CRUD (姓名、性别、学院/班级、联系方式、备注; 支持搜索)
- 赛事 CRUD (名称、届次、时间区间、归档)
- 单项 CRUD (类型、赛制、计分规则、计分模式; 关联到赛事)
- 管理员后台布局 (Ant Design)

## 环境要求

- Node.js >= 18
- pnpm >= 9
- PostgreSQL >= 14

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动 PostgreSQL 并创建数据库

```sql
CREATE DATABASE ayumaoqiu;
```

### 3. 配置后端环境变量

`apps/backend/.env`:

```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/ayumaoqiu?schema=public"
JWT_SECRET="随机长字符串"
JWT_EXPIRES_IN="7d"
PORT=4000
```

### 4. 初始化数据库

```bash
cd apps/backend
pnpm db:push        # 推送 schema 到数据库 (开发环境)
pnpm seed           # 创建初始管理员账号 (baishuwan / baishuwan082508)
```

### 5. 启动后端

```bash
cd apps/backend
pnpm dev
# 后端运行在 http://localhost:4000
```

### 6. 启动前端

`apps/frontend/.env.local` (默认已配置好):

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=随机长字符串
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

```bash
cd apps/frontend
pnpm dev
# 前端运行在 http://localhost:3000
```

### 7. 登录使用

打开浏览器访问 http://localhost:3000，会自动跳转到登录页：

- 用户名: `baishuwan`
- 密码: `baishuwan082508`

如测试库默认管理员无法登录，可重新执行 `pnpm seed`，它会强制同步默认管理员账号和密码。

登录后进入 `/admin` 后台，可访问选手、赛事、单项管理页面。

## 常用命令

```bash
# 根目录
pnpm dev                # 同时启动前后端
pnpm build:backend      # 构建后端
pnpm build:frontend     # 构建前端

# 后端 (apps/backend)
pnpm dev                # 启动后端 (watch 模式)
pnpm db:push            # 推送 schema 变更到数据库
pnpm db:migrate         # 创建并应用迁移
pnpm db:generate        # 重新生成 Prisma Client
pnpm seed           # 强制同步默认管理员账号 (baishuwan / baishuwan082508)
```

## API 概览

所有 API 前缀 `/api`，需要 `Authorization: Bearer <token>` (登录接口除外)。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回 JWT |
| POST | `/api/auth/users/admin` | 创建管理员 (需管理员权限) |
| POST | `/api/auth/users/referee` | 创建裁判 (需管理员权限) |
| GET  | `/api/auth/users` | 列出所有用户 |
| GET/POST/PATCH/DELETE | `/api/players` | 选手 CRUD |
| GET/POST/PATCH/DELETE | `/api/tournaments` | 赛事 CRUD |
| PATCH | `/api/tournaments/:id/archive` | 归档赛事 |
| GET/POST/PATCH/DELETE | `/api/events` | 单项 CRUD (`?tournamentId=` 查询) |

## 后续阶段

- **第二阶段**: 抽签算法 + 对阵图渲染
- **第三阶段**: 裁判记分页 + WebSocket 实时同步
- **第四阶段**: 场地自动排程 + 冲突检测
- **第五阶段**: 团体赛模块
- **第六阶段**: 大屏、历届数据、Excel 导出

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Next.js 16 (App Router) + TypeScript + Ant Design 6 |
| 后端 | NestJS 11 + TypeScript |
| 数据库 | PostgreSQL |
| ORM | Prisma 7 |
| 认证 | NextAuth.js v5 (前端) + Passport-JWT (后端) |
| 包管理 | pnpm workspaces |
