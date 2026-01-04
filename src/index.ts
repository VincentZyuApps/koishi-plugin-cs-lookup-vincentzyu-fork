import { Context, Schema } from 'koishi';
import { inv } from './cs-inv';
import { apply as getId } from './getid';
import { bind } from './cs-bind';
import { } from 'koishi-plugin-umami-statistics-service';
import { PROXY_PROTOCOL, IMAGE_TYPES } from './types';

export const name = 'cs-lookup';

export const umami: [string, string] = ["29272bd1-0f4c-4db8-ad22-bec20ee15810", "https://data.itzdrli.cc"];

export const inject = ['puppeteer', 'database', 'umamiStatisticsService'];

export const Config = Schema.intersect([
  Schema.object({
    data_collect: Schema.boolean()
      .default(true)
      .description('📊 是否允许匿名数据收集 隐私政策见上方链接'),
    steamWebApiKey: Schema.string()
      .description("🔑 Steam Web API Key from www.steamwebapi.com"),
    steamCommunityApiKey: Schema.string()
      .description("🔐 Steam Community API Key from www.steamcommunity.com"),
  }).description("⚙️ 基础设置"),
  Schema.object({
    enableDarkTheme: Schema.boolean()
      .default(true)
      .description('🌙 使用深色主题'),
    enableAvatarBackground: Schema.boolean()
      .default(false)
      .description('🖼️ 是否在背景贴上用户头像（开启后背景为用户头像+磨砂玻璃效果）'),
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
    userAgent: Schema.string()
      .description("🔍 chrome打开chrome://version页面，找到用户代理")
      .role('textarea', { rows: [2, 10] }),
    cookie: Schema.string()
      .description("🍪 浏览器访问steam库存链接，然后F12打开Network，找到这个请求的cookie填入。 <br/> https://steamcommunity.com/inventory/76561198307564265/730/2?l=schinese%EF%BC%8C ")
      .role('textarea', { rows: [2, 10] }),
  }).description("🔌 代理配置")

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
  bind(ctx);
}