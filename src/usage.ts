const pkg = require('../package.json');

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC';

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
  <a href="https://qm.qq.com/q/dM7v4bLJfh" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-957500313-1AAD19?style=flat-square" alt="QQ群">
  </a>
  <a href="https://forum.koishi.xyz/t/topic/12558" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-12558-5546A3?style=for-the-badge&logo=${KOISHI_LOGO_BASE64}&logoColor=white" alt="Koishi Forum">
  </a>
</p>

<div style="margin-top: 12px; padding: 10px; border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px;">
  <div style="text-align: left; margin-bottom: 6px;">
    🫡 上游原始插件的一些信息 by <a href="https://github.com/itzdrli" target="_blank">itzdrli</a>
  </div>
  <div style="text-align: center;">
    <a href="https://github.com/itzdrli/koishi-plugin-cs-lookup" target="_blank">
      <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="Upstream GitHub">
    </a>
    <a href="https://www.npmjs.com/package/koishi-plugin-cs-lookup" target="_blank">
      <img src="https://img.shields.io/npm/v/koishi-plugin-cs-lookup?style=flat-square&logo=npm" alt="Upstream npm">
    </a>
    <a href="https://ko-fi.com/itzdrli" target="_blank">
      <img src="https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Ko-fi">
    </a>
    <a href="https://legal.itzdrli.cc" target="_blank">
      <img src="https://img.shields.io/badge/Privacy-legal.itzdrli.cc-0A66C2?style=flat-square" alt="隐私政策">
    </a>
  </div>
</div>

<h2 style="color: #ff4444; font-weight: 900; font-size: 24px; margin: 20px 0;">⚠️ 重要提示：需要开启 <b>puppeteer</b> 和 <b>database</b> 插件，本插件才能完整工作。</h2>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<hr>

<details>
<summary><h2>📖 插件说明（点击展开）</h2></summary>

<h3>✨ 功能概览</h3>
<ul>
  <li>🎒 查询 CS2 / CS:GO Steam 库存并渲染为图片</li>
  <li>🔗 支持 <code>cs-bind</code> 绑定 SteamID，<code>cs-myid</code> 查询自己的绑定</li>
  <li>🆔 支持 <code>getid</code> 从 Steam 个人主页链接解析 SteamID</li>
  <li>🧠 支持数据库缓存库存 JSON，支持磁盘缓存饰品图片</li>
  <li>🌐 支持 HTTP / HTTPS / SOCKS4 / SOCKS5 / SOCKS5h 代理</li>
  <li>🔌 可选启用 REST API 服务器供外部调用</li>
  <li>🎨 支持深浅色主题、背景头像、自定义字体、水印、列数、图片格式与质量等细粒度渲染配置</li>
</ul>

<h3>⌨️ 主要指令</h3>
<ul>
  <li><code>cs-inv [targetUser]</code>：查询自己或指定用户绑定的 Steam 库存</li>
  <li><code>cs-inv -s &lt;steamid&gt;</code>：直接查询指定 SteamID 的库存</li>
  <li><code>cs-inv --refresh</code>：强制刷新数据库缓存后重新拉取库存</li>
  <li><code>cs-inv --no-refresh</code>：强制使用数据库缓存（若存在）</li>
  <li><code>cs-bind &lt;steamId&gt; [userId]</code>：绑定 SteamID，支持艾特他人绑定；自己绑定无需管理员权限，为他人绑定需要通过权限设置校验</li>
  <li><code>cs-myid</code>：查看自己已绑定的 SteamID</li>
  <li><code>getid &lt;Steam个人资料链接&gt;</code>：从 Steam 主页链接解析 SteamID</li>
  <li>💡 没有 Key 也可以使用 <a href="https://steamid.io" target="_blank">steamid.io</a> 免费查询 SteamID64</li>
</ul>

<h3>🔐 权限说明</h3>
<ul>
  <li>默认启用 Koishi 内置权限校验：为他人绑定 SteamID 需要调用者 Koishi 权限等级 4 及以上。</li>
  <li>可选启用本插件管理员表 <code>pluginAdmins</code>：命中 <code>platform</code> + <code>userId</code> 且 <code>enabled=true</code> 的用户也可为他人绑定。</li>
  <li><code>useKoishiAuthority</code> 与 <code>usePluginAdminTable</code> 是 OR 关系：两者同时启用时，任意一个校验通过即可操作。</li>
  <li>两个管理员校验开关都关闭时，任何人都不能为他人绑定；自己绑定仍然允许。</li>
</ul>

<h3>🔑 Key 使用建议</h3>
<ul>
  <li><code>officialSteamApiKey</code>：免费，适合查询玩家资料；中国大陆网络环境下可能不稳定</li>
  <li><code>steamWebApiKey</code>：来自 <code>steamwebapi.com</code>，付费或配额制；<code>getid</code> 功能依赖它</li>
  <li>推荐两个 Key 都配置，插件会按 <code>preferOfficialSteamApi</code> 的设定自动做主通道与回退</li>
</ul>

<h3>🗂️ 缓存说明</h3>
<ul>
  <li>数据库表 <code>cs_lookup_vincentzyu_fork</code>：保存用户与 SteamID 的绑定关系</li>
  <li>数据库表 <code>cs_inv_cache_vincentzyu_fork</code>：保存 Steam 库存 JSON 缓存</li>
  <li>磁盘目录 <code>cache/inv_image</code>：保存饰品图片 Base64 缓存</li>
  <li>磁盘目录 <code>cache/inv_data</code>：开启调试落盘时保存完整库存响应 JSON</li>
</ul>

<h3>🔌 REST API 说明</h3>
<p>启用 <code>enableRestServer</code> 后，插件会启动一个 Fastify 服务。请务必修改默认的 <code>restServerToken</code> 与 <code>restServerSecret</code>，避免直接暴露默认凭据。</p>

</details>

<hr>

<h3>📜 许可说明</h3>
<p>本仓库当前附带的许可证文件为 <b>GNU Affero General Public License v3.0（AGPL-3.0）</b>。</p>
`;
