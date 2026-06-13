import { Context, h } from 'koishi';
import { umami } from '../index';
import { createAxiosInstance, requestWithRetry } from '../proxy';
import { LOG_LEVELS } from '../types';
import { } from 'koishi-plugin-puppeteer';
import { } from 'koishi-plugin-umami-statistics-service';
import * as fs from 'fs';
import * as path from 'path';
import { buildCustomFontConfig, generateHtml, renderCsInvImage } from '../template/pptr-render-cs-inv';

export function isOnlyDigits(str: string): boolean {
  return /^\d+$/.test(str);
}

export const light = ['#81a1c1', '#2e3440', '#5e81ac']; // Changed font color to a dark gray
export const dark = ['#2e3440', '#ffffff', '#434c5e'];

// 缓存目录路径
const CACHE_DIR = path.join(__dirname, '..', '..', 'cache', 'inv_image');
const INV_DATA_DIR = path.join(__dirname, '..', '..', 'cache', 'inv_data');

/**
 * 确保缓存目录存在
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * 根据 classid 和 instanceid 生成缓存文件路径
 */
function getCacheFilePath(classid: string, instanceid: string): string {
  return path.join(CACHE_DIR, `item_class_${classid}_instance_${instanceid}.b64`);
}

/**
 * 从缓存读取 Base64 图片
 */
