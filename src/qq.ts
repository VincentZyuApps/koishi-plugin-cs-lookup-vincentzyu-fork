import { h } from 'koishi';

export const DEFAULT_KEYBOARD_ROWS = {
  rows: [
    {
      buttons: [
        {
          render_data: { label: '🎒 查库存', style: 1 },
          action: {
            type: 2,
            permission: { type: 2 },
            data: '${csInvCommandName} -s ${steamidInDb}',
            enter: true,
          },
        },
        {
          render_data: { label: '🔗 绑定', style: 1 },
          action: {
            type: 2,
            permission: { type: 2 },
            data: '${csBindCommandName} ${steamidInDb}',
            enter: true,
          },
        },
      ],
    },
    {
      buttons: [
        {
          render_data: { label: '🆔 查绑定', style: 1 },
          action: {
            type: 2,
            permission: { type: 2 },
            data: '${csMyidCommandName}',
            enter: true,
          },
        },
        {
          render_data: { label: '🔍 获取ID', style: 1 },
          action: {
            type: 2,
            permission: { type: 2 },
            data: '${getidCommandName}',
            enter: true,
          },
        },
      ],
    },
  ],
};

export function buildQueryKeyboard(
  cmds: {
    csInvCommandName: string;
    csBindCommandName: string;
    csMyidCommandName: string;
    getidCommandName: string;
  },
  userId: string,
  steamidInDb: string,
  customJson?: string,
): object {
  let raw: string;
  if (customJson) {
    raw = customJson;
  } else {
    raw = JSON.stringify(DEFAULT_KEYBOARD_ROWS);
  }
  try {
    raw = raw.replace(/\$\{csInvCommandName\}/g, cmds.csInvCommandName);
    raw = raw.replace(/\$\{csBindCommandName\}/g, cmds.csBindCommandName);
    raw = raw.replace(/\$\{csMyidCommandName\}/g, cmds.csMyidCommandName);
    raw = raw.replace(/\$\{getidCommandName\}/g, cmds.getidCommandName);
    raw = raw.replace(/\$\{userId\}/g, userId);
    raw = raw.replace(/\$\{steamidInDb\}/g, steamidInDb);
    const parsed = JSON.parse(raw);
    if (parsed?.rows?.length) return parsed;
  } catch {}
  return DEFAULT_KEYBOARD_ROWS;
}

export function buildQueryMarkdown(steamId: string, steamName: string): string {
  return [
    '# CS2 库存查询结果 ✨',
    '',
    `> Steam ID: ${steamId}`,
    `> 用户名: ${steamName}`,
  ].join('\n');
}

export async function sendQQMarkdown(
  session: any,
  markdown: string,
  keyboard: object,
  _msgSeq?: number,
): Promise<void> {
  if (!['qq', 'qqguild'].includes(session.platform)) return;
  try {
    const isCrack = !!(session.bot as any)?.config?.autoStreamText;

    if (isCrack) {
      const payload: Record<string, unknown> = {
        markdown: { content: markdown },
      };
      if ((keyboard as any)?.rows?.length) {
        payload.keyboard = { content: keyboard };
      }
      await session.send(h('qq:rawmarkdown', payload));
    } else {
      const payload: Record<string, unknown> = {
        msg_type: 2,
        markdown: { content: markdown },
      };
      if ((keyboard as any)?.rows?.length) {
        payload.keyboard = { content: keyboard };
      }

      const s = session;
      if (
        s.messageId &&
        s.timestamp &&
        Date.now() - s.timestamp < 5 * 60 * 1000 - 2000
      ) {
        s.seq ||= 0;
        payload.msg_id = s.messageId;
        payload.msg_seq = ++s.seq;
      }

      await session.bot.internal.sendMessage(session.channelId, payload);
    }
  } catch (e) {
    console.warn('⚠️💬 [QQ Markdown] 发送失败, 不影响图片:', e?.message || e);
  }
}

export async function replyWithMarkdownKeyboard(
  session: any,
  ctx: any,
  config: {
    enableQQMarkdown: boolean;
    replyToUser: boolean;
    qqMarkdownKeyboardJson: string;
    csInvCommandName: string;
    csBindCommandName: string;
    csMyidCommandName: string;
    getidCommandName: string;
  },
  title: string,
  content: string,
): Promise<string | void> {
  const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';

  if (
    config.enableQQMarkdown &&
    (session.platform === 'qq' || session.platform === 'qqguild')
  ) {
    let steamidInDb = '';
    try {
      const row = await ctx.database.get('cs_lookup_vincentzyu_fork', {
        userid: session.userId,
        platform: session.platform,
      });
      if (row.length) steamidInDb = row[0].steamId;
    } catch {}

    const md =
      `# ${title}\n\n` +
      content
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n');
    const kb = buildQueryKeyboard(
      {
        csInvCommandName: config.csInvCommandName,
        csBindCommandName: config.csBindCommandName,
        csMyidCommandName: config.csMyidCommandName,
        getidCommandName: config.getidCommandName,
      },
      session.userId,
      steamidInDb,
      config.qqMarkdownKeyboardJson,
    );
    await sendQQMarkdown(session, md, kb);
    return;
  }

  return `${replyPrefix}${content}`;
}

export function stringifyCompact(obj: any): string {
  const rows = obj.rows;
  let result = '{\n';
  result += '  "rows": [\n';
  for (let ri = 0; ri < rows.length; ri++) {
    const buttons = rows[ri].buttons.map(
      (b: any) => '        ' + JSON.stringify(b),
    );
    result += '    {\n';
    result += '      "buttons": [\n';
    result += buttons.join(',\n');
    result += '\n      ]\n';
    result += '    }' + (ri < rows.length - 1 ? ',' : '') + '\n';
  }
  result += '  ]\n';
  result += '}';
  return result;
}
