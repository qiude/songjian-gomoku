# 松间棋室 · 五子棋

一个下载即玩的静态网页游戏：传统木质棋盘、15 × 15 交叉点、人机对战和本地双人。纯 HTML / CSS / JavaScript，无第三方依赖、无构建步骤、无后台。

## 立即开始

1. 解压项目，保留文件和目录结构。
2. 用现代浏览器打开 `index.html`，即可开始游戏。无需安装 Node.js 或其他软件。
3. 手机可打开部署后的网站，轻触棋盘交叉点落子。

本地打开可离线游玩；在线访问需要先加载页面。不提供离线缓存或安装式应用功能。对局只保存在当前页面内存中，刷新或关闭后清空。

## 玩法与功能

- 黑棋先行，双方交替在空交叉点落子。
- 横向、纵向、两个斜向中，任一方向连续 **5 子或更多**即获胜。采用自由规则，无三三、四四、长连禁手。
- 棋盘填满且无人获胜时为平局；结束后停止落子，并标出获胜连线。
- **人机对战**：可选执黑或执白，支持“标准”和“进阶”棋力。
- **本地双人**：两人在同一设备轮流操作。
- **悔棋**：本地双人撤回一手；人机撤回到你上一次落子前。电脑已经回应时通常撤回两手；电脑还在思考时撤回你刚下的一手。
- **重新开始**立即清空棋盘；切换模式、执子或棋力也会开始新局，并取消旧局待执行的电脑落子。
- 支持最后一手标记、手数显示、手机触控。键盘可用方向键选择位置，回车或空格落子。

AI 优先完成自己的五连、阻挡对手下一手获胜，再评估活三、冲四和多方向威胁；进阶模式会进一步检查候选落点和对手回应。它适合日常练习，使用有限搜索，不保证最优解。

## 项目文件

```text
gomoku/
├── index.html            页面与玩法说明
├── style.css             木质棋盘、棋子及响应式布局
├── app.js                界面交互、电脑回合和悔棋
├── engine.js             独立规则引擎与 AI
├── favicon.svg           本地站点图标
├── .nojekyll             GitHub Pages 静态发布标记
├── tests/
│   └── engine.test.cjs    规则、平局、悔棋及 AI 测试
├── README.md
└── LICENSE               MIT 许可证
```

所有资源使用相对路径，支持 GitHub Pages 的仓库子目录网址。没有外部字体、图片、统计脚本或 API 调用；游戏代码不收集或上传对局。托管平台自身的访问日志按平台规则处理。

## 免费部署到 GitHub Pages

