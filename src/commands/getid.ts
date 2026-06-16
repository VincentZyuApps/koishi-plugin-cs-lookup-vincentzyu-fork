import { Context } from 'koishi';
import { createAxiosInstance, requestWithRetry } from '../proxy';
import { replyWithMarkdownKeyboard } from '../qq';
import { logInfo } from '../logger';

export function apply(ctx: Context, config: any) {
  const axiosWithProxy = createAxiosInstance(config, ctx);

  ctx
    .command(
      `${config.getidCommandName} <profLink:string>`, '🔍 获取 Steam ID 📖 通过个人主页链接解析\n\t 🔗 格式: https://steamcommunity.com/id/VincentZyu/ 或 https://steamcommunity.com/profiles/76561198151914303\n\t 🌐 网站推荐: https://steamid.io， ← 也可以用这个网页，填入主页URL 查询SteamID等公开信息', { authority: 0 }, )
    .alias('get-steamid')
    .action(async ({ session }, profLink) => {
      if (!profLink) {
        const _r = await replyWithMarkdownKeyboard(
          session, ctx, config, '获取SteamID操作', '⚠️ 请提供 Steam 个人资料链接');
        if (_r !== undefined) return _r;
      }

      if (!profLink.startsWith('https://steamcommunity.com/')) {
        const _r = await replyWithMarkdownKeyboard(
          session, ctx, config, '获取SteamID操作', '❌ 请输入正确的Steam个人资料链接');
        if (_r !== undefined) return _r;
      }

      if (!config.steamWebApiKey) {
        const _r = await replyWithMarkdownKeyboard(
          session, ctx, config, '获取SteamID操作', '🔑 未配置 steamWebApiKey，无法使用 getid 功能。请在插件设置中填写来自 steamwebapi.com 的 API Key。');
        if (_r !== undefined) return _r;
      }

      try {
        let data: any;

        // 查缓存
        if (config.enableGetidCache) {
          const cached = await ctx.database.get(
            'cs_getid_cache_vincentzyu_fork', { url: profLink });
          if (cached.length) {
            const age = (Date.now() - cached[0].cached_at) / 86400000;
            if (age < config.getidCacheDays) {
              data = {
                personaname: cached[0].personaName, steamid: cached[0].steamId, };
              logInfo(ctx, config, 'info', __filename, `💿 💾 getid 缓存命中: ${profLink}`);
            }
          }
        }

        // 缓存未命中则调 API
        if (!data) {
          const profUrl = `https://www.steamwebapi.com/steam/api/profile?key=${config.steamWebApiKey}&id=${profLink}`;
          const response = await requestWithRetry(
            () => axiosWithProxy.get(profUrl), { label: 'getid-steamwebapi', ctx });
          data = response.data;

          // 写入缓存
          if (config.enableGetidCache) {
            await ctx.database.upsert('cs_getid_cache_vincentzyu_fork', [
              {
                url: profLink, steamId: data.steamid, personaName: data.personaname, cached_at: Date.now(), }, ]);
          }
        }

        const result =
          `ℹ️ 用户名: ` + data.personaname + '\nSteam ID: ' + data.steamid;
        const _r = await replyWithMarkdownKeyboard(
          session, ctx, config, '获取SteamID操作', result);
        if (_r !== undefined) return _r;
      } catch (e) {
        const status = e.response?.status;
        if (status === 402) {
          const _r = await replyWithMarkdownKeyboard(
            session, ctx, config, '获取SteamID操作', '💸 steamwebapi.com 配额已用尽 (402)，请稍后再试或充值配额。');
          if (_r !== undefined) return _r;
        }
        logInfo(ctx, config, 'error', __filename, `⚡ ❌ 🔍 请求失败: ${e.message}`);
        const _r = await replyWithMarkdownKeyboard(
          session, ctx, config, '获取SteamID操作', `❌ 获取 Steam ID 失败: ${e.message}`);
        if (_r !== undefined) return _r;
      }
    });
}
