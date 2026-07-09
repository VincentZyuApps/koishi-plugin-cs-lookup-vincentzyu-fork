import { Context, h } from 'koishi';
import { buildQueryKeyboard, sendQQMarkdown } from '../qq';

function buildCsHelpMarkdown(config: any): string {
  return [
    '# CS2 库存查询帮助 🎒',
    '',
    '> 推荐流程：打开 https://steamid.io 获取 SteamID64，再绑定到 Koishi 用户，之后直接查库存。',
    '',
    '## 📖 常用指令',
    '',
    '| 用途 | 指令 |',
    '| --- | --- |',
    `| 📖 查看帮助 | \`${config.csHelpCommandName}\` / \`cs-help\` |`,
    `| 🎒 查询自己的库存 | \`${config.csInvCommandName}\` / \`cs-inv\` |`,
    `| 👥 查询指定用户绑定的库存 | \`${config.csInvCommandName} @用户\` 或 \`${config.csInvCommandName} <userId>\` |`,
    `| 🔎 直接查询 SteamID | \`${config.csInvCommandName} -s <SteamID64>\` |`,
    `| 🔗 绑定 SteamID | \`${config.steamBindCommandName} <SteamID64>\` / \`steam-bind <SteamID64>\` |`,
    `| 🆔 查看自己的绑定 | \`${config.steamMyIdCommandName}\` / \`steam-myid\` |`,
    `| 🔍 解析 SteamID | \`${config.steamGetIdCommandName} <Steam个人资料链接>\` / \`steam-getid <Steam个人资料链接>\` |`,
    '',
    '## 💡 提示',
    '',
    '> SteamID64 通常是 17 位纯数字。<br>',
    '',
    '> 不知道 SteamID 时，可以打开 https://steamid.io 粘贴 Steam 个人主页链接查询。<br>',
    '',
    '> 如果库存查询返回 403，可能是该用户隐藏了 Steam 库存；可以让对方公开库存后重试。<br>',
    '',
    '> 如果库存查询返回 429，可能是 Steam 限流；可以稍后再试或减少连续查询。',
  ].join('\n');
}

export function registerCsHelpCommand(ctx: Context, config: any) {
  ctx
    .command(
      config.csHelpCommandName,
      '📖 查看 CS2 库存查询插件帮助',
      { authority: 0 },
    )
    .alias('cs-help')
    .action(async ({ session }) => {
      const markdown = buildCsHelpMarkdown(config);

      if (
        config.enableQQMarkdown &&
        (session.platform === 'qq' || session.platform === 'qqguild')
      ) {
        const keyboard = buildQueryKeyboard(
          {
            csHelpCommandName: config.csHelpCommandName,
            csInvCommandName: config.csInvCommandName,
            steamBindCommandName: config.steamBindCommandName,
            steamMyIdCommandName: config.steamMyIdCommandName,
            steamGetIdCommandName: config.steamGetIdCommandName,
          },
          session.userId,
          config.qqMarkdownKeyboardJson,
        );
        await sendQQMarkdown(session, markdown, keyboard);
        return '';
      }

      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';
      return `${replyPrefix}${markdown}`;
    });
}
