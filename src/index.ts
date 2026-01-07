import { Context, Schema } from 'koishi';
import { inv } from './cs-inv';
import { apply as getId } from './getid';
import { bind } from './cs-bind';
import { } from 'koishi-plugin-umami-statistics-service';
import { PROXY_PROTOCOL, IMAGE_TYPES } from './types';

export const name = 'cs-lookup-vincentzyu-fork';

export const umami: [string, string] = ["29272bd1-0f4c-4db8-ad22-bec20ee15810", "https://data.itzdrli.cc"];

export const inject = ['puppeteer', 'database', 'umamiStatisticsService'];

export const Config = Schema.intersect([

  Schema.object({
    data_collect: Schema.boolean()
      .default(true)
      .description('📊 是否允许匿名数据收集 隐私政策见上方链接'),
    preferOfficialSteamApi: Schema.boolean()
      .default(true)
      .description('🎮 是否优先使用 Steam 官方 API（官方免费但大陆可能访问不稳定，关闭则优先使用付费 steamwebapi.com）'),
    officialSteamApiKey: Schema.string()
      .description("🔑 Steam 官方 API Key（免费，从 steamcommunity.com/dev/apikey 获取）"),
    steamWebApiKey: Schema.string()
      .description("🔑 steamwebapi.com 的 API Key（付费，配额有限，作为官方 API 的回退/备用）"),
  }).description("⚙️ 基础设置"),

  Schema.object({
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
      .description("📊 库存物品的列数"),
    imageType: Schema.union([
      Schema.const(IMAGE_TYPES.PNG).description(`🖼️ PNG, ❌ 不支持调整quality`),
      Schema.const(IMAGE_TYPES.JPEG).description(`🌄 JPEG, ✅ 支持调整quality`),
      Schema.const(IMAGE_TYPES.WEBP).description(`🌐 WEBP, ✅ 支持调整quality`),
    ])
      .role('radio')
      .default(IMAGE_TYPES.JPEG)
      .description("📤 渲染图片的输出格式"),
    imageQuality: Schema.number()
      .default(60)
      .min(0).max(100).step(1)
      .role('slider')
      .description("📏 截图质量 (0-100)，对PNG无效"),
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
      .default('koishi-plugin-cs-lookup')
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
  }).description("🎨 puppeteer网页截图配置"),
  
  Schema.object({
    enableRestServer: Schema.boolean()
      .default(false)
      .description('🌐 是否启用REST API服务器'),
  }).description("🔌 REST API"),

  Schema.object({
    // proxyAddr: Schema.string()
    //   .default("socks5h://192.168.31.84:7891")
    //   .description("格式是为以下三者之一(仅测试过clash-cli+socks5 awa): \n\t(1)socks5h://ip:port \n\t(2)http://ip:port \n\t(3)https://ip:port")
    //   .role('link'),
    proxy: Schema.object({
      enabled: Schema.boolean()
        .description('✅ 是否启用代理。')
        .default(true),
      protocol: Schema.union([
        Schema.const(PROXY_PROTOCOL.HTTP).description("🌐 HTTP 代理"),
        Schema.const(PROXY_PROTOCOL.HTTPS).description("🔒 HTTPS 代理"),
        Schema.const(PROXY_PROTOCOL.SOCKS4).description("🧦 SOCKS4 代理"),
        Schema.const(PROXY_PROTOCOL.SOCKS5).description("🧳 SOCKS5 代理"),
        Schema.const(PROXY_PROTOCOL.SOCKS5H).description("🚀 SOCKS5h 代理 (支持远程DNS)"),
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
      .description("🔍 chrome打开chrome://version页面，找到用户代理")
      .role('textarea', { rows: [2, 10] }),
    useCookie: Schema.boolean()
      .description('🍪 是否使用自定义 Cookie')
      .default(false),
    cookie: Schema.string()
      .description("🍪 浏览器访问steam库存链接，然后F12打开Network，找到这个请求的cookie填入。 <br/> https://steamcommunity.com/inventory/76561198307564265/730/2?l=schinese%EF%BC%8C ")
      .role('textarea', { rows: [2, 10] }),
  }).description("🔌 代理配置"),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .description("是否在控制台输出详细信息")
      .default(false),
    verboseFileLog: Schema.boolean()
      .description("是否将库存数据完整JSON输出到文件 (../cache/inv_data/res.json)")
      .default(false)
  }).description('debug设置')

])


export const usage = `
## 📢 如遇使用问题可以前往QQ群: 957500313 讨论
## 🔑 本插件需要来自 [steamwebapi.com](https://www.steamwebapi.com) 的 SteamWebAPI Key 进行非官方接口的背包查询和SteamID查询  
## 📝 匿名数据收集 👉 [隐私协议](https://legal.itzdrli.cc)  

### ✅ 使用官方api查询背包: 不需要key(仅查询背包(中文)且容易被墙)</br>❌ 不使用官方api查询背包: 需要key(可以查背包(英文)和SteamID)

💰 请我喝杯咖啡 👇   
[![ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/itzdrli)
### [❤️ 爱发电](https://afdian.com/a/itzdrli)`;

declare module 'koishi' {
  interface Tables {
    cs_lookup: CsLookup
  }
}

export interface CsLookup {
  id: string
  steamId: string
  userid: string
  platform: string
}

export function apply(ctx: Context, config: any) {
  ctx.model.extend('cs_lookup', {
    id: 'string',
    steamId: 'string',
    userid: 'string',
    platform: 'string'
  }, {})
  inv(ctx, config);
  getId(ctx, config);
  bind(ctx, config);
}