import { Context, h } from 'koishi';
import { createAxiosInstance, requestWithRetry } from '../proxy';
import { LOG_LEVELS, UserIdSource } from '../types';
import { logInfo } from '../logger';
import {} from 'koishi-plugin-puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildCustomFontConfig, generateHtml, renderCsInvImage,
} from '../template/pptr-render-cs-inv';
import { replyWithMarkdownKeyboard } from '../qq';

export function isOnlyDigits(str: string): boolean {
  return /^\d+$/.test(str);
}

export const light = ['#81a1c1', '#2e3440', '#5e81ac']; // Changed font color to a dark gray
export const dark = ['#2e3440', '#ffffff', '#434c5e'];

/**
 * 确保缓存目录存在
 */
function ensureCacheDir(cacheDir: string): void {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * 根据 classid 和 instanceid 生成缓存文件路径
 */
function getCacheFilePath(
  cacheDir: string, classid: string, instanceid: string,
): string {
  return path.join(
    cacheDir, `item_class_${classid}_instance_${instanceid}.b64`);
}

/**
 * 从缓存读取 Base64 图片
 */
function readFromCache(
  cacheDir: string, classid: string, instanceid: string,
): string | null {
  const filePath = getCacheFilePath(cacheDir, classid, instanceid);
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * 写入缓存
 */
function writeToCache(
  cacheDir: string, classid: string, instanceid: string, base64Data: string,
): void {
  try {
    const filePath = getCacheFilePath(cacheDir, classid, instanceid);
    fs.writeFileSync(filePath, base64Data, 'utf-8');
  } catch (e) {
    // ignore write errors silently when cache is unavailable
  }
}

/**
 * 确保 inv_data 目录存在
 */
function ensureInvDataDir(invDataDir: string): void {
  if (!fs.existsSync(invDataDir)) {
    fs.mkdirSync(invDataDir, { recursive: true });
  }
}

/**
 * 将 invData 写入文件
 */
function writeInvDataToFile(invDataDir: string, data: any): void {
  ensureInvDataDir(invDataDir);
  const filePath = path.join(invDataDir, 'res.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取图片的 Base64 编码
 */
async function getImageBase64(
  ctx: Context, axiosInstance: any, url: string, logLevel: string,
): Promise<string> {
  if (!url) return '';
  try {
    const response = (await requestWithRetry(
      () => axiosInstance.get(url, { responseType: 'arraybuffer' }), { label: `getImageBase64(${url})`, ctx }, )) as any;
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    logInfo(ctx, logLevel, 'warn', 'src/commands/cs-inv.ts', `❌ 🖼️ 转换图片为Base64失败: ${url}, error: ${e.message}`);
    return url;
  }
}

/**
 * 获取饰品图片的 Base64 编码（带缓存）
 * @returns { base64: string, fromCache: boolean }
 */
async function getItemImageBase64(
  ctx: Context, axiosInstance: any, iconUrl: string, classid: string, instanceid: string, enableCache: boolean, logLevel: string, cacheDir: string,
): Promise<{ base64: string; fromCache: boolean }> {
  const imageUrl =
    'https://community.cloudflare.steamstatic.com/economy/image/' + iconUrl;

  if (enableCache) {
    const cached = readFromCache(cacheDir, classid, instanceid);
    if (cached) {
      return { base64: cached, fromCache: true };
    }
  }

  const base64Data = await getImageBase64(ctx, axiosInstance, imageUrl, logLevel);

  if (enableCache && base64Data.startsWith('data:')) {
    writeToCache(cacheDir, classid, instanceid, base64Data);
  }

  return { base64: base64Data, fromCache: false };
}

export function inv(ctx: Context, config: any) {
  const axiosWithProxy = createAxiosInstance(config, ctx);
  const cacheImageDir = path.join(ctx.baseDir, ...config.csInvImageCachePath);
  const cacheDataDir = path.join(ctx.baseDir, ...config.csInvDataCachePath);

  ctx
    .command(
      `${config.csInvCommandName} [targetUser:text]`, '🎒 查看CS2/CS:GO库存 🖼️ 生成库存截图', { authority: 0 }, )
    .alias('cs-inv')
    .option('steamid', '-s, --steamid <steamid:string> 直接指定steam的id')
    .option('refresh', '-r, --refresh 强制刷新缓存并重新拉取')
    .option('noRefresh', '-n, --no-refresh 强制使用缓存（如有）')
    .action(async ({ session, options }, targetUser) => {
      const timingEnabled = LOG_LEVELS[config.logLevel] >= LOG_LEVELS.debug;
      const startTime = Date.now();
      const timing: { [key: string]: number } = {};

      const logTiming = (label: string) => {
        if (timingEnabled) {
          const elapsed = Date.now() - startTime;
          timing[label] = elapsed;
          logInfo(ctx, config, 'debug', 'src/commands/cs-inv.ts', `⏱️ ${label}: ${elapsed}ms`);
        }
      };

      if (options.refresh && options.noRefresh) {
        return '❌ --refresh 和 --no-refresh 不能同时使用';
      }
      const useCache = options.noRefresh
        ? true
        : options.refresh
          ? false
          : (config.enableInvDbCache && config.invDbCacheDays > 0);

      const PLATFORM = session.platform;
      let USERID = session.userId;
      let userIdSource = UserIdSource.SESSION;
      let STEAMID;

      const isAtUserBanned =
        config.banAtUserArg === 'all' ||
        (config.banAtUserArg === 'qq' &&
          (session.platform === 'qq' || session.platform === 'qqguild'));

      if (targetUser) {
        const userIdRegex = /<at id="([^"]+)"(?: name="([^"]+)")?\/>/;
        const match = targetUser.match(userIdRegex);
        if (match && !isAtUserBanned) {
          USERID = match[1];
          userIdSource = UserIdSource.ATUSER;
          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `👥 🔎 👤 @ 解析到艾特用户: ${USERID}`);
        } else {
          USERID = targetUser.trim();
          userIdSource = UserIdSource.CMDARG;
          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `👥 👤 使用传入 userid: ${USERID}`);
        }
      }
      logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `👥 👤 USERID 来源: ${userIdSource} (value=${USERID})`);

      if (options.steamid) {
        STEAMID = options.steamid;
        logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `🔖 🔍 -s 指定的 steamid: ${STEAMID}`);
      } else {
        const res = await ctx.database.get('cs_lookup_vincentzyu_fork', {
          userid: USERID, platform: PLATFORM, });
        if (res.length) {
          STEAMID = res[0].steamId;
          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `🗄️ ✅ 从数据库查询到 steamid: ${STEAMID}`);
        } else {
          const noSteamIdMsg = `⚠️ 请提供 steamID 或者使用 \`${config.getidCommandName}\` 命令获取或者使用 \`${config.csBindCommandName} <steamID>\` 进行绑定\n(查询的用户: ${USERID})`;

          return await replyWithMarkdownKeyboard(
            session, ctx, config, '⚠️ 未绑定 SteamID', noSteamIdMsg);
        }
      }

      logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `🔍 👤 STEAMID = ${STEAMID}, USERID = ${USERID}`);
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';
      const waitMsgId = await session.send(
        `${replyPrefix}🔄 正在获取 Steam 库存 🖼️ 渲染图片中..... \n\t 🔍 查询 SteamId = ${STEAMID}`);

      if (!isOnlyDigits(STEAMID)) {
        return `${replyPrefix}❌ 无效steamID, 若不知道steamID请使用指令 \`${config.getidCommandName} Steam个人资料页链接\` 获取`;
      }

      const steamWebApiUrl = `https://www.steamwebapi.com/steam/api/profile?key=${config.steamWebApiKey}&steam_id=${STEAMID}`;
      const officialApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.officialSteamApiKey}&steamids=${STEAMID}`;
      const invUrl = `https://steamcommunity.com/inventory/${STEAMID}/730/2?l=schinese`;

      const currentColorArr = config.enableDarkTheme ? dark : light;
      void currentColorArr;

      async function fetchFromOfficialApi(): Promise<{
        avatarfull: string;
        personaname: string;
        lastlogoff?: number;
      } | null> {
        if (!config.officialSteamApiKey) return null;
        try {
          const officialRes = await requestWithRetry(
            () => axiosWithProxy.get(officialApiUrl), { label: 'Steam官方API', ctx });
          const players = officialRes?.data?.response?.players;
          if (players && players.length > 0) {
            const player = players[0];
            return {
              avatarfull: player.avatarfull || '', personaname: player.personaname || '未知用户', lastlogoff: player.lastlogoff, };
          }
        } catch (e) {
          logInfo(ctx, config, 'warn', 'src/commands/cs-inv.ts', `⚡ 🔌 ❌ 🎮 官方 Steam API 请求失败: ${e.message}`);
        }
        return null;
      }

      async function fetchFromSteamWebApi(): Promise<{
        avatarfull: string;
        personaname: string;
        lastlogoff?: number;
      } | null> {
        if (!config.steamWebApiKey) return null;
        try {
          const userRes = await requestWithRetry(
            () => axiosWithProxy.get(steamWebApiUrl), { label: 'steamwebapi.com', ctx });
          const playerData = userRes?.data;
          return {
            avatarfull:
              playerData?.avatarfull || playerData?.player?.avatarfull || '', personaname:
              playerData?.personaname ||
              playerData?.player?.personaname ||
              '未知用户', lastlogoff:
              playerData?.lastlogoff || playerData?.player?.lastlogoff, };
        } catch (e) {
          const status = e.response?.status;
          if (status === 402) {
            logInfo(ctx, config, 'warn', 'src/commands/cs-inv.ts', '🔌 🌍 ⚠️ 💸 steamwebapi.com 配额已用尽 (402)');
          } else {
            logInfo(ctx, config, 'warn', 'src/commands/cs-inv.ts', `⚡ 🔌 ❌ 🌐 steamwebapi.com 请求失败 (${status || e.message})`);
          }
        }
        return null;
      }

      async function fetchPlayerInfo(): Promise<{
        avatarfull: string;
        personaname: string;
        lastlogoff?: number;
      }> {
        const preferOfficial = config.preferOfficialSteamApi !== false;

        if (preferOfficial) {
          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', '🔌 🎮 优先使用官方 Steam API...');
          let result = await fetchFromOfficialApi();
          if (result) return result;

          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', '⚡ 🔌 ⚠️ 🔀 官方 API 失败，回退到 steamwebapi.com...');
          result = await fetchFromSteamWebApi();
          if (result) return result;
        } else {
          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', '🔌 🌍 🌐 优先使用 steamwebapi.com...');
          let result = await fetchFromSteamWebApi();
          if (result) return result;

          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', '⚡ 🔌 ⚠️ 🔀 steamwebapi.com 失败，回退到官方 Steam API...');
          result = await fetchFromOfficialApi();
          if (result) return result;
        }

        if (!config.steamWebApiKey && !config.officialSteamApiKey) {
          throw new Error(
            '未配置任何 Steam API Key，请在插件设置中至少填写一个 Key。\n• officialSteamApiKey: 官方免费 (steamcommunity.com/dev/apikey)\n• steamWebApiKey: 付费 (steamwebapi.com)');
        }
        throw new Error(
          '所有 Steam API 请求都失败，可能是网络问题或配额用尽。');
      }

      try {
        const playerInfo = await fetchPlayerInfo();
        logTiming('获取玩家信息');

        const playerAvatarFullUrl = playerInfo.avatarfull;
        const proxiedPlayerAvatarFullUrl = await getImageBase64(
          ctx, axiosWithProxy, playerAvatarFullUrl, config.logLevel);
        logTiming('转换头像为Base64');

        logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `🎯 🎮 🖼️ playerAvatarFullUrl = ${playerAvatarFullUrl}`);
        const playerPersonName = playerInfo.personaname;
        const playerLastLogoff = playerInfo.lastlogoff;
        const playerLastLogoffTimeStr = playerLastLogoff
          ? new Date(playerLastLogoff * 1000).toLocaleString()
          : '未知';

        let invData: any;
        let usedCache = false;
        if (useCache) {
          const cached = await ctx.database.get(
            'cs_inv_cache_vincentzyu_fork', { steamid: STEAMID });
          if (cached.length) {
            const age = (Date.now() - cached[0].cached_at) / 86400000;
            if (config.invDbCacheDays > 0 && age < config.invDbCacheDays) {
              invData = JSON.parse(cached[0].inv_json);
              usedCache = true;
              logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `💿 🗄️ 💾 ✅ 使用数据库缓存库存数据: ${STEAMID}`);
            }
          }
        }
        if (!usedCache) {
          const invRes = await requestWithRetry(
            () => axiosWithProxy.get(invUrl), { label: 'Steam库存数据', ctx });
          invData = invRes.data;
          if (useCache || options.refresh) {
            await ctx.database.upsert('cs_inv_cache_vincentzyu_fork', [
              {
                steamid: STEAMID, inv_json: JSON.stringify(invData), cached_at: Date.now(), }, ]);
          }
        }
        logTiming('获取库存数据');

        logInfo(ctx, config, 'debug', 'src/commands/cs-inv.ts', `📦 invData的前1000个字符： ${JSON.stringify(invData).slice(0, 1000)}.....`);

        if (config.verboseFileLog) {
          try {
            writeInvDataToFile(cacheDataDir, invData);
            logInfo(ctx, config, 'debug', 'src/commands/cs-inv.ts', `📝 已将库存数据写入: ${path.join(cacheDataDir, 'res.json')}`);
          } catch (e) {
            logInfo(ctx, config, 'warn', 'src/commands/cs-inv.ts', `⚡ 🎒 ❌ 📁 写入库存数据文件失败: ${e.message}`);
          }
        }

        let cardHtml = ``;
        let gridColumns = config.gridColumns || 4;
        let totalStr = '';
        let pageHeight = 500;

        if (!invData.descriptions || invData.descriptions.length === 0) {
          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', '🎒 📭 invData没有descriptions字段。');
          gridColumns = 1;
          totalStr = `总物品数: 0`;
          cardHtml = `
            <div class="empty-message">📦 该用户没有CS2库存</div>
          `;
          pageHeight = 400;
        } else {
          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', '🎒 📋 ✅ invData有descriptions字段。');

          if (config.enableImageCache !== false) {
            ensureCacheDir(cacheImageDir);
          }

          const itemMap = new Map<
            string, { count: number; imageUrl: string }
          >();
          let cacheHitCount = 0;
          let cacheMissCount = 0;

          for (const item of invData.descriptions) {
            const itemName = item.market_name;
            const classid = item.classid || '';
            const instanceid = item.instanceid || '0';

            if (!itemMap.has(itemName)) {
              const result = await getItemImageBase64(
                ctx, axiosWithProxy, item.icon_url, classid, instanceid, config.enableImageCache !== false, config.logLevel, cacheImageDir);

              if (result.fromCache) {
                cacheHitCount++;
              } else {
                cacheMissCount++;
              }

              itemMap.set(itemName, { count: 0, imageUrl: result.base64 });
            }
            const itemInfo = itemMap.get(itemName);
            itemInfo.count += 1;
          }

          if (timingEnabled && config.enableImageCache !== false) {
            logInfo(ctx, config, 'debug', 'src/commands/cs-inv.ts', `📊 缓存统计: 命中 ${cacheHitCount}, 未命中 ${cacheMissCount}`);
          }
          logTiming('转换饰品图片为Base64');

          for (const [itemName, itemInfo] of itemMap.entries()) {
            const countBadge =
              itemInfo.count > 1
                ? `<span class="item-count">x${itemInfo.count}</span>`
                : '';
            cardHtml += `
              <div class="item-card">
                ${countBadge}
                <div class="item-image-wrapper">
                  <img src="${itemInfo.imageUrl}" alt="${itemName}" class="item-image">
                </div>
                <div class="item-name">${itemName}</div>
              </div>
            `;
          }

          totalStr = `总物品数: ${invData.total_inventory_count}`;
          const CARD_HEIGHT_CALC = 150;
          const GAP_CALC = 8;
          const rowCount = Math.ceil(itemMap.size / gridColumns);
          pageHeight = 150 + rowCount * (CARD_HEIGHT_CALC + GAP_CALC) + 40;
        }

        const fontConfig = buildCustomFontConfig(ctx, config.customFontPath);

        const html = generateHtml({
          cardHTML: cardHtml, gridColumns, totalStr, steamId: STEAMID, steamName: playerPersonName, playerAvatarUrl: proxiedPlayerAvatarFullUrl, playerLastLogoffTimeStr, darkMode: config.enableDarkTheme, enableAvatarBackground: config.enableAvatarBackground, fontConfig, showItemCount: config.showItemCount !== false, itemCountCorner: config.itemCountCorner || 'top-right', itemNamePosition: config.itemNamePosition || 'top', itemNameBgOpacity: config.itemNameBgOpacity ?? 0.6, itemImageScale: config.itemImageScale ?? 100, footerCustomText: config.footerCustomText || '', watermarkEnabled: config.watermarkEnabled !== false, watermarkText:
            config.watermarkText ||
            'Powered by koishi-plugin-cs-lookup-vincentzyu-fork', watermarkFontSize: config.watermarkFontSize ?? 16, watermarkAngle: config.watermarkAngle ?? 45, watermarkOpacity: config.watermarkOpacity ?? 0.6, watermarkRowGap: config.watermarkRowGap ?? 60, watermarkColGap: config.watermarkColGap ?? 80, });
        logTiming('Pptr设置页面内容');
        logTiming('Pptr等待图片加载');
        const invImageBase64 = await renderCsInvImage(ctx, {
          html, imageType: config.imageType || 'jpeg', imageQuality: config.imageQuality || 60, waitUntil: config.waitUntil || 'domcontentloaded', viewportWidth: 1500, viewportHeight: pageHeight, logLevel: config.logLevel, });
        logTiming('Pptr截图完成');
        const replyPrefixResult = config.replyToUser
          ? h.quote(session.messageId)
          : '';

        const totalTime = Date.now() - startTime;
        let msg = `${replyPrefixResult}${h.image(invImageBase64)} ✅ 查询结果 ↑ \n \t🔎使用传入的艾特、userid、steamid可以查询别人的哦~`;

        if (config.puppeteerShowRenderInfo) {
          msg += `\n(🖼️ 渲染耗时：${totalTime}ms | 类型：${config.imageType} | 质量：${config.imageQuality})`;
        }

        await session.send(msg);
        logTiming('图片发送完成');

        await replyWithMarkdownKeyboard(
          session, ctx, config, '', '', `# CS2 库存查询结果 ✨\n\n> Steam ID: ${STEAMID}\n> 用户名: ${playerPersonName}`);

        if (timingEnabled) {
          logInfo(ctx, config, 'debug', 'src/commands/cs-inv.ts', '⏳ 📊 ⏱️ ========== 时间统计汇总 ==========');
          for (const [label, time] of Object.entries(timing)) {
            logInfo(ctx, config, 'debug', 'src/commands/cs-inv.ts', `⏱️   ${label}:\t${time}ms`);
          }
          logInfo(ctx, config, 'debug', 'src/commands/cs-inv.ts', `⏳ ⏱️   总耗时: ${totalTime}ms`);
          logInfo(ctx, config, 'debug', 'src/commands/cs-inv.ts', '⏱️ ====================================');
        }
      } catch (e) {
        logInfo(ctx, config, 'error', 'src/commands/cs-inv.ts', `⚡ ❌ 💥 发生错误: ${e.stack || e}`);
        let cardHtml = '';

        let errorMessage = '发生未知错误';
        if (e.response && e.response.data && e.response.data.detail) {
          const detail = e.response.data.detail;
          if (detail.includes('Unauthorized')) {
            errorMessage = `\n\t获取CS2库存失败，可能是对方未公开库存。`;
          }
        }
        errorMessage += ` err = ${e.message || e}`;

        cardHtml = `
            <div class="empty-message">
                ❌ ${errorMessage}
            </div>
        `;

        let playerPersonName = '未知用户';
        let proxiedPlayerAvatarFullUrl = '';
        let playerLastLogoffTimeStr = '未知';

        try {
          const playerInfo = await fetchPlayerInfo();
          const playerAvatarFullUrl = playerInfo.avatarfull;
          proxiedPlayerAvatarFullUrl = await getImageBase64(
            ctx, axiosWithProxy, playerAvatarFullUrl, config.logLevel);
          playerPersonName = playerInfo.personaname;
          if (playerInfo.lastlogoff) {
            playerLastLogoffTimeStr = new Date(
              playerInfo.lastlogoff * 1000, ).toLocaleString();
          }
        } catch (err) {
          logInfo(ctx, config, 'warn', 'src/commands/cs-inv.ts', `⚠️ 🖼️ 渲染错误页面时获取用户信息失败: ${err.message}`);
        }

        const fontConfig = buildCustomFontConfig(ctx, config.customFontPath);
        const invHtml = generateHtml({
          cardHTML: cardHtml, gridColumns: 1, totalStr: '总物品数: ??', steamId: STEAMID, steamName: playerPersonName, playerAvatarUrl: proxiedPlayerAvatarFullUrl, playerLastLogoffTimeStr, darkMode: config.enableDarkTheme, enableAvatarBackground: config.enableAvatarBackground, fontConfig, showItemCount: false, itemNamePosition: config.itemNamePosition || 'top', itemNameBgOpacity: config.itemNameBgOpacity ?? 0.6, itemImageScale: config.itemImageScale ?? 100, footerCustomText: config.footerCustomText || '', watermarkEnabled: config.watermarkEnabled !== false, watermarkText:
            config.watermarkText ||
            'Powered by koishi-plugin-cs-lookup-vincentzyu-fork', watermarkFontSize: config.watermarkFontSize ?? 16, watermarkAngle: config.watermarkAngle ?? 45, watermarkOpacity: config.watermarkOpacity ?? 0.6, watermarkRowGap: config.watermarkRowGap ?? 60, watermarkColGap: config.watermarkColGap ?? 80, });
        const invImageBase64 = await renderCsInvImage(ctx, {
          html: invHtml, imageType: config.imageType || 'jpeg', imageQuality: config.imageQuality || 60, waitUntil: config.waitUntil || 'domcontentloaded', viewportWidth: 1666, viewportHeight: 500, logLevel: 'silent', });
        const replyPrefixErr = config.replyToUser
          ? h.quote(session.messageId)
          : '';
        await session.send(
          `${replyPrefixErr}❌ 查询结果:${h.image(invImageBase64)}`);
      } finally {
        try {
          await session.bot.deleteMessage(session.guildId, String(waitMsgId));
        } catch (err) {
          logInfo(ctx, config, 'info', 'src/commands/cs-inv.ts', `⚠️ 🗑️ 消息撤回失败，有可能是过太久了导致qq无法撤回。 err: ${err}`);
        }
      }
    });
}
