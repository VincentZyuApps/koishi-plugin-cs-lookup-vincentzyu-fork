import { Schema } from 'koishi';
import {
  IMAGE_TYPES,
  PROXY_PROTOCOL,
  LOG_LEVELS,
  type LogLevel,
} from './types';
import { stringifyCompact, DEFAULT_KEYBOARD_ROWS } from './qq';
import { DEFAULT_LXGW_WENKAI_PATH } from './font';

export interface Config {
  // ==================================================================
  // ===== ⚙️ 基础设置 =====
  // ==================================================================
  /** 是否默认使用数据库缓存库存数据 */
  enableInvDbCache: boolean;
  /** 库存数据库缓存有效天数（0=禁用） */
  invDbCacheDays: number;
  /** 优先使用 Steam 官方 API（关闭则优先使用 steamwebapi.com） */
  preferOfficialSteamApi: boolean;
  /** Steam 官方免费 API Key */
  officialSteamApiKey?: string;
  /** steamwebapi.com 付费 API Key */
  steamWebApiKey?: string;
  /** 是否缓存 getid 查询结果到数据库 */
  enableGetidDbCache: boolean;
  /** getid 缓存有效天数 */
  getidCacheDays: number;

  // ==================================================================
  // ===== 📝 指令名设置 =====
  // ==================================================================
  /** 查询库存指令名称 */
  csInvCommandName: string;
  /** 绑定 SteamID 指令名称 */
  csBindCommandName: string;
  /** 查询已绑定 SteamID 指令名称 */
  csMyidCommandName: string;
  /** 解析 SteamID 指令名称 */
  getidCommandName: string;

  // ==================================================================
  // ===== 📨 通用消息设置 =====
  // ==================================================================
  /** 是否引用回复用户触发的消息 */
  replyToUser: boolean;
  /** 💬 绑定替换时的 prompt 交互确认模式 */
  promptMode: 'all' | 'none' | 'non-qq';
  /** 👤 cs-inv / cs-bind 指令中 @用户 的禁用范围 */
  banAtUserArg: 'none' | 'all' | 'qq';

  // ==================================================================
  // ===== 🔐 权限设置 =====
  // ==================================================================
  /** 为他人绑定 SteamID 时是否允许 Koishi 4 级及以上用户操作 */
  useKoishiAuthority: boolean;
  /** 为他人绑定 SteamID 时是否允许本插件管理员表用户操作 */
  usePluginAdminTable: boolean;
  /** 本插件管理员列表 */
  pluginAdmins: {
    platform: string;
    userId: string;
    enabled: boolean;
    note: string;
  }[];

  // ==================================================================
  // ===== 🤖 QQ 官方 Bot 平台设置 =====
  // ==================================================================
  /** 是否在 QQ 官方 Bot 平台发送图片时附带 Markdown + 按钮消息 */
  enableQQMarkdown: boolean;
  /** QQ Markdown 按钮 JSON 配置 */
  qqMarkdownKeyboardJson: string;

  // ==================================================================
  // ===== 🎨 渲染设置（puppeteer 截图） =====
  // ==================================================================
  /** 使用深色主题 */
  enableDarkTheme: boolean;
  /** 背景贴上用户头像（磨砂玻璃效果） */
  enableAvatarBackground: boolean;
  /** 缓存饰品图片到磁盘 */
  enableImageCache: boolean;
  /** CS库存饰品图片Base64缓存路径 */
  csInvImageCachePath: string[];
  /** CS库存verboseFileLog输出路径 */
  csInvDataCachePath: string[];
  /** 是否在图片消息后显示渲染耗时、图片格式、质量等信息 */
  puppeteerShowRenderInfo: boolean;
  /** 库存物品列数 (2-10) */
  gridColumns: number;
  /** 渲染图片输出格式 */
  imageType: string;
  /** 截图质量 (0-100)，对 PNG 无效 */
  imageQuality: number;
  /** 页面加载等待策略 */
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  /** 是否显示饰品总数量 */
  showItemCount: boolean;
  /** 饰品数量显示角标位置 */
  itemCountCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 饰品名称显示位置 */
  itemNamePosition: 'top' | 'center' | 'bottom';
  /** 饰品名称底纹透明度 (0-1) */
  itemNameBgOpacity: number;
  /** 饰品图片缩放比例 (50-300%) */
  itemImageScale: number;
  /** 自定义字体文件绝对路径 */
  customFontPath: string;
  /** 卡片底部自定义文字 */
  footerCustomText: string;
  /** 是否启用水印 */
  watermarkEnabled: boolean;
  /** 水印文字内容 */
  watermarkText: string;
  /** 水印字体大小 (px) */
  watermarkFontSize: number;
  /** 水印倾斜角度 (0-360) */
  watermarkAngle: number;
  /** 水印不透明度 (0-1) */
  watermarkOpacity: number;
  /** 水印行间距 (px) */
  watermarkRowGap: number;
  /** 水印列间距 (px) */
  watermarkColGap: number;

