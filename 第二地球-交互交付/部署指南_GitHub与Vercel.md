# 「第二地球」部署指南：GitHub + Vercel

前端-交互 · W4 任务 4.10 交付物 · v1.0 · 2026-08-25

> 目标：前端公网可访问（HTTPS + 自定义域名可选）+ GitHub 仓库托管 + CI 自动部署。
> 本指南所有命令在 macOS 终端执行。当前原型为纯静态单文件，可先按"快速通道"上线，
> 生产 React 应用就绪后切换到"完整通道"。

---

## 0. 环境准备（一次性）

```bash
# 安装 Homebrew 后：
brew install node gh vercel
gh auth login          # 按提示完成 GitHub 认证（浏览器授权）
vercel login           # 用 GitHub 账号登录 Vercel
```

验证：`node -v`（≥18）、`gh auth status`（已登录）、`vercel --version`。

## 1. 创建仓库并推送

```bash
cd 你的项目根目录            # 含前端/后端/原型的仓库
git init -b main
# 建议先建 .gitignore：node_modules/ dist/ .vercel/ .env *.pyc data_cache/
git add -A && git commit -m "feat: 第二地球 初版（原型 + 文档）"
gh repo create second-earth --public --source=. --push
```

> 比赛要求保留模型调用凭证/截图：放入 `docs/credentials/` 并在 README 注明（勿提交密钥本身，用 .env + 截图）。

## 2. 快速通道：原型直接上线（今天就能有公网链接）

原型是零依赖静态文件，Vercel 静态托管即可：

```bash
cd 第二地球-交互交付        # 本交付目录（含 index.html）
vercel --prod               # 首次会询问项目名/框架 → 选 Other/Static，一路回车
```

完成后终端输出公网 URL（https://xxx.vercel.app），团队与评审可直接访问。
自定义域名：Vercel 控制台 → Domains → 添加并按提示配置 CNAME（HTTPS 自动签发）。

## 3. 完整通道：生产 React 前端 + 后端

仓库结构建议：

```
second-earth/
├── frontend/        # React 18 + Vite（提案 4.1 技术栈）
├── backend/         # FastAPI
├── prototype/       # 本交互原型（评审演示备用）
└── .github/workflows/ci.yml
```

### 3.1 Vercel 导入前端
1. vercel.com → Add New Project → 选择 GitHub 仓库；
2. Root Directory 设为 `frontend`；Framework 自动识别 Vite；
3. 环境变量：`VITE_API_BASE=https://你的后端域名`；
4. Deploy。此后每次 push 到 main 自动部署（Preview 环境对应每个 PR）。

### 3.2 后端（Railway/Render 二选一）
- Render：New Web Service → 选仓库 → Root `backend` → 启动命令 `uvicorn main:app --host 0.0.0.0 --port $PORT`；
- 配置 CORS 允许前端域名；健康检查 `/api/health`。

### 3.3 CI（GitHub Actions）— `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
      - run: npm run lint || true
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: frontend/dist }
```

## 4. 上线后检查清单

- [ ] 公网 URL 打开星表，控制台无报错
- [ ] 手机 4G 网络打开正常（触屏手势可用）
- [ ] 收藏后刷新页面仍在（LocalStorage 生效）
- [ ] 后端 `/api/health` 200；前端无跨域报错
- [ ] README 含：数据来源 DOI、模型调用凭证截图位置、复现步骤

## 5. 备用公网链接（已就绪）

本原型已通过 QW Pages 发布，链接见交付说明 —— 在 Vercel 配置完成前，
团队联调与组会演示可直接使用该链接，二者内容一致。

## 6. 回滚

- Vercel：Deployments → 任一历史版本 → Promote to Production；
- GitHub：`gh run list` 查看 CI，`git revert <sha>` 回退代码。

— 文档结束 —
