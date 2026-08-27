# 📜 Changelog

本文件根据 Git 提交历史整理，版本号以各提交中的 `package.json` 为准。作者沿用 Git commit author；同一版本包含多个提交时合并记录。

## 🚀 1.4.9-beta.14+20260828

- 移除旧版 `proxy.enabled` 兼容逻辑，代理模式必须通过 `proxy.mode` 明确选择。
- 补充从 1.4.7 迁移到 Mihomo 的配置文档和局域网部署指引。
- 作者：VincentZyu233。

## 🚦 1.4.8-beta.13+20260828

- 新增 `direct`、`manual`、`mihomo` 代理模式，并兼容旧版 `proxy.enabled`。
- 接入 Mihomo SOCKS5H，显式关闭 Axios 环境代理干扰。
- 增加 429/502/503/504 重试、`Retry-After`、指数退避、抖动和全局并发限制。
- 移除错误渲染阶段的重复 Steam 请求，补充代理文档。
- 作者：VincentZyu233；协作者：Codex。

## 🆘 1.4.7-beta.11+20260709

- 新增 CS 库存帮助指令。
- 作者：VincentZyu233。

## 🧭 1.4.6-beta.10+20260709

- 统一 Steam 指令命名。
- 增强库存错误提示。
- 作者：VincentZyu233。

## 🎨 1.4.5-beta.8/9+20260709

- 自动下载并加载默认 LXGW 字体。
- 补充 npm 与 Koishi 徽章图标。
- 作者：VincentZyu233。

## 🔐 1.4.4-beta.7+20260707

- 为替他人绑定 SteamID 增加管理员权限校验。
- 作者：VincentZyu233。

## 🪵 1.4.3-beta.5/6+20260616

- 增加库存和 GETID 缓存天数配置，统一 `enableGetidDbCache` 命名。
- 重构日志文件定位和 logger 实现，优化 QQ 回复链接文案。
- 作者：VincentZyu233。

## 🧰 1.4.2-beta.4+20260616

- 新增统一日志模块、日志级别过滤和用户来源标识。
- 新增 `banAtUserArg`，控制 @ 用户解析范围。
- 作者：VincentZyu233。

## 📝 1.4.1-beta.3+20260615

- 补充 GETID 缓存、QQ Markdown、缓存路径、渲染信息等配置文档。
- 作者：VincentZyu233。

## 🤖 1.4.1-beta.3+20260615（功能提交）

- 增加 QQ 官方 Bot Markdown/按钮适配、GETID 缓存和可配置缓存路径。
- 增加渲染耗时信息，移除 Umami 统计，统一代码格式。
- 作者：VincentZyu233；协作者：OpenCode、DeepSeek。

## 💬 1.4.0-beta.1+20260615

- 增加 QQ Markdown 按钮支持和渲染信息显示。
- 清理 Umami，优化 SteamID 自动填充和 QQ 平台兼容性。
- 作者：VincentZyu233；协作者：OpenCode、DeepSeek。

## 🧬 1.3.1-beta.1/2/3+20260613

- 重构 fork 文档、徽章、许可证和日志体系，增加 Emoji 与数据库表隔离。
- 配置默认值改为英文占位符，增强 REST 测试页面。
- 作者：VincentZyu233；协作者：OpenCode、OpenAI Codex、DeepSeek。

## 🏗️ 1.3.0-beta.1+20260613

- 重构插件结构并补全文档。
- 作者：VincentZyu233。

## 🖼️ 1.2.1-beta.1/2+20260415

- 新增查询绑定 SteamID 的 REST 接口。
- 后端返回带透明通道的 PNG。
- 作者：VincentZyuwin11台式机。

## 🌐 1.2.0-beta.1/2+20260414-15

- 新增 REST API 服务器、默认凭证占位符和 REST 启动日志。
- 作者：VincentZyuwin11台式机。

## 🛠️ 1.1.3-beta.1+20260113

- 增强网络请求稳定性和调试日志。
- 修复 TypeScript 类型断言编译错误，更新插件描述。
- 作者：84 bawuyinguo root。

## 💧 1.1.2-beta.1+20260108