  // ==================================================================
  // ===== 🌐 REST API 设置 =====
  // ==================================================================
  /** 是否启用内置 REST API 服务器 */
  enableRestServer: boolean;
  /** REST API 监听地址 */
  restServerHost: string;
  /** REST API 监听端口 */
  restServerPort: number;
  /** REST API 访问令牌 */
  restServerToken: string;
  /** REST API 请求头密钥 */
  restServerSecret: string;
  /** REST API 图片压缩质量 (0-100) */
  imageCompressionQuality: number;

  // ==================================================================
  // ===== 🔌 代理配置 =====
  // ==================================================================
  /** 代理地址填写示例（仅参考，不生效） */
  __exampleProxyAddr__: string;
  /** 代理设置 */
  proxy: {
    /** 是否启用代理 */
    enabled: boolean;
    /** 代理协议 */
    protocol: string;
    /** 代理地址 */
    host: string;
    /** 代理端口 */
    port: number;
  };
  /** 是否使用自定义 User-Agent */
  useUserAgent: boolean;
  /** 自定义 User-Agent 字符串 */
  userAgent?: string;
  /** 是否使用自定义 Cookie */
  useCookie: boolean;
  /** 自定义 Cookie 字符串 */
  cookie?: string;

  // ==================================================================
  // ===== 🐛 Debug 设置 =====
  // ==================================================================
  /** 🔊 日志级别 */
  logLevel: LogLevel;
  /** 库存 JSON 输出到文件 */
  verboseFileLog: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    enableInvDbCache: Schema.boolean()
      .default(false)
      .description(
        '💾 cs-inv 指令是否默认使用数据库缓存库存数据（true=有缓存直接用，false=每次实时拉取）',
      ),
    invDbCacheDays: Schema.number()
      .default(7)
      .min(0)
      .max(365)
      .step(1)
      .description('📅 库存数据库缓存有效天数（0=禁用缓存）'),
    preferOfficialSteamApi: Schema.boolean()
      .default(true)
      .description(
        '🎮 是否优先使用 Steam 官方 API <br> <i>（官方免费但大陆可能访问不稳定，关闭则优先使用付费 steamwebapi.com）</i>',
      ),
    officialSteamApiKey: Schema.string()
      .role('secret')
      .description(
        '🔑 steamcommunity.com/dev/apikey 的 API Key <br> <i>（免费，从Steam官方网站获取）</i>',
      ),
    steamWebApiKey: Schema.string()
      .role('secret')
      .description(
        '🔑 steamwebapi.com 的 API Key <br> <i> （付费API，但是有免费配额，但是免费配额有限，作为官方 API 的回退/备用）</i>',
      ),
    enableGetidDbCache: Schema.boolean()
      .default(true)
      .description('💾 是否缓存 getid 查询结果到数据库 <br> <i> （减少 steamwebapi.com 的 API 调用次数. 建议保持打开，steamwebapi.com API的免费配额有限）</i>'),
    getidCacheDays: Schema.number()
      .default(30)
      .min(1)
      .max(365)
      .step(1)
      .description('📅 getid 缓存有效天数'),
  }).description('⚙️ 基础设置'),

  Schema.object({
    csInvCommandName: Schema.string()
      .default('查cs库存')
      .description('🎒 cs-inv的指令名称'),
    csBindCommandName: Schema.string()
      .default('绑定steamid')
      .description('🔗 cs-bind的指令名称'),
    csMyidCommandName: Schema.string()
      .default('查询我绑定的steamid')
      .description('🆔 cs-myid 的指令名称'),
    getidCommandName: Schema.string()
      .default('获取steamid')
      .description('🔍 getid 的指令名称'),
  }).description('📝 指令名设置'),

  Schema.object({
    replyToUser: Schema.boolean()
      .default(true)
      .description('💬 是否引用用户触发的消息（响应主动指令的时候 回复用户）'),
    promptMode: Schema.union([
      Schema.const('all').description('🌐 所有平台都支持prompt交互确认'),
      Schema.const('none').description('🚫 所有平台都禁用prompt交互确认'),
      Schema.const('non-qq').description(
        '💬 qq平台禁用prompt交互确认，其他平台正常确认（默认）',
      ),
    ])
      .default('non-qq')
      .role('radio')
      .description(
        '💬 cs-bind指令 绑定steamid替换时的 prompt 交互确认模式 <br> <i> ⚠️注意不影响arg传参，所有平台都支持arg传参 </i>',
      ),
    banAtUserArg: Schema.union([
      Schema.const('none').description('🌐 全部平台都允许解析 @用户'),
      Schema.const('all').description('🚫 全部平台都禁止解析 @用户，仅支持传参'),
      Schema.const('qq').description('💬 仅 qq 平台禁止解析 @用户（默认）'),
    ]).default('qq').role('radio')
      .description(
        '👤 cs-inv / cs-bind 指令中 @用户 的禁用范围 <br> <i> 被禁时只能通过传参或自身使用指令 </i>',
      ),
  }).description('📨 通用消息设置'),

  Schema.object({
    useKoishiAuthority: Schema.boolean()
      .default(true)
      .description('🔐 为他人绑定 SteamID 时，允许 Koishi 权限等级 4 及以上用户操作'),
    usePluginAdminTable: Schema.boolean()
      .default(false)
      .description('📋 为他人绑定 SteamID 时，允许本插件管理员表中的用户操作<br><i>与 Koishi 权限校验为 OR 关系：两者同时启用时，只要任意一个校验通过即可操作。</i>'),
    pluginAdmins: Schema.array(Schema.object({
      platform: Schema.string()
        .description('🏷️ 平台名称，例如 qq、qqguild、onebot'),
      userId: Schema.string()
        .description('🆔 用户 ID'),
      enabled: Schema.boolean()
        .default(true)
        .description('✅ 是否启用'),
      note: Schema.string()
        .default('')
        .description('📝 备注，仅用于配置界面查看，不参与任何权限判断或业务逻辑'),
    }))
      .role('table')
      .default([])
      .description('👤 本插件管理员列表<br><i>目前用于允许为他人绑定 SteamID；仅在「启用本插件管理员表」开启时生效。</i>'),
  }).description('🔐 权限设置'),

  Schema.object({
    enableQQMarkdown: Schema.boolean()
      .default(true)
      .description('💬 在 QQ 官方 Bot 平台发送图片时附带 Markdown + 按钮消息'),
    qqMarkdownKeyboardJson: Schema.string()
      .role('textarea', { rows: [5, 10] })
      .default(stringifyCompact(DEFAULT_KEYBOARD_ROWS))
      .description(
        '📋 QQ Markdown 按钮 JSON 配置<br><em>支持变量: <code>${csInvCommandName}</code> <code>${csBindCommandName}</code> <code>${csMyidCommandName}</code> <code>${getidCommandName}</code> <code>${userId}</code></em>',
      ),
  }).description('🤖 QQ 官方 Bot 平台设置'),

  Schema.object({
    enableDarkTheme: Schema.boolean()
      .default(true)
      .description('🌙 使用深色主题'),
    enableAvatarBackground: Schema.boolean()
      .default(false)
      .description(
        '🖼️ 是否在背景贴上用户头像（开启后背景为用户头像+磨砂玻璃效果）',
      ),
    enableImageCache: Schema.boolean()
      .default(true)
      .description('💾 是否缓存饰品图片到磁盘（大幅提升重复查询速度）'),
    csInvImageCachePath: Schema.array(String)
      .role('table')
      .default(['cache', 'cs_inv_image'])
      .description(
        '📂 饰品图片 Base64 缓存路径<br>依次填写相对于 Koishi 根目录的文件夹路径',
      ),
    csInvDataCachePath: Schema.array(String)
      .role('table')
      .default(['cache', 'cs_inv_data'])
      .description(
        '📂 库存 JSON verboseFileLog 输出路径<br>依次填写相对于 Koishi 根目录的文件夹路径',
      ),
    puppeteerShowRenderInfo: Schema.boolean()
      .default(true)
      .description('📊 是否在图片消息后显示渲染耗时、图片格式、质量等信息'),
    gridColumns: Schema.number()
      .default(5)
      .min(2)
      .max(10)
      .step(1)
      .description('📊 库存物品的列数'),
    imageType: Schema.union([
      Schema.const(IMAGE_TYPES.PNG).description('🖼️ PNG, ❌ 不支持调整quality'),
      Schema.const(IMAGE_TYPES.JPEG).description('🌄 JPEG, ✅ 支持调整quality'),
      Schema.const(IMAGE_TYPES.WEBP).description('🌐 WEBP, ✅ 支持调整quality'),
    ])
      .role('radio')
      .default(IMAGE_TYPES.JPEG)
      .description('📤 渲染图片的输出格式'),
    imageQuality: Schema.number()
      .default(60)
      .min(0)
      .max(100)
      .step(1)
      .role('slider')
      .description('📏 截图质量 (0-100)，对PNG无效'),
    waitUntil: Schema.union([
      Schema.const('load').description('load - 等待 load 事件'),
      Schema.const('domcontentloaded').description(
        'domcontentloaded - 等待 DOM 解析完成',
      ),
      Schema.const('networkidle0').description(
        'networkidle0 - 等待网络完全空闲',
      ),
      Schema.const('networkidle2').description(
        'networkidle2 - 等待网络基本空闲',
      ),
    ])
      .default('domcontentloaded')
      .description('⏳ 页面加载等待策略'),
    showItemCount: Schema.boolean()
      .default(true)
      .description('🔢 是否显示饰品总数量'),
    itemCountCorner: Schema.union([
      Schema.const('top-left').description('↖️ 左上角'),
      Schema.const('top-right').description('↗️ 右上角'),
      Schema.const('bottom-left').description('↙️ 左下角'),
      Schema.const('bottom-right').description('↘️ 右下角'),
    ])
      .default('top-right')
      .description('📍 饰品数量显示位置'),
    itemNamePosition: Schema.union([
      Schema.const('top').description('⬆️ 饰品上方'),
      Schema.const('center').description('⏺️ 饰品中间'),
      Schema.const('bottom').description('⬇️ 饰品下方'),
    ])
      .default('bottom')
      .description('📝 饰品名称显示位置'),
    itemNameBgOpacity: Schema.number()
      .default(0.6)
      .min(0)
      .max(1)
      .step(0.05)
      .description('🌫️ 饰品名称底纹透明度 (0-1)'),
    itemImageScale: Schema.number()
      .default(180)
      .min(50)
      .max(300)
      .step(1)
      .description('🖼️ 饰品图片大小缩放百分比 (50-300%，默认180%)'),
    customFontPath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(DEFAULT_LXGW_WENKAI_PATH)
      .description(
        '🔤 自定义字体文件绝对路径<br><i>默认展示 process.cwd()/data/fonts/LXGWWenKaiMono-Regular.ttf；运行时自动映射到 ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf。</i>',
      ),
    footerCustomText: Schema.string()
      .default('📌 Powered by koishi-plugin-cs-lookup-vincentzyu-fork')
      .description('📝 底部自定义文字'),
    watermarkEnabled: Schema.boolean()
      .default(false)
      .description('💧 是否启用水印'),
    watermarkText: Schema.string()
      .default('Generated by koishi-plugin-cs-lookup-vincentzyu-fork')
      .description('💧 水印文字'),
    watermarkFontSize: Schema.number()
      .default(16)
      .min(8)
      .max(72)
      .step(1)
      .description('🔠 水印字体大小 (px)'),
    watermarkAngle: Schema.number()
      .default(45)
      .min(0)
      .max(360)
      .step(1)
      .description('📐 水印倾斜角度 (0-360)'),
    watermarkOpacity: Schema.number()
      .default(0.4)
      .min(0)
      .max(1)
      .step(0.01)
      .role('slider')
      .description('👁️ 水印不透明度 (0-1)'),
    watermarkRowGap: Schema.number()
      .default(30)
      .min(1)
      .max(200)
      .step(1)
      .description('↕️ 水印行间距 (px)'),
    watermarkColGap: Schema.number()
      .default(20)
      .min(1)
      .max(300)
      .step(1)
      .description('↔️ 水印列间距 (px)'),
  }).description('🎨 puppeteer网页截图配置'),

  Schema.object({
    enableRestServer: Schema.boolean()
      .default(false)
      .description('🌐 是否启用REST API服务器'),
    restServerHost: Schema.string()
      .default('0.0.0.0')
      .description('🏠 REST API服务器主机地址'),
    restServerPort: Schema.number()
      .default(60730)
      .description('📡 REST API服务器端口'),
    restServerToken: Schema.string()
      .default('please-change-token')
      // .required()
      .description('🔐 REST API访问令牌'),
    restServerSecret: Schema.string()
      .default('please-change-secret')
      // .required()
      .description('🔑 REST API请求头密钥'),
    imageCompressionQuality: Schema.number()
      .default(80)
      .min(0)
      .max(100)
      .step(1)
      .description('🖼️ 图片压缩质量 (0-100)'),
  }).description('🔌 REST API 相关设置'),

  Schema.object({
    __exampleProxyAddr__: Schema.string()
      .default('socks5h://192.168.31.233:7891')
      .disabled()
      .description(
        '🔎 代理地址填写示例（这里只是格式参考，不是实际生效配置项）<br>🧦 SOCKS5h：<code>socks5h://ip:port</code><br>🌐 HTTP：<code>http://ip:port</code><br>🔒 HTTPS：<code>https://ip:port</code><br>💡 目前我自己主要测试的是 <code>clash-cli + socks5</code> 这种用法~',
      )
      .role('link'),
    proxy: Schema.object({
      enabled: Schema.boolean().description('✅ 是否启用代理。').default(true),
      protocol: Schema.union([
        Schema.const(PROXY_PROTOCOL.HTTP).description('🌐 HTTP 代理'),
        Schema.const(PROXY_PROTOCOL.HTTPS).description('🔒 HTTPS 代理'),
        Schema.const(PROXY_PROTOCOL.SOCKS4).description('🧦 SOCKS4 代理'),
        Schema.const(PROXY_PROTOCOL.SOCKS5).description('🧳 SOCKS5 代理'),
        Schema.const(PROXY_PROTOCOL.SOCKS5H).description(
          '🚀 SOCKS5h 代理 (支持远程DNS)',
        ),
      ])
        .role('radio')
        .default(PROXY_PROTOCOL.SOCKS5H),
      host: Schema.string().description('🏠 代理地址。').default('127.0.0.1'),
      port: Schema.number().description('🛖 代理端口。').default(7891),
    }),
    useUserAgent: Schema.boolean()
      .description('🌐 是否使用自定义用户代理 (User-Agent)')
      .default(true),
    userAgent: Schema.string()
      .default(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      )
      .description('🔍 chrome打开chrome://version页面，找到用户代理')
      .role('textarea', { rows: [2, 10] }),
    useCookie: Schema.boolean()
      .description('🍪 是否使用自定义 Cookie')
      .default(false),
    cookie: Schema.string()
      .description(
        '🍪 浏览器访问steam库存链接，然后F12打开Network，找到这个请求的cookie填入。 <br/> https://steamcommunity.com/inventory/76561198307564265/730/2?l=schinese%EF%BC%8C ',
      )
      .role('textarea', { rows: [2, 10] }),
  }).description('🔌 代理配置'),

  Schema.object({
    logLevel: Schema.union([
      Schema.const('silent').description('🔇 Silent — 仅输出严重错误'),
      Schema.const('error').description('❌ Error — 输出错误'),
      Schema.const('warn').description('⚠️ Warn — 输出错误+警告'),
      Schema.const('info').description('ℹ️ Info — 正常信息输出（默认）'),
      Schema.const('debug').description('🐛 Debug — 输出全部调试信息'),
    ])
      .role('radio')
      .description('🔊 日志级别')
      .default('info'),
    verboseFileLog: Schema.boolean()
      .description(
        '📁 是否将库存数据完整JSON输出到文件 (../cache/inv_data/res.json)',
      )
      .default(false),
  }).description('🐛 Debug设置'),
]);
