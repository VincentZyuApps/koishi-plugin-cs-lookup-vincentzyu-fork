import { Context, h } from 'koishi';
import { isOnlyDigits } from './cs-inv';
import { replyWithMarkdownKeyboard } from '../qq';
import { logInfo } from '../logger';
import { UserIdSource } from '../types';

async function canBindSteamIdForOthers(ctx: Context, config: any, session: any) {
  const useKoishiAuthority = config.useKoishiAuthority !== false;
  const usePluginAdminTable = config.usePluginAdminTable === true;
  let hasAnyCheck = false;
  let allowed = false;

  if (useKoishiAuthority) {
    hasAnyCheck = true;
    await session.observeUser?.(['authority']);
    allowed ||= await ctx.permissions.test('authority:4', session);
  }

  if (usePluginAdminTable) {
    hasAnyCheck = true;
    const pluginAdmins = Array.isArray(config.pluginAdmins) ? config.pluginAdmins : [];
    allowed ||= pluginAdmins.some((admin) =>
      admin?.enabled !== false &&
      admin?.platform?.trim() === session.platform &&
      admin?.userId?.trim() === session.userId
    );
  }

  return { hasAnyCheck, allowed };
}

export async function bind(ctx: Context, config: any) {
  ctx
    .command(
      `${config.csBindCommandName} <steamId:string> [userId:string]`, '🔗 绑定 SteamId 到 Koishi 用户\n' + 
      '\t 💡 提示：打开 `https://steamid.io` → 粘贴个人资料链接 → 复制 SteamID64 🔎' +
      '\t 📌 参数1 必填: steamId 纯数字, 用 getid 获取\n' + 
      '\t 👤 参数2 可选: userId/@用户, 为他人绑定, 默认自己' +
      '', { authority: 0 }, )
    .alias('cs-bind')
    .action(async ({ session }, arg1_steamId, arg2_userId) => {
      logInfo(ctx, config, 'debug', 'src/commands/cs-bind.ts', `🕵️‍♂️ 是否传入arg2_userId参数? ${arg2_userId ? '✅✅✅是' : '❌❌❌否'}`);

      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';
      logInfo(ctx, config, 'info', 'src/commands/cs-bind.ts', `📥 arg1_steamId = ${arg1_steamId}, arg2_userId = ${arg2_userId}`);

      const isAtUserBanned =
        config.banAtUserArg === 'all' ||
        ( config.banAtUserArg === 'qq' && (session.platform === 'qq' || session.platform === 'qqguild') );

      const PLATFORM = session.platform;
      let USERID;
      const STEAMID = arg1_steamId;

      let userIdSource: UserIdSource;
      if (arg2_userId) {
        const userIdRegex = /<at id="([^"]+)"(?: name="([^"]+)")?\/>/;
        const match = arg2_userId.match(userIdRegex);
        if (match && !isAtUserBanned) {
          USERID = match[1];
          userIdSource = UserIdSource.ATUSER;
        } else {
          USERID = arg2_userId.trim();
          userIdSource = UserIdSource.CMDARG;
        }
      } else {
        USERID = session.userId;
        userIdSource = UserIdSource.SESSION;
      }
      logInfo(ctx, config, 'info', 'src/commands/cs-bind.ts', `👥 👤 USERID 来源: ${userIdSource} (value=${USERID})`);

      if (USERID !== session.userId) {
        const { hasAnyCheck, allowed } = await canBindSteamIdForOthers(ctx, config, session);
        logInfo(ctx, config, 'info', 'src/commands/cs-bind.ts', `🔐 为他人绑定 SteamID 权限校验: hasAnyCheck=${hasAnyCheck}, allowed=${allowed}, operator=${session.userId}, target=${USERID}`);

        if (!hasAnyCheck) {
          const _r = await replyWithMarkdownKeyboard(
            session, ctx, config, '绑定steamid操作',
            '❌ 未启用任何管理员校验方式，无法为他人绑定 SteamID');
          if (_r !== undefined) return _r;
        }

        if (!allowed) {
          const _r = await replyWithMarkdownKeyboard(
            session, ctx, config, '绑定steamid操作',
            '❌ 权限不足：为他人绑定 SteamID 需要 Koishi 4 级权限，或位于本插件管理员表中');
          if (_r !== undefined) return _r;
        }
      }

      const userObj =
        typeof session.bot.getUser === 'function'
          ? await session.bot
              .getUser(USERID, session.channelId)
              .catch(() => ({ name: session.username || USERID }))
          : { name: session.username || USERID };

      logInfo(ctx, config, 'info', 'src/commands/cs-bind.ts', `🔍 👤 STEAMID = ${STEAMID}, USERID = ${USERID}`);

      if (!isOnlyDigits(STEAMID)) {
        const _r = await replyWithMarkdownKeyboard(
          session, ctx, config, '绑定steamid操作', `⚠️ 清提供正确的SteamID(必须是纯数字), 或者使用 ${config.getidCommandName} 命令获取 SteamID`);
        if (_r !== undefined) return _r;
      }

      const res = await ctx.database.get('cs_lookup_vincentzyu_fork', {
        userid: USERID, platform: PLATFORM, });
      if (res.length) {
        const usePrompt =
          config.promptMode === 'all' ||
          (config.promptMode === 'non-qq' &&
            session.platform !== 'qq' &&
            session.platform !== 'qqguild');

        if (usePrompt) {
          session.send(
            `${replyPrefix}🔄 用户 ${userObj.name}(${USERID}-${PLATFORM}) 已绑定 SteamID ${STEAMID}\n\t 回复 ok 以进行替换，或者回复 cancel 取消替换`);
          const response = await session.prompt();
          if (response === 'cancel') {
            const _r = await replyWithMarkdownKeyboard(
              session, ctx, config, '绑定steamid操作', '⏹️ 已取消替换 SteamID');
            if (_r !== undefined) return _r;
          } else if (response === 'ok') {
            await ctx.database.remove('cs_lookup_vincentzyu_fork', {
              userid: USERID, platform: PLATFORM, });
          } else {
            const _r = await replyWithMarkdownKeyboard(
              session, ctx, config, '绑定steamid操作', '❌ 无效回复, 已取消操作');
            if (_r !== undefined) return _r;
          }
        } else {
          await ctx.database.remove('cs_lookup_vincentzyu_fork', {
            userid: USERID, platform: PLATFORM, });
        }
      }

      await ctx.database.create('cs_lookup_vincentzyu_fork', {
        id: `${USERID}-${PLATFORM}`, steamId: STEAMID, userid: USERID, platform: PLATFORM, });
      const _r = await replyWithMarkdownKeyboard(
        session, ctx, config, '绑定steamid操作', `✅ 已绑定 SteamID ${STEAMID} 到用户 ${session.username}(${USERID} - ${PLATFORM})`);
      if (_r !== undefined) return _r;
    });
}