- 增加水印、reply 和查询当前用户绑定 SteamID 的功能。
- 作者：VincentZyu。

## 🖌️ 1.1.0-beta.1+20260105/06

- 增加水印功能。
- 作者：VincentZyuwin11台式机。

## 🧱 1.0.7-beta.1 至 1.0.9-beta.1+20260105

- 增加 Steam 官方接口和饰品图片缓存。
- 支持自定义字体并重构 CSS 样式。
- 支持通过 @ 或用户 ID 指定查询对象。
- 作者：VincentZyuwin11台式机。

## 🔧 1.0.5-beta.1/2+20260104-05

- 完成 fork 后的首轮配置与文档调整。
- 修正指令描述，清理旧发布配置。
- 作者：VincentZyuwin11台式机。

## 🌐 1.0.6-beta.1+20260105

- 移除旧 us-cc 代理实现，统一改走 Axios 代理。
- 新增 `waitUntil` 配置，增强 Steam Web API 缺失时的检查。
- 作者：VincentZyuwin11台式机。

## 🧱 1.0.3-beta.1 至 1.0.4-beta.5（20250903-04）

- 连续修复构建、配置和发布流程，补齐 beta 版本号。
- 这些提交主要用于验证 fork 的 CI、打包和运行稳定性。
- 作者：84物理机。

## 📦 1.0.1（20241206、20250710）

- 上游 1.0.1 正式发布，随后由 fork 维护者补充配置项和 README。
- 作者：itzdrli、diding2014。

## 🌱 0.x（上游版本）

| 版本 | 主要变化 | 作者 |
| --- | --- | --- |
| 0.0.3 | 首个可识别版本，完成基础代码重建和 README 整理 | Itz_Dr_Li |
| 0.1.0 | 初期功能迭代与 Steam 资料链接解析修复 | Itz_Dr_Li |
| 0.6.0 | 发布版本，完善库存查询能力 | itzdrli |
| 0.5.5 | 发布修订 | itzdrli |
| 0.5.4 | 发布修订 | itzdrli |
| 0.5.3 | 发布修订 | itzdrli |
| 0.5.2 | 发布、许可证和基础维护提交 | itzdrli、Itz_Dr_Li |
| 0.5.1 | 发布修订 | itzdrli |
| 0.5.0 | 功能版本发布 | itzdrli |
| 0.4.10 | 发布修订 | itzdrli |
| 0.4.6 | 发布修订 | itzdrli |
| 0.4.5 | 修复 package 配置并发布 | itzdrli |
| 0.4.4 | 更新 TypeScript 配置 | itzdrli |
| 0.4.3 | 更新开发依赖 | itzdrli |
| 0.4.2 | 修复 GETID 错误处理 | itzdrli |
| 0.4.1 / alpha | 发布 0.4.1 及 alpha 预览版 | itzdrli |
| 0.4.0 | 功能版本发布 | itzdrli |
| 0.3.1 / 0.3.0 | 版本发布与功能迭代 | itzdrli |
| 0.2.2 | 版本发布 | itzdrli |
| 0.2.1 | 增加错误提示 | itzdrli |
| 0.2.0 | 增加 Steam 官方 API 支持 | itzdrli |
| 0.1.8 | 增加赞助渠道 | itzdrli |
| 0.1.7 / alpha | 版本发布与 alpha 测试 | itzdrli |
| 0.1.6 / alpha | 版本发布与 alpha 测试 | itzdrli |
| 0.1.5 | CI/发布流程测试 | itzdrli |
| 0.1.4 | CI 修复与迭代 | itzdrli |
| 0.1.3 | 修正版本号 | itzdrli |
| 0.1.2 / alpha | 更新 CI、README 与发布流程 | itzdrli |

上游 0.x 共同奠定了 CS2/CS:GO Steam 库存查询、GETID、错误提示、渲染和发布流程等基础能力。

早期未带正式版本号的提交还包括：初始化插件、重建代码结构、更新组织信息、修复以数字 ID 开头的 Steam 个人资料链接，以及多轮 Travis CI 构建测试；作者均为 Itz_Dr_Li/itzdrli。
