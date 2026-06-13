import { Context, h } from 'koishi'

export async function myid(ctx: Context, config: any) {
  ctx
    .command(
      config.csMyidCommandName,
      '🆔 查询自己绑定的 SteamId ✅ 快速查看绑定状态',
      { authority: 0 }
    )
    .alias('cs-myid')
    .action(async ({ session }) => {
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : ''
      
      const PLATFORM = session.platform
      const USERID = session.userId

      const res = await ctx.database.get('cs_lookup_vincentzyu_fork', { userid: USERID, platform: PLATFORM })
      
      if (res.length === 0) {
        return `${replyPrefix}⚠️ 你还没有绑定 SteamID，请使用 ${config.csBindCommandName} 命令进行绑定`
      }

      return `${replyPrefix}ℹ️ 你绑定的 SteamID: ${res[0].steamId}`
    })
}