function readFromCache(classid: string, instanceid: string): string | null {
  const filePath = getCacheFilePath(classid, instanceid);
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
function writeToCache(classid: string, instanceid: string, base64Data: string): void {
  try {
    const filePath = getCacheFilePath(classid, instanceid);
    fs.writeFileSync(filePath, base64Data, 'utf-8');
  } catch (e) {
    // 写入失败静默忽略
  }
}

/**
 * 确保 inv_data 目录存在
 */
function ensureInvDataDir(): void {
  if (!fs.existsSync(INV_DATA_DIR)) {
    fs.mkdirSync(INV_DATA_DIR, { recursive: true });
  }
}

/**
 * 将 invData 写入文件
 */
function writeInvDataToFile(data: any): void {
  ensureInvDataDir();
  const filePath = path.join(INV_DATA_DIR, 'res.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取图片的 Base64 编码
 */
async function getImageBase64(ctx: Context, axiosInstance: any, url: string): Promise<string> {
  if (!url) return '';
  try {
    const response = await requestWithRetry(
      () => axiosInstance.get(url, { responseType: 'arraybuffer' }),
      { label: `getImageBase64(${url})`, ctx }
    ) as any;
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    ctx.logger.warn(`[src/commands/cs-inv.ts] [warn] ❌ 🖼️ 转换图片为Base64失败: ${url}, error: ${e.message}`);
    return url;
  }
}

/**
 * 获取饰品图片的 Base64 编码（带缓存）
 * @returns { base64: string, fromCache: boolean }
 */
async function getItemImageBase64(
  ctx: Context,
  axiosInstance: any,
  iconUrl: string,
  classid: string,
  instanceid: string,
  enableCache: boolean,
  logLevel: string
): Promise<{ base64: string; fromCache: boolean }> {
  const imageUrl = 'https://community.cloudflare.steamstatic.com/economy/image/' + iconUrl;
  
  if (enableCache) {
    const cached = readFromCache(classid, instanceid);
    if (cached) {
      if (LOG_LEVELS[logLevel] >= LOG_LEVELS.debug) {
        ctx.logger.info(`[src/commands/cs-inv.ts] [debug] 📦 缓存命中: class_${classid}_instance_${instanceid}`);
      }
      return { base64: cached, fromCache: true };
    }
  }
  
  const base64Data = await getImageBase64(ctx, axiosInstance, imageUrl);
  
  if (enableCache && base64Data.startsWith('data:')) {
    writeToCache(classid, instanceid, base64Data);
  }
  
  return { base64: base64Data, fromCache: false };
}

export function inv(ctx: Context, config: any) {
  const axiosWithProxy = createAxiosInstance(config, ctx);

  const umamiD = umami;
  ctx.command(
      `${config.csInvCommandName} [targetUser:text]`, 
      '🎒 查看 CS2/CS:GO 背包 🖼️ 生成库存截图', 
      { authority: 0 }
    )
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
          ctx.logger.info(`[src/commands/cs-inv.ts] [debug] ⏱️ ${label}: ${elapsed}ms`);
        }
      };

      if (options.refresh && options.noRefresh) {
        return '❌ --refresh 和 --no-refresh 不能同时使用';
      }
      const useCache = options.noRefresh ? true : options.refresh ? false : config.enableInvDbCache;

      if (config.data_collect) {
        ctx.umamiStatisticsService.send({
          dataHostUrl: umamiD[1],
          website: umamiD[0],
          url: '/cs-inv',
          urlSearchParams: {
            args: session.argv.args?.join(', '),
            ...(session.argv.options || {}),
          },
        });
      }

      const PLATFORM = session.platform;
      let USERID = session.userId;
      let STEAMID;

      if (targetUser) {
        const userIdRegex = /<at id="([^"]+)"(?: name="([^"]+)")?\/>/;
        const match = targetUser.match(userIdRegex);
        if (match) {
          USERID = match[1];
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] 👤 @ 解析到艾特用户: ${USERID}`);
        } else {
          USERID = targetUser.trim();
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] 👤 使用 userid: ${USERID}`);
        }
      }

      if (options.steamid) {
        STEAMID = options.steamid;
        ctx.logger.info(`[src/commands/cs-inv.ts] [info] 🔍 -s 指定的 steamid: ${STEAMID}`);
      } else {
        const res = await ctx.database.get('cs_lookup_vincentzyu_fork', { userid: USERID, platform: PLATFORM });
        if (res.length) {
          STEAMID = res[0].steamId;
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] 🗄️ ✅ 从数据库查询到 steamid: ${STEAMID}`);
        } else {
          const replyPrefixNoSteamId = config.replyToUser ? h.quote(session.messageId) : '';
          return `${replyPrefixNoSteamId}⚠️ 请提供 steamID 或者使用 \`${config.getidCommandName}\` 命令获取或者使用 \`${config.csBindCommandName} <steamID>\` 进行绑定\n(查询的用户: ${USERID})`;
        }
      }

      ctx.logger.info(`[src/commands/cs-inv.ts] [info] 🔍 👤 STEAMID = ${STEAMID}, USERID = ${USERID}`);
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';
      const waitMsgId = await session.send(`${replyPrefix}🔄 正在获取 Steam 库存 🖼️ 渲染图片中..... \n\t 🔍 查询 SteamId = ${STEAMID}\n 💡 提示: --refresh 刷新缓存 · --no-refresh 使用缓存 💾`);

      if (!isOnlyDigits(STEAMID)) {
        return `${replyPrefix}❌ 无效steamID, 若不知道steamID请使用指令 \`${config.getidCommandName} Steam个人资料页链接\` 获取`;
      }

      const steamWebApiUrl = `https://www.steamwebapi.com/steam/api/profile?key=${config.steamWebApiKey}&steam_id=${STEAMID}`;
      const officialApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.officialSteamApiKey}&steamids=${STEAMID}`;
      const invUrl = `https://steamcommunity.com/inventory/${STEAMID}/730/2?l=schinese`;
      
      const currentColorArr = config.enableDarkTheme ? dark : light;
      void currentColorArr;

      async function fetchFromOfficialApi(): Promise<{ avatarfull: string; personaname: string; lastlogoff?: number } | null> {
        if (!config.officialSteamApiKey) return null;
        try {
          const officialRes = await requestWithRetry(
            () => axiosWithProxy.get(officialApiUrl),
            { label: 'Steam官方API', ctx }
          );
          const players = officialRes?.data?.response?.players;
          if (players && players.length > 0) {
            const player = players[0];
            return {
              avatarfull: player.avatarfull || '',
              personaname: player.personaname || '未知用户',
              lastlogoff: player.lastlogoff,
            };
          }
        } catch (e) {
          ctx.logger.warn(`[src/commands/cs-inv.ts] [warn] ❌ 🎮 官方 Steam API 请求失败: ${e.message}`);
        }
        return null;
      }

      async function fetchFromSteamWebApi(): Promise<{ avatarfull: string; personaname: string; lastlogoff?: number } | null> {
        if (!config.steamWebApiKey) return null;
        try {
          const userRes = await requestWithRetry(
            () => axiosWithProxy.get(steamWebApiUrl),
            { label: 'steamwebapi.com', ctx }
          );
          const playerData = userRes?.data;
          return {
            avatarfull: playerData?.avatarfull || playerData?.player?.avatarfull || '',
            personaname: playerData?.personaname || playerData?.player?.personaname || '未知用户',
            lastlogoff: playerData?.lastlogoff || playerData?.player?.lastlogoff,
          };
        } catch (e) {
          const status = e.response?.status;
          if (status === 402) {
            ctx.logger.warn(`[src/commands/cs-inv.ts] [warn] ⚠️ 💸 steamwebapi.com 配额已用尽 (402)`);
          } else {
            ctx.logger.warn(`[src/commands/cs-inv.ts] [warn] ❌ 🌐 steamwebapi.com 请求失败 (${status || e.message})`);
          }
        }
        return null;
      }

      async function fetchPlayerInfo(): Promise<{ avatarfull: string; personaname: string; lastlogoff?: number }> {
        const preferOfficial = config.preferOfficialSteamApi !== false;
        
        if (preferOfficial) {
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] 🎮 优先使用官方 Steam API...`);
          let result = await fetchFromOfficialApi();
          if (result) return result;
          
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] ⚠️ 🔀 官方 API 失败，回退到 steamwebapi.com...`);
          result = await fetchFromSteamWebApi();
          if (result) return result;
        } else {
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] 🌐 优先使用 steamwebapi.com...`);
          let result = await fetchFromSteamWebApi();
          if (result) return result;
          
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] ⚠️ 🔀 steamwebapi.com 失败，回退到官方 Steam API...`);
          result = await fetchFromOfficialApi();
          if (result) return result;
        }

        if (!config.steamWebApiKey && !config.officialSteamApiKey) {
          throw new Error('未配置任何 Steam API Key，请在插件设置中至少填写一个 Key。\n• officialSteamApiKey: 官方免费 (steamcommunity.com/dev/apikey)\n• steamWebApiKey: 付费 (steamwebapi.com)');
        }
        throw new Error('所有 Steam API 请求都失败，可能是网络问题或配额用尽。');
      }

      try {
        const playerInfo = await fetchPlayerInfo();
        logTiming('获取玩家信息');
        
        const playerAvatarFullUrl = playerInfo.avatarfull;
        const proxiedPlayerAvatarFullUrl = await getImageBase64(ctx, axiosWithProxy, playerAvatarFullUrl);
        logTiming('转换头像为Base64');
        
        ctx.logger.info(`[src/commands/cs-inv.ts] [info] 🖼️ playerAvatarFullUrl = ${playerAvatarFullUrl}`);
        const playerPersonName = playerInfo.personaname;
        const playerLastLogoff = playerInfo.lastlogoff;
        const playerLastLogoffTimeStr = playerLastLogoff ? (new Date(playerLastLogoff * 1000)).toLocaleString() : '未知';

        let invData: any;
        let usedCache = false;
        if (useCache) {
          const cached = await ctx.database.get('cs_inv_cache_vincentzyu_fork', { steamid: STEAMID });
          if (cached.length) {
            invData = JSON.parse(cached[0].inv_json);
            usedCache = true;
            ctx.logger.info(`[src/commands/cs-inv.ts] [info] 💾 ✅ 使用数据库缓存库存数据: ${STEAMID}`);
          }
        }
        if (!usedCache) {
          const invRes = await requestWithRetry(
            () => axiosWithProxy.get(invUrl),
            { label: 'Steam库存数据', ctx }
          );
          invData = invRes.data;
          if (useCache || options.refresh) {
            await ctx.database.upsert('cs_inv_cache_vincentzyu_fork', [{ steamid: STEAMID, inv_json: JSON.stringify(invData), cached_at: Date.now() }]);
          }
        }
        logTiming('获取库存数据');

        ctx.logger.info(`[src/commands/cs-inv.ts] [debug] 📦 invData的前1000个字符： ${JSON.stringify(invData).slice(0, 1000)}.....`);

        if (config.verboseFileLog) {
          try {
            writeInvDataToFile(invData);
            ctx.logger.info(`[src/commands/cs-inv.ts] [debug] 📝 已将库存数据写入: ${path.join(INV_DATA_DIR, 'res.json')}`);
          } catch (e) {
            ctx.logger.warn(`[src/commands/cs-inv.ts] [warn] ❌ 📁 写入库存数据文件失败: ${e.message}`);
          }
        }

        let cardHtml = ``;
        let gridColumns = config.gridColumns || 4;
        let totalStr = '';
        let pageHeight = 500;

        if (!invData.descriptions || invData.descriptions.length === 0) {
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] 📭 invData没有descriptions字段。`);
          gridColumns = 1;
          totalStr = `总物品数: 0`;
          cardHtml = `
            <div class="empty-message">📦 该用户没有CS2库存</div>
          `;
          pageHeight = 400;
        } else {
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] 📋 ✅ invData有descriptions字段。`);
          
          if (config.enableImageCache !== false) {
            ensureCacheDir();
          }
          
          const itemMap = new Map<string, { count: number, imageUrl: string }>();
          let cacheHitCount = 0;
          let cacheMissCount = 0;
          
          for (const item of invData.descriptions) {
            const itemName = item.market_name;
            const classid = item.classid || '';
            const instanceid = item.instanceid || '0';
            
            if (!itemMap.has(itemName)) {
              const result = await getItemImageBase64(
                ctx,
                axiosWithProxy,
                item.icon_url,
                classid,
                instanceid,
                config.enableImageCache !== false,
                config.logLevel
              );
              
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
            ctx.logger.info(`[src/commands/cs-inv.ts] [debug] 📊 缓存统计: 命中 ${cacheHitCount}, 未命中 ${cacheMissCount}`);
          }
          logTiming('转换饰品图片为Base64');

          for (const [itemName, itemInfo] of itemMap.entries()) {
            const countBadge = itemInfo.count > 1 ? `<span class="item-count">x${itemInfo.count}</span>` : '';
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
          cardHTML: cardHtml,
          gridColumns,
          totalStr,
          steamId: STEAMID,
          steamName: playerPersonName,
          playerAvatarUrl: proxiedPlayerAvatarFullUrl,
          playerLastLogoffTimeStr,
          darkMode: config.enableDarkTheme,
          enableAvatarBackground: config.enableAvatarBackground,
          fontConfig,
          showItemCount: config.showItemCount !== false,
          itemCountCorner: config.itemCountCorner || 'top-right',
          itemNamePosition: config.itemNamePosition || 'top',
          itemNameBgOpacity: config.itemNameBgOpacity ?? 0.6,
          itemImageScale: config.itemImageScale ?? 100,
          footerCustomText: config.footerCustomText || '',
          watermarkEnabled: config.watermarkEnabled !== false,
          watermarkText: config.watermarkText || 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork',
          watermarkFontSize: config.watermarkFontSize ?? 16,
          watermarkAngle: config.watermarkAngle ?? 45,
          watermarkOpacity: config.watermarkOpacity ?? 0.6,
          watermarkRowGap: config.watermarkRowGap ?? 60,
          watermarkColGap: config.watermarkColGap ?? 80,
        });
        logTiming('Pptr设置页面内容');
        logTiming('Pptr等待图片加载');
        const invImageBase64 = await renderCsInvImage(ctx, {
          html,
          imageType: config.imageType || 'jpeg',
          imageQuality: config.imageQuality || 60,
          waitUntil: config.waitUntil || 'domcontentloaded',
          viewportWidth: 1500,
          viewportHeight: pageHeight,
          logLevel: config.logLevel,
        });
        logTiming('Pptr截图完成');
        const replyPrefixResult = config.replyToUser ? h.quote(session.messageId) : '';
        await session.send(`${replyPrefixResult}✅ 查询结果:${h.image(invImageBase64)}`);
        logTiming('图片发送完成');
        
        if (timingEnabled) {
          const totalTime = Date.now() - startTime;
          ctx.logger.info(`[src/commands/cs-inv.ts] [debug] ⏱️ ========== 时间统计汇总 ==========`);
          for (const [label, time] of Object.entries(timing)) {
            ctx.logger.info(`[src/commands/cs-inv.ts] [debug] ⏱️   ${label}:\t${time}ms`);
          }
          ctx.logger.info(`[src/commands/cs-inv.ts] [debug] ⏱️   总耗时: ${totalTime}ms`);
          ctx.logger.info(`[src/commands/cs-inv.ts] [debug] ⏱️ ====================================`);
        }

      } catch (e) {
        ctx.logger.error(`[src/commands/cs-inv.ts] [error] ❌ 💥 发生错误: ${e.stack || e}`);
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
          proxiedPlayerAvatarFullUrl = await getImageBase64(ctx, axiosWithProxy, playerAvatarFullUrl);
          playerPersonName = playerInfo.personaname;
          if (playerInfo.lastlogoff) {
            playerLastLogoffTimeStr = (new Date(playerInfo.lastlogoff * 1000)).toLocaleString();
          }
        } catch (err) {
          ctx.logger.warn(`[src/commands/cs-inv.ts] [warn] ⚠️ 🖼️ 渲染错误页面时获取用户信息失败: ${err.message}`);
        }

        const fontConfig = buildCustomFontConfig(ctx, config.customFontPath);
        const invHtml = generateHtml({
          cardHTML: cardHtml,
          gridColumns: 1,
          totalStr: '总物品数: ??',
          steamId: STEAMID,
          steamName: playerPersonName,
          playerAvatarUrl: proxiedPlayerAvatarFullUrl,
          playerLastLogoffTimeStr,
          darkMode: config.enableDarkTheme,
          enableAvatarBackground: config.enableAvatarBackground,
          fontConfig,
          showItemCount: false,
          itemNamePosition: config.itemNamePosition || 'top',
          itemNameBgOpacity: config.itemNameBgOpacity ?? 0.6,
          itemImageScale: config.itemImageScale ?? 100,
          footerCustomText: config.footerCustomText || '',
          watermarkEnabled: config.watermarkEnabled !== false,
          watermarkText: config.watermarkText || 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork',
          watermarkFontSize: config.watermarkFontSize ?? 16,
          watermarkAngle: config.watermarkAngle ?? 45,
          watermarkOpacity: config.watermarkOpacity ?? 0.6,
          watermarkRowGap: config.watermarkRowGap ?? 60,
          watermarkColGap: config.watermarkColGap ?? 80,
        });
        const invImageBase64 = await renderCsInvImage(ctx, {
          html: invHtml,
          imageType: config.imageType || 'jpeg',
          imageQuality: config.imageQuality || 60,
          waitUntil: config.waitUntil || 'domcontentloaded',
          viewportWidth: 1666,
          viewportHeight: 500,
          logLevel: 'silent',
        });
        const replyPrefixErr = config.replyToUser ? h.quote(session.messageId) : '';
        await session.send(`${replyPrefixErr}❌ 查询结果:${h.image(invImageBase64)}`);
        
      } finally {
        try {
          await session.bot.deleteMessage(session.guildId, String(waitMsgId));
        } catch (err) {
          ctx.logger.info(`[src/commands/cs-inv.ts] [info] ⚠️ 🗑️ 消息撤回失败，有可能是过太久了导致qq无法撤回。 err: ${err}`);
        }
      }

    });
}
