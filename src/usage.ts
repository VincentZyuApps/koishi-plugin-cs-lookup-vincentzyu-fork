const pkg = require('../package.json')

const detailsStyle = 'margin:10px 0;border:1px solid var(--k-color-border, #909399);border-radius:8px;background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit);overflow:hidden;box-shadow:var(--k-card-shadow, 0 1px 3px rgb(0 0 0 / 12%));transition:var(--color-transition, border-color .2s ease, background-color .2s ease)'
const summaryStyle = 'padding:9px 12px;background:var(--k-hover-bg, rgba(127, 127, 127, .12));color:var(--k-text-dark, inherit);cursor:pointer;user-select:none'
const detailsBodyStyle = 'padding:6px 14px 12px;border-top:1px solid var(--k-color-divider, rgba(127, 127, 127, .28));background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit)'

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

export const usage = `
<h1>Koishi 插件：CS2 库存查询 cs-lookup-vincentzyu-fork</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-cs-lookup-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-cs-lookup-vincentzyu-fork?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-cs-lookup-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-cs-lookup-vincentzyu-fork?style=flat-square&logo=npm" alt="npm downloads">
  </a>
  <a href="https://github.com/VincentZyu233/koishi-plugin-cs-lookup-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-cs-lookup-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <a href="https://forum.koishi.xyz/t/topic/12558" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-12558-5546A3?style=for-the-badge&logo=${KOISHI_LOGO_BASE64}&logoColor=white" alt="Koishi Forum">
  </a>
  <a href="https://qm.qq.com/q/dM7v4bLJfh" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-957500313-1AAD19?style=flat-square" alt="QQ群">
  </a>
</p>

<blockquote style="margin: 14px 0; padding: 12px 16px; border-left: 6px solid #ef4444; border-radius: 8px; background: rgba(239, 68, 68, 0.12); color: inherit; line-height: 1.6; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
  <b style="color: #ef4444; font-size: 15px;">⚠️ 运行前置提示：需要开启 <code>puppeteer</code> 与 <code>database</code> 插件服务</b><br>
  本插件依赖 Puppeteer 渲染精美库存长图，并使用 Database 持久化存储玩家 Steam 绑定关系与饰品缓存。
</blockquote>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #ef4444;">🫡 上游原版致谢与声明</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444;">
    <p style="margin: 4px 0;">原版插件由 <a href="https://github.com/itzdrli" target="_blank"><b>itzdrli</b></a> 设计开发，特此致谢！</p>
    <div style="margin-top: 8px;">
      <a href="https://github.com/itzdrli/koishi-plugin-cs-lookup" target="_blank">
        <img src="https://img.shields.io/badge/GitHub-Upstream-100000?style=flat-square&logo=github&logoColor=white" alt="Upstream GitHub">
      </a>
      <a href="https://www.npmjs.com/package/koishi-plugin-cs-lookup" target="_blank">
        <img src="https://img.shields.io/npm/v/koishi-plugin-cs-lookup?style=flat-square&logo=npm" alt="Upstream npm">
      </a>
      <a href="https://legal.itzdrli.cc" target="_blank">
        <img src="https://img.shields.io/badge/Privacy-legal.itzdrli.cc-0A66C2?style=flat-square" alt="隐私政策">
      </a>
    </div>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #0ea5e9;">🎒 核心功能与库存渲染亮点</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(14, 165, 233, 0.08); border-left: 4px solid #0ea5e9;">
    <ul style="margin: 4px 0; padding-left: 18px; line-height: 1.7;">
      <li>🎒 <b>高精饰品长图渲染：</b>查询 CS2 / CS:GO Steam 真实库存，长图展示总价值估算、高价值饰品排名与磨损印花。</li>
      <li>🎨 <b>高度自定义外观：</b>支持深色/浅色主题、背景头像磨砂玻璃滤镜、自定义字体与动态水印。</li>
      <li>⚡ <b>二级智能缓存：</b>数据库缓存饰品原始响应 JSON，磁盘缓存饰品静态图，极速二次直出。</li>
      <li>🤖 <b>QQ 官方 Bot 深度适配：</b>长图消息附带 Markdown 看板与个人中心快捷操作按钮（[查看库存]、[绑定Steam]、[查我的ID]）。</li>
    </ul>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #10b981;">⌨️ 核心指令与 SteamID 绑定指南</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981;">
    <ul style="margin: 4px 0; padding-left: 18px; line-height: 1.7;">
      <li><code>查cs库存 [targetUser]</code>（别名 <code>cs-inv</code>）：查询自己或指定玩家的 Steam 库存长图。</li>
      <li><code>cs-inv -s &lt;steamid&gt;</code>：直接根据 64 位 SteamID 查询任意玩家的公开库存。</li>
      <li><code>cs-inv --refresh</code>：强制跳过数据库缓存，重新向 Steam 请求最新数据。</li>
      <li><code>绑定steamid &lt;steamId&gt; [userId]</code>（别名 <code>steam-bind</code>）：绑定自己的 SteamID；管理员可为他人代绑。</li>
      <li><code>查询我绑定的steamid</code>（别名 <code>steam-myid</code>）：查询当前账号在机器人处绑定的 SteamID。</li>
      <li><code>获取steamid &lt;个人主页链接&gt;</code>（别名 <code>steam-getid</code>）：输入类似 <code>https://steamcommunity.com/id/xxx</code> 自动解析 64 位 SteamID。</li>
    </ul>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #f59e0b;">🚦 代理配置与高频 HTTP 429 突破方案</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b;">
    <p><b>为什么会出现 429？</b>Steam 针对未登录匿名请求设置了严格的 IP 速率限制，频繁请求极易触发 <code>HTTP 429 Too Many Requests</code>。</p>
    <p><b>🌟 终极防 429 方案（强烈推荐）：</b></p>
    <ol style="margin: 4px 0; padding-left: 20px; line-height: 1.7;">
      <li>在配置项中开启 <code>useCookie</code>。</li>
      <li>填入电脑浏览器登录 Steam 后的 Cookie 字符串（关键包含 <code>steamLoginSecure</code> 与 <code>sessionid</code>）。</li>
      <li>Steam 对已认证会话的库存接口调用阈值远高于匿名请求，可从根源消除 429 报错。</li>
      <li>亦可配合多出口代理（支持 HTTP / HTTPS / SOCKS5）分散流量。</li>
    </ol>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #8b5cf6;">🗂️ 数据库存储、缓存与 REST API 服务</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(139, 92, 246, 0.08); border-left: 4px solid #8b5cf6;">
    <p><b>🗄️ 数据库表结构：</b></p>
    <ul style="margin: 4px 0; padding-left: 18px;">
      <li><code>cs_lookup_vincentzyu_fork</code>：记录各平台用户与 SteamID 的双向绑定。</li>
      <li><code>cs_inv_cache_vincentzyu_fork</code>：持久化库存原始返回数据，控制请求频次。</li>
    </ul>
    <p><b>🔌 Fastify REST API：</b>开启 <code>enableRestServer</code> 后可对外提供 HTTP 查询接口，请务必修改默认 Token 与 Secret 保证接口安全。</p>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #ec4899;">💬 交流反馈与开源许可</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(236, 72, 153, 0.08); border-left: 4px solid #ec4899;">
    <p style="margin: 4px 0;">🐛 <b>Bug 反馈 / 💡 建议 / 👨‍💻 交流群：</b></p>
    <p style="margin: 4px 0;">💬 欢迎加入技术交流 QQ 群：<b style="color: #12B7F5;">1085190201</b> 或 <b style="color: #1AAD19;">957500313</b> 🎉</p>
    <p style="margin: 4px 0;">📜 本项目基于 <b>GNU AGPL-3.0</b> 开源协议发布。</p>
  </div>
</div>
</details>
`
