import { Context, h } from 'koishi'
import { isOnlyDigits } from './cs-inv'

export async function bind(ctx: Context, config: any) {
  ctx.command(
    `${config.csBindCommandName} <steamId:string> [userId:string]`,
    '绑定 SteamId. \n\t 参数1 必填: steamId:string 你需要传入正确的纯数字steamId, 用getid指令可以获取. \n\t 参数2 可选: 可以手动传入userId, 也可以使用艾特, 为他人绑定steamId. 如果不传，那么就默认是自己。优先级：第一个艾特元素 > 传参  > 默认值fallback自己',
    { authority: 0 }
  )
    .action(async ({ session }, arg1_steamId, arg2_userId) => {
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : ''
      ctx.logger.info(`arg1_steamId = ${arg1_steamId}, arg2_userId = ${arg2_userId}`)
      const first_at_user = h.parse(session.content).find(e => e.type === 'at') ?? null
      ctx.logger.info(`first_at_user = ${JSON.stringify(first_at_user)}`)

      const PLATFORM = session.platform
      let USERID
      const STEAMID = arg1_steamId

      if (first_at_user) {
        USERID = first_at_user.attrs.id
      } else if (arg2_userId) {
        USERID = arg2_userId
      } else {
        USERID = session.userId
      }

      const userObj = await session.bot.getUser(USERID, session.channelId)

      ctx.logger.info(`STEAMID = ${STEAMID}, USERID = ${USERID}`)

      if (!isOnlyDigits(STEAMID)) {
        return `${replyPrefix}⚠️ 提供正确的 SteamID 或者使用 ${config.getidCommandName} 命令获取 SteamID`
      }

      const res = await ctx.database.get('cs_lookup_vincentzyu_fork', { userid: USERID, platform: PLATFORM })
      if (res.length) {
        session.send(`${replyPrefix}🔄 用户 ${userObj.name}(${USERID}-${PLATFORM}) 已绑定 SteamID ${STEAMID}, \n\t 回复 ok 以进行替换，或者回复 cancel 取消替换`)
        const response = await session.prompt()
        if (response === 'cancel') {
          return `${replyPrefix}⏹️ 已取消替换 SteamID`
        } else if (response === 'ok') {
          await ctx.database.remove('cs_lookup_vincentzyu_fork', { userid: USERID, platform: PLATFORM })
        } else {
          return `${replyPrefix}❌ 无效回复, 已取消操作`
        }
      }

      await ctx.database.create('cs_lookup_vincentzyu_fork', {
        id: `${USERID}-${PLATFORM}`,
        steamId: STEAMID,
        userid: USERID,
        platform: PLATFORM,
      })
      return `${replyPrefix}✅ 已绑定 SteamID ${STEAMID} 到用户 ${session.username}(${USERID} - ${PLATFORM})`
    })
}
