# Citation 自动更新配置

更新链路：GitHub Actions 定时运行 -> SerpApi Google Scholar Author API -> 校验作者、论文及引用数 -> 发布到 `google-scholar-stats` 分支 -> 页面读取更新数据并显示 social badge。

统计口径仍然是 Google Scholar。访问者不会调用 SerpApi，也不会接触 API Key；查看主页的次数不会消耗查询额度。页面排版和 Star 徽章不受此次修改影响。

## 1. 注册 SerpApi

1. 打开 [SerpApi 注册页面](https://serpapi.com/users/sign_up)，通过邮箱或页面提供的 GitHub / Google 登录方式注册。
2. 按网站提示完成账号验证，选择 Free 方案即可开始；不需要为本项目购买付费套餐。截至 2026-10-30，官方列出的免费额度为每月 250 次，最终以账号页面为准：[价格说明](https://serpapi.com/pricing)。
3. 登录后打开 [API Key 管理页面](https://serpapi.com/manage-api-key)，复制自己的 Private API Key。
4. 不要把 Key 发到聊天、放进代码、截图公开或写入 `_config.yml`。如意外泄露，在 SerpApi 重新生成后替换 GitHub Secret。

当前论文数量不超过 100 篇，一次更新只需一次作者资料查询，每天一次通常约为每月 30-31 次。论文超过一页时会增加查询次数，手动运行也会使用额度。代码每页最多请求 100 篇、每次运行最多请求 10 页，避免异常分页耗尽额度。

## 2. 配置 GitHub Repository Secret

1. 打开主页仓库的 [Actions secrets 设置](https://github.com/Ryan-LHR/Ryan-LHR.github.io/settings/secrets/actions)。
2. 若从仓库首页进入，依次选择 `Settings -> Secrets and variables -> Actions`。
3. 在 `Secrets` 页签点击 `New repository secret`，不是新增 Variable，也不需要创建 Environment。
4. `Name` 填写 `SERPAPI_API_KEY`，大小写必须一致。
5. `Secret` 仅粘贴复制的 API Key，不加引号，不加 `Bearer` 前缀，点击 `Add secret`。

工作流只在检查 Key 和请求 API 的两个步骤注入该 Secret。数据文件只保存作者、论文 ID、标题、引用数和数据日期，不保存 Key 或完整 API 响应。发布缓存使用 GitHub 提供的 `GITHUB_TOKEN`，无需额外创建 PAT。

GitHub 官方步骤：[Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)。

## 3. 首次运行

1. 先将本次脚本、依赖、测试和工作流修改提交到仓库的默认分支，同时发布上一轮的备用快照及前端修复。
2. 确认 Repository Secret 已创建，打开 [Get Citation Data](https://github.com/Ryan-LHR/Ryan-LHR.github.io/actions/workflows/google_scholar_crawler.yaml)。如果工作流被停用，先启用它。
3. 点击 `Run workflow`，选择包含新代码的默认分支，再确认运行。不要只点击旧失败任务的 `Re-run jobs`，旧任务可能仍使用旧版代码。
4. 检查 `Check SerpApi secret`、`Fetch Google Scholar citations via SerpApi` 和 `Publish citation cache` 均成功。
5. 检查 [实际发布的 gs_data.json](https://raw.githubusercontent.com/Ryan-LHR/Ryan-LHR.github.io/google-scholar-stats/gs_data.json)，确认 `updated` 更新、SMiR 和 DuFP 的论文 ID 与引用数存在。
6. 刷新主页，在 Paper 旁检查 Citations 徽章，悬停核对数据日期。CDN 与浏览器缓存可能使页面稍晚于任务完成更新；先以分支中的数据为准。

此后工作流每天 08:00 UTC，即北京时间 16:00 自动运行，GitHub 的定时任务可能排队延迟。更新数据分支不需要每天重新部署整个主页；页面会读取新数据。

## 4. 异常处理

- Key 缺失或只有空白：工作流会在 `Check SerpApi secret` 阶段停止并指出需配置的 Secret 名。
- HTTP 401：检查 Key 是否完整、有效、已重新生成，且 Secret 名正确。
- HTTP 403：检查 SerpApi 账号权限和状态。
- HTTP 429：检查查询额度或速率，额度恢复后再运行；不要频繁重跑。
- 其他服务错误、超时或异常响应：任务失败且不发布数据，保留上一份有效缓存，不将未知引用数写成 0。
- 作者不匹配、论文 ID 错误、引用数缺失、空列表或分页中途失败：拒绝发布，避免用不完整数据覆盖缓存。

数据日期使用 SerpApi 返回的 `processed_at`；若接口返回自己的缓存，不会将旧数据日期伪装成当前日期。分页时取最早的一页日期。实现依据：[Google Scholar Author API](https://serpapi.com/google-scholar-author-api)。
