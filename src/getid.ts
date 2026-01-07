import { Context, h } from 'koishi';
import { Config } from './index';
import { } from 'koishi-plugin-umami-statistics-service'
import { umami } from './index';
import { createAxiosInstance } from './proxy';

export function apply(ctx: Context, config: any) {
  const umamiD = umami
  const axiosWithProxy = createAxiosInstance(config);
  
  ctx.command(
    'getid <profLink:string>', 
    '获取Steam ID. \n\t profLink的格式 比如: https://steamcommunity.com/id/VincentZyu/ \n\t 或者: https://steamcommunity.com/profiles/76561199321190157/' 
    , { authority: 0 }
  )
    .action(async ({ session }, profLink) => {
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';
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
        return `${replyPrefix}请提供 Steam 个人资料链接`;
      }
      
      if (!profLink.startsWith("https://steamcommunity.com/")) {
        return `${replyPrefix}请输入正确的Steam个人资料链接`;
      }
      
      if (!config.steamWebApiKey) {
        return `${replyPrefix}未配置 steamWebApiKey，无法使用 getid 功能。请在插件设置中填写来自 steamwebapi.com 的 API Key。`;
      }
      
      try {
        const profUrl = `https://www.steamwebapi.com/steam/api/profile?key=${config.steamWebApiKey}&id=${profLink}`;
        const response = await axiosWithProxy.get(profUrl);
        const data = response.data;
        
        let result = `${replyPrefix}用户名: ` +
          data.personaname +
          '\nSteam ID: ' +
          data.steamid;
        return result;
      } catch (e) {
        const status = e.response?.status;
        if (status === 402) {
          return `${replyPrefix}steamwebapi.com 配额已用尽 (402)，请稍后再试或充值配额。`;
        }
        ctx.logger.error(`[cs-lookup] getid 请求失败: ${e.message}`);
        return `${replyPrefix}获取 Steam ID 失败: ${e.message}`;
      }
    });
}