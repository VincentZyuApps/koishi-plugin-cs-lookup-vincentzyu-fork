import { Context, h } from "koishi";

export async function myid(ctx: Context, config: any) {
  ctx.command(
    'cs-myid',
    '查询自己绑定的 SteamId',
    { authority: 0 }
  )
    .action(async ({ session }) => {
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';
      
      const PLATFORM = session.platform;
      const USERID = session.userId;

      const res = await ctx.database.get('cs_lookup', { userid: USERID, platform: PLATFORM });
      
      if (res.length === 0) {
        return `${replyPrefix}你还没有绑定 SteamID，请使用 cs-bind 命令进行绑定`;
      }

      return `${replyPrefix}你绑定的 SteamID: ${res[0].steamId}`;
    });
}
