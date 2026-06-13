import { Context, h } from 'koishi'
import { } from 'koishi-plugin-umami-statistics-service'
import { umami } from '../index'
import { createAxiosInstance, requestWithRetry } from '../proxy'

export function apply(ctx: Context, config: any) {
  const umamiD = umami
  const axiosWithProxy = createAxiosInstance(config, ctx)
  
  ctx
    .command(
      `${config.getidCommandName} <profLink:string>`,
      '🔍 获取 Steam ID 📖 通过个人主页链接解析\n\t 🔗 格式: https://steamcommunity.com/id/xxx/ 或 /profiles/xxx/\n\t 🌐 网站推荐: https://steamid.io 也可以用主页 URL 查询 SteamID 等公开信息',
      { authority: 0 }
    )
    .alias('get-steamid')
    .action(async ({ session }, profLink) => {
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : ''
      if (config.data_collect) {
        ctx.umamiStatisticsService.send({
          dataHostUrl: umami[1],
          website: umami[0],
          url: '/getid',
          urlSearchParams: {
            args: session.argv.args?.join(', '),
            ...(session.argv.options || {}),
          },
        })
      }
      
      if (!profLink) {
        return `${replyPrefix}⚠️ 请提供 Steam 个人资料链接`
      }
      
      if (!profLink.startsWith('https://steamcommunity.com/')) {
        return `${replyPrefix}❌ 请输入正确的Steam个人资料链接`
      }
      
      if (!config.steamWebApiKey) {
        return `${replyPrefix}🔑 未配置 steamWebApiKey，无法使用 getid 功能。请在插件设置中填写来自 steamwebapi.com 的 API Key。`
      }
      
      try {
        const profUrl = `https://www.steamwebapi.com/steam/api/profile?key=${config.steamWebApiKey}&id=${profLink}`
        const response = await requestWithRetry(
          () => axiosWithProxy.get(profUrl),
          { label: 'getid-steamwebapi', ctx }
        )
        const data = response.data
        
        const result = `${replyPrefix}ℹ️ 用户名: `
          + data.personaname
          + '\nSteam ID: '
          + data.steamid
        return result
      } catch (e) {
        const status = e.response?.status
        if (status === 402) {
          return `${replyPrefix}💸 steamwebapi.com 配额已用尽 (402)，请稍后再试或充值配额。`
        }
        ctx.logger.error(`[src/commands/getid.ts] [error] ❌ 🔍 请求失败: ${e.message}`)
        return `${replyPrefix}❌ 获取 Steam ID 失败: ${e.message}`
      }
    })
}
