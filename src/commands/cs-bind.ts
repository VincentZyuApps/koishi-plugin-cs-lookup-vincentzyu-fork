import { Context, h } from 'koishi';
import { isOnlyDigits } from './cs-inv';
import { replyWithMarkdownKeyboard } from '../qq';

export async function bind(ctx: Context, config: any) {
  ctx
    .command(
      `${config.csBindCommandName} <steamId:string> [userId:string]`,
      '🔗 绑定 SteamId 到 Koishi 用户\n\t 📌 参数1 必填: steamId 纯数字, 用 getid 获取\n\t 👤 参数2 可选: userId/@用户, 为他人绑定, 默认自己',
      { authority: 0 },
    )
    .alias('cs-bind')
    .action(async ({ session }, arg1_steamId, arg2_userId) => {
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';
      ctx.logger.info(
        `[src/commands/cs-bind.ts] [info] 📥 arg1_steamId = ${arg1_steamId}, arg2_userId = ${arg2_userId}`,
      );
      const first_at_user =
        h.parse(session.content).find((e) => e.type === 'at') ?? null;
      ctx.logger.info(
        `[src/commands/cs-bind.ts] [info] 👤 first_at_user = ${JSON.stringify(first_at_user)}`,
      );

      const PLATFORM = session.platform;
      let USERID;
      const STEAMID = arg1_steamId;

      if (first_at_user) {
        USERID = first_at_user.attrs.id;
      } else if (arg2_userId) {
        USERID = arg2_userId;
      } else {
        USERID = session.userId;
      }

      const userObj =
        typeof session.bot.getUser === 'function'
          ? await session.bot
              .getUser(USERID, session.channelId)
              .catch(() => ({ name: session.username || USERID }))
          : { name: session.username || USERID };

      ctx.logger.info(
        `[src/commands/cs-bind.ts] [info] 🔍 👤 STEAMID = ${STEAMID}, USERID = ${USERID}`,
      );

      if (!isOnlyDigits(STEAMID)) {
        const _r = await replyWithMarkdownKeyboard(
          session,
          ctx,
          config,
          '绑定steamid操作',
          `⚠️ 提供正确的 SteamID 或者使用 ${config.getidCommandName} 命令获取 SteamID`,
        );
        if (_r !== undefined) return _r;
      }

      const res = await ctx.database.get('cs_lookup_vincentzyu_fork', {
        userid: USERID,
        platform: PLATFORM,
      });
      if (res.length) {
        session.send(
          `${replyPrefix}🔄 用户 ${userObj.name}(${USERID}-${PLATFORM}) 已绑定 SteamID ${STEAMID}\n\t 回复 ok 以进行替换，或者回复 cancel 取消替换`,
        );
        const response = await session.prompt();
        if (response === 'cancel') {
          const _r = await replyWithMarkdownKeyboard(
            session,
            ctx,
            config,
            '绑定steamid操作',
            '⏹️ 已取消替换 SteamID',
          );
          if (_r !== undefined) return _r;
        } else if (response === 'ok') {
          await ctx.database.remove('cs_lookup_vincentzyu_fork', {
            userid: USERID,
            platform: PLATFORM,
          });
        } else {
          const _r = await replyWithMarkdownKeyboard(
            session,
            ctx,
            config,
            '绑定steamid操作',
            '❌ 无效回复, 已取消操作',
          );
          if (_r !== undefined) return _r;
        }
      }

      await ctx.database.create('cs_lookup_vincentzyu_fork', {
        id: `${USERID}-${PLATFORM}`,
        steamId: STEAMID,
        userid: USERID,
        platform: PLATFORM,
      });
      const _r = await replyWithMarkdownKeyboard(
        session,
        ctx,
        config,
        '绑定steamid操作',
        `✅ 已绑定 SteamID ${STEAMID} 到用户 ${session.username}(${USERID} - ${PLATFORM})`,
      );
      if (_r !== undefined) return _r;
    });
}
