import { Schema } from 'koishi'
import { IMAGE_TYPES, PROXY_PROTOCOL } from './types'

export interface Config {
  data_collect: boolean
  
  enableInvDbCache: boolean
  preferOfficialSteamApi: boolean
  officialSteamApiKey?: string
  steamWebApiKey?: string

  csInvCommandName: string
  csBindCommandName: string
  csMyidCommandName: string
  getidCommandName: string
  replyToUser: boolean

  enableDarkTheme: boolean
  enableAvatarBackground: boolean
  enableImageCache: boolean
  gridColumns: number
  imageType: string
  imageQuality: number
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
  showItemCount: boolean
  itemCountCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  itemNamePosition: 'top' | 'center' | 'bottom'
  itemNameBgOpacity: number
  itemImageScale: number
  customFontPath: string
  footerCustomText: string
  watermarkEnabled: boolean
  watermarkText: string
  watermarkFontSize: number
  watermarkAngle: number
  watermarkOpacity: number
  watermarkRowGap: number
  watermarkColGap: number

  enableRestServer: boolean
  restServerHost: string
  restServerPort: number
  restServerToken: string
  restServerSecret: string
  imageCompressionQuality: number

  __exampleProxyAddr__: string
  proxy: {
    enabled: boolean
    protocol: string
    host: string
    port: number
  }
  useUserAgent: boolean
  userAgent?: string
  useCookie: boolean
  cookie?: string