以下步骤于 **2026-10-14** 按官方文档核对。GitHub Free 可为公开仓库启用 Pages；使用平台提供的 `github.io` 地址无需购买域名。[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

1. 注册或登录 GitHub，创建仓库，例如 `gomoku`，可见性选择 **Public**。
2. 打开仓库的 **Add file → Upload files**，上传解压后的项目内容，再提交。不要只上传 ZIP；确认仓库首页直接能看到 `index.html`、`style.css`、`app.js` 和 `engine.js`，而不是外面再套一层 `gomoku/` 文件夹。
3. 打开 **Settings → Pages**。
4. 在 **Build and deployment → Source** 选择 **Deploy from a branch**。
5. 分支选 **main**，目录选 **/(root)**，点击 **Save**。如果你的默认分支名称不同，选择实际分支。
6. 等待部署完成，在 Pages 页面点击 **Visit site**。项目地址通常为 `https://你的用户名.github.io/gomoku/`。
7. 后续修改文件并提交到该分支，网站会自动更新。

这里使用静态文件发布，无需编写构建命令。包内的 `.nojekyll` 文件应一并上传；若浏览器上传时遗漏隐藏文件，可在仓库使用 **Add file → Create new file** 创建名为 `.nojekyll` 的文件。发布来源的设置方法见 [GitHub 官方部署配置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 免费部署到 Cloudflare Pages

推荐首次使用 **Direct Upload**，不需要 Git 或命令行。使用免费方案和平台提供的 `pages.dev` 子域名即可。免费方案存在平台配额，以 [Cloudflare 官方限额](https://developers.cloudflare.com/pages/platform/limits/) 为准。

1. 注册或登录 Cloudflare，打开 **Workers & Pages**。
2. 选择 **Create application → Get started → Drag and drop your files**；若界面先显示产品分类，进入 **Pages** 的直接上传入口。
3. 输入项目名，例如 `songjian-gomoku`。
4. 拖入包含 `index.html` 的项目文件夹，或 ZIP。ZIP 内第一层应直接有 `index.html`，不要额外嵌套一个项目目录。本项目已经是可部署的静态文件，无需构建。
5. 点击 **Deploy site**，如界面继续要求确认，选择 **Save and Deploy**。
6. 完成后打开平台分配的 `https://项目名.pages.dev` 地址。
7. 更新时，进入该项目，选择 **Create a new deployment**，上传更新后的文件并发布到 **Production**。

上传入口、ZIP / 文件夹支持及更新流程见 [Cloudflare Direct Upload 官方教程](https://developers.cloudflare.com/pages/get-started/direct-upload/)。Direct Upload 项目以后若要改为连接 GitHub 自动部署，需要另建一个使用 Git 集成的 Pages 项目。

### 可选：连接 GitHub 自动部署

如果希望每次提交代码后自动更新，可从一开始就选择 Git 集成：

1. 先将本项目内容上传到 GitHub 仓库根目录。
2. 在 Cloudflare 的 **Workers & Pages → Create application → Pages** 选择 **Import an existing Git repository**，连接并选择该仓库。
3. 生产分支填 `main`，框架预设选 **None**；构建命令填 `exit 0`，构建输出目录填 `.`，根目录保持仓库根目录。
4. 保存并部署。`exit 0` 只表示成功结束，不会安装依赖或编译；输出目录 `.` 对应存放 `index.html` 的仓库根目录。

上述设置根据 [Cloudflare Static HTML 官方教程](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) 应用于本项目。

## 运行测试

游玩和部署不需要 Node.js。修改代码后如需重跑自动化测试，安装现代 Node.js，在项目目录运行：

```sh
node --test tests/engine.test.cjs
```

测试使用 Node.js 自带测试工具，无需 `npm install`。29 项核心测试覆盖落子合法性、四方向胜利、长连、真实满盘平局、最后一格胜负优先、终局锁定、悔棋恢复，以及两档 AI 的取胜、防守和双威胁。若受限运行环境禁止测试进程派生，可在支持该参数的新版 Node.js 使用 `node --test --test-isolation=none tests/engine.test.cjs`。

### 交付前实测（2026-10-14）

- **规则与 AI：29 项全部通过。** 使用随包附带的核心测试，未跳过测试。
- **Chrome 实际浏览器：17 项全部通过。** 包括双击文件打开、棋盘 225 个交叉点、本地双人、胜利后锁定与悔棋、合法轮流下满 225 格的平局及恢复、键盘操作、规则弹窗、显示手数、两种执子、人机整回合悔棋，以及重新开始／悔棋／切换模式／切换执子／切换棋力时取消旧电脑回合。
- **触控与部署路径：** 在 390px 触控视口测试首尾交叉点落子，检查 320px 窄屏无横向溢出；通过本地 HTTP 仓库子路径加载全部资源。浏览器未记录脚本错误或资源加载失败。

浏览器测试使用交付环境现有的自动化工具完成，未向游戏添加运行依赖。尚未在实体手机、Safari 或用户的 GitHub / Cloudflare 账户中实测发布。

## 常见问题

**网页 404？** 检查发布目录第一层是否有小写的 `index.html`。GitHub Pages 检查分支和 `/(root)` 设置；Cloudflare 检查 ZIP 是否多套了一层文件夹。

**只有文字，没有棋盘样式？** 确认 `style.css` 与 `index.html` 同级，文件名大小写一致，且 `app.js`、`engine.js` 都已上传。

**修改后还是旧版本？** 先确认平台部署成功，再强制刷新浏览器。GitHub 可在仓库 **Actions** 查看部署状态，Cloudflare 可在项目 **Deployments** 查看状态。

**可以异地联网双人吗？** 当前提供的是同一设备的本地双人。异地联机需要额外的房间、通信和服务端功能。

**需要买服务器或域名吗？** 本项目可使用上述平台免费方案和默认子域名，无需购买服务器。自定义域名可按需要另行购买；平台规则和配额可能调整。

## 许可

采用 [MIT License](./LICENSE)，可修改、部署和再分发，保留许可证声明即可。
