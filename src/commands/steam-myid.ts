import { Context } from 'koishi';
import { replyWithMarkdownKeyboard } from '../qq';

export async function registerSteamMyIdCommand(ctx: Context, config: any) {
  ctx
    .command(
      config.steamMyIdCommandName,
      '🆔 查询自己绑定的 SteamId ✅ 快速查看绑定状态',
      { authority: 0 },
    )
    .alias('steam-myid')
    .action(async ({ session }) => {
      const PLATFORM = session.platform;
      const USERID = session.userId;

      const res = await ctx.database.get('cs_lookup_vincentzyu_fork', {
        userid: USERID,
        platform: PLATFORM,
      });

      if (res.length === 0) {
        const _r = await replyWithMarkdownKeyboard(
          session,
          ctx,
          config,
          '查询我绑定的steamid操作',
          `⚠️ 你还没有绑定 SteamID，请使用 ${config.steamBindCommandName} 命令进行绑定`,
        );
        if (_r !== undefined) return _r;
      }

      const _r = await replyWithMarkdownKeyboard(
        session,
        ctx,
        config,
        '查询我绑定的steamid操作',
        `ℹ️ 你绑定的 SteamID: ${res[0].steamId}`,
      );
      if (_r !== undefined) return _r;
    });
}