  verboseConsoleLog: boolean
  verboseFileLog: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    data_collect: Schema.boolean()
      .default(false)
      .description('📊 是否允许匿名数据收集 隐私政策见上方链接'),
  }).description('🛡️ 隐私与统计'),

  Schema.object({
    enableInvDbCache: Schema.boolean()
      .default(false)
      .description('💾 cs-inv 指令是否默认使用数据库缓存库存数据（true=有缓存直接用，false=每次实时拉取）'),
    preferOfficialSteamApi: Schema.boolean()
      .default(true)
      .description('🎮 是否优先使用 Steam 官方 API（官方免费但大陆可能访问不稳定，关闭则优先使用付费 steamwebapi.com）'),
    officialSteamApiKey: Schema.string()
      .description('🔑 Steam 官方 API Key（免费，从 steamcommunity.com/dev/apikey 获取）'),
    steamWebApiKey: Schema.string()
      .description('🔑 steamwebapi.com 的 API Key（付费，配额有限，作为官方 API 的回退/备用）'),
  }).description('⚙️ 基础设置'),

  Schema.object({
    csInvCommandName: Schema.string()
      .default('cs-inv')
      .description('🎒 查询库存指令名称'),
    csBindCommandName: Schema.string()
      .default('cs-bind')
      .description('🔗 绑定 SteamID 指令名称'),
    csMyidCommandName: Schema.string()
      .default('cs-myid')
      .description('🆔 查询已绑定 SteamID 指令名称'),
    getidCommandName: Schema.string()
      .default('getid')
      .description('🔍 解析 SteamID 指令名称'),
    replyToUser: Schema.boolean()
      .default(true)
      .description('💬 是否引用用户触发的消息（响应主动指令的时候 回复用户）'),
  }).description('📨 通用消息设置'),

  Schema.object({
    enableDarkTheme: Schema.boolean()
      .default(true)
      .description('🌙 使用深色主题'),
    enableAvatarBackground: Schema.boolean()
      .default(false)
      .description('🖼️ 是否在背景贴上用户头像（开启后背景为用户头像+磨砂玻璃效果）'),
    enableImageCache: Schema.boolean()
      .default(true)
      .description('💾 是否缓存饰品图片到磁盘（大幅提升重复查询速度）'),
    gridColumns: Schema.number()
      .default(5)
      .min(2).max(10).step(1)
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
      .min(0).max(100).step(1)
      .role('slider')
      .description('📏 截图质量 (0-100)，对PNG无效'),
    waitUntil: Schema.union([
      Schema.const('load').description('load - 等待 load 事件'),
      Schema.const('domcontentloaded').description('domcontentloaded - 等待 DOM 解析完成'),
      Schema.const('networkidle0').description('networkidle0 - 等待网络完全空闲'),
      Schema.const('networkidle2').description('networkidle2 - 等待网络基本空闲'),
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
      .min(0).max(1).step(0.05)
      .description('🌫️ 饰品名称底纹透明度 (0-1)'),
    itemImageScale: Schema.number()
      .default(222)
      .min(50).max(300).step(1)
      .description('🖼️ 饰品图片大小 (50-300%，默认222%)'),
    customFontPath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default('')
      .description('🔤 自定义字体文件绝对路径 (如 C:/Fonts/my.ttf，留空使用默认字体)'),
    footerCustomText: Schema.string()
      .default('📌 Powered by koishi-plugin-cs-lookup-vincentzyu-fork')
      .description('📝 底部自定义文字'),
    watermarkEnabled: Schema.boolean()
      .default(true)
      .description('💧 是否启用水印'),
    watermarkText: Schema.string()
      .default('generated by koishi-plugin-cs-lookup-vincentzyu-fork')
      .description('💧 水印文字'),
    watermarkFontSize: Schema.number()
      .default(16)
      .min(8).max(72).step(1)
      .description('🔠 水印字体大小 (px)'),
    watermarkAngle: Schema.number()
      .default(45)
      .min(0).max(360).step(1)
      .description('📐 水印倾斜角度 (0-360)'),
    watermarkOpacity: Schema.number()
      .default(0.4)
      .min(0).max(1).step(0.01)
      .role('slider')
      .description('👁️ 水印不透明度 (0-1)'),
    watermarkRowGap: Schema.number()
      .default(30)
      .min(1).max(200).step(1)
      .description('↕️ 水印行间距 (px)'),
    watermarkColGap: Schema.number()
      .default(20)
      .min(1).max(300).step(1)
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
      .default('请修改token')
      // .required()
      .description('🔐 REST API访问令牌'),
    restServerSecret: Schema.string()
      .default('请修改secret')
      // .required()
      .description('🔑 REST API请求头密钥'),
    imageCompressionQuality: Schema.number()
      .default(80)
      .min(0).max(100).step(1)
      .description('🖼️ 图片压缩质量 (0-100)'),
  }).description('🔌 REST API 相关设置'),

  Schema.object({
    __exampleProxyAddr__: Schema.string()
      .default('socks5h://192.168.31.233:7891')
      .disabled()
      .description('🔎 代理地址填写示例（这里只是格式参考，不是实际生效配置项）<br>🧦 SOCKS5h：<code>socks5h://ip:port</code><br>🌐 HTTP：<code>http://ip:port</code><br>🔒 HTTPS：<code>https://ip:port</code><br><br>💡 目前我自己主要测试的是 <code>clash-cli + socks5</code> 这种用法~')
      .role('link'),
    proxy: Schema.object({
      enabled: Schema.boolean()
        .description('✅ 是否启用代理。')
        .default(true),
      protocol: Schema.union([
        Schema.const(PROXY_PROTOCOL.HTTP).description('🌐 HTTP 代理'),
        Schema.const(PROXY_PROTOCOL.HTTPS).description('🔒 HTTPS 代理'),
        Schema.const(PROXY_PROTOCOL.SOCKS4).description('🧦 SOCKS4 代理'),
        Schema.const(PROXY_PROTOCOL.SOCKS5).description('🧳 SOCKS5 代理'),
        Schema.const(PROXY_PROTOCOL.SOCKS5H).description('🚀 SOCKS5h 代理 (支持远程DNS)'),
      ]).role('radio').default(PROXY_PROTOCOL.SOCKS5H),
      host: Schema.string()
        .description('🏠 代理地址。')
        .default('127.0.0.1'),
      port: Schema.number()
        .description('🛖 代理端口。')
        .default(7897)
    }),
    useUserAgent: Schema.boolean()
      .description('🌐 是否使用自定义用户代理 (User-Agent)')
      .default(true),
    userAgent: Schema.string()
      .default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36')
      .description('🔍 chrome打开chrome://version页面，找到用户代理')
      .role('textarea', { rows: [2, 10] }),
    useCookie: Schema.boolean()
      .description('🍪 是否使用自定义 Cookie')
      .default(false),
    cookie: Schema.string()
      .description('🍪 浏览器访问steam库存链接，然后F12打开Network，找到这个请求的cookie填入。 <br/> https://steamcommunity.com/inventory/76561198307564265/730/2?l=schinese%EF%BC%8C ')
      .role('textarea', { rows: [2, 10] }),
  }).description('🔌 代理配置'),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .description('🔍 是否在控制台输出详细信息（包括：代理配置、所有网络请求的URL/耗时/大小、重试过程、缓存命中情况等）')
      .default(false),
    verboseFileLog: Schema.boolean()
      .description('📁 是否将库存数据完整JSON输出到文件 (../cache/inv_data/res.json)')
      .default(false)
  }).description('🐛 Debug设置')
])
